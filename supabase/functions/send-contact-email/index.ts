import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// IMPORTANT: Update this to your actual email address
const CONTACT_EMAIL = Deno.env.get("CONTACT_EMAIL") || "soporte@expensacheck.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== RATE LIMITING ==========
// In-memory rate limiting (resets on function restart)
// For production, consider using Redis or a database
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5; // Max requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const MAX_RATE_LIMIT_ENTRIES = 10000; // Prevent memory exhaustion

function getRateLimitKey(req: Request): string {
  // Use X-Forwarded-For for clients behind proxies, fallback to a default
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return ip;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  // Clean up old entries periodically
  if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetTime < now) {
        rateLimitMap.delete(k);
      }
    }
  }

  if (!entry || entry.resetTime < now) {
    // New window
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count++;
  return false;
}
// ========== END RATE LIMITING ==========

// ========== HTML ESCAPING ==========
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
// ========== END HTML ESCAPING ==========

interface ContactEmailRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
  honeypot?: string; // Hidden field to catch bots
}

const subjectLabels: Record<string, string> = {
  consulta: "Consulta general",
  soporte: "Soporte técnico",
  sugerencia: "Sugerencia",
  reclamo: "Reclamo",
  datos_personales: "Solicitud sobre datos personales",
  otro: "Otro",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting check
    const rateLimitKey = getRateLimitKey(req);
    if (isRateLimited(rateLimitKey)) {
      console.warn("Rate limit exceeded for:", rateLimitKey);
      return new Response(
        JSON.stringify({ error: "Demasiadas solicitudes. Por favor, esperá unos minutos antes de intentar de nuevo." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { name, email, subject, message, honeypot }: ContactEmailRequest = await req.json();

    // Honeypot check - if filled, it's likely a bot
    if (honeypot) {
      console.warn("Honeypot triggered, likely bot submission");
      // Return success to not reveal detection to bot
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate input
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Todos los campos son obligatorios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Email inválido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate lengths
    if (name.length > 100 || email.length > 255 || message.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Datos exceden el límite permitido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate subject is from allowed list
    const allowedSubjects = Object.keys(subjectLabels);
    if (!allowedSubjects.includes(subject)) {
      return new Response(
        JSON.stringify({ error: "Asunto inválido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const subjectLabel = subjectLabels[subject] || subject;
    const timestamp = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });

    // Escape all user inputs for HTML
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message);

    const adminEmailResponse = await resend.emails.send({
      from: "ExpensaCheck <onboarding@resend.dev>",
      to: [CONTACT_EMAIL],
      reply_to: email,
      subject: `[ExpensaCheck] ${subjectLabel} - ${safeName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Nuevo mensaje de contacto</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Nombre:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Asunto:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${subjectLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Fecha:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${timestamp}</td>
            </tr>
          </table>
          <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #333;">Mensaje:</h3>
            <p style="white-space: pre-wrap; color: #555;">${safeMessage}</p>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #999;">
            Podés responder directamente a este email para contactar al usuario.
          </p>
        </div>
      `,
    });

    // Send confirmation email to user
    await resend.emails.send({
      from: "ExpensaCheck <onboarding@resend.dev>",
      to: [email],
      subject: "Recibimos tu mensaje - ExpensaCheck",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">¡Hola ${safeName}!</h2>
          <p>Gracias por contactarnos. Hemos recibido tu mensaje y te responderemos a la brevedad.</p>
          <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #333;">Resumen de tu mensaje:</h3>
            <p><strong>Asunto:</strong> ${subjectLabel}</p>
            <p style="white-space: pre-wrap; color: #555;">${safeMessage}</p>
          </div>
          <p>Saludos,<br>El equipo de ExpensaCheck</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #999;">
            Este es un mensaje automático. Por favor no respondas a este email.
          </p>
        </div>
      `,
    });

    console.log("Contact emails sent successfully:", adminEmailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: "Error al enviar el mensaje. Por favor, intentá de nuevo." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);