import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { corsHeaders } from "../_shared/config/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// IMPORTANT: The email that will receive the contact notifications
const CONTACT_EMAIL = Deno.env.get("CONTACT_EMAIL") || "soporte@expensacheck.com";

// ========== RATE LIMITING ==========
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function getRateLimitKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return ip;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetTime < now) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

interface ContactEmailRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
  honeypot?: string;
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rateLimitKey = getRateLimitKey(req);
    if (isRateLimited(rateLimitKey)) {
      return new Response(
        JSON.stringify({ error: "Demasiadas solicitudes. Intentá más tarde." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { name, email, subject, message, honeypot }: ContactEmailRequest = await req.json();

    if (honeypot) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Datos incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subjectLabel = subjectLabels[subject] || subject;
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message);

    console.log(`Contact request from ${safeEmail}`);

    if (!Deno.env.get("RESEND_API_KEY")) {
      throw new Error("RESEND_API_KEY_MISSING");
    }

    // 1. Send notification to admin (Crucial)
    // We use onboarding@resend.dev which works for trial accounts
    // but ONLY if the TO address is the verified account email.
    const adminResponse = await resend.emails.send({
      from: "ExpensaCheck <onboarding@resend.dev>",
      to: [CONTACT_EMAIL],
      reply_to: email,
      subject: `[Contacto] ${subjectLabel} - ${safeName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Nuevo mensaje de contacto</h2>
          <p><strong>De:</strong> ${safeName} (${safeEmail})</p>
          <p><strong>Asunto:</strong> ${subjectLabel}</p>
          <hr/>
          <p style="white-space: pre-wrap;">${safeMessage}</p>
        </div>
      `,
    });

    if (adminResponse.error) {
      console.error("Admin email failed:", adminResponse.error);
      // Detailed error for the user to see in the toast
      const errorMsg = adminResponse.error.message;
      let userDetails = errorMsg;
      if (errorMsg.includes("verify your domain")) {
        userDetails = "Resend requiere verificar el dominio o el destinatario (Trial mode).";
      }
      throw new Error(`ADMIN_DELIVERY_FAILED: ${userDetails}`);
    }

    // 2. Send confirmation to user (Optional/Supportive)
    // This will LIKELY FAIL in Trial mode if 'email' is not verified.
    // We don't want to fail the whole request because of this.
    try {
      const userResponse = await resend.emails.send({
        from: "ExpensaCheck <onboarding@resend.dev>",
        to: [email],
        subject: "Recibimos tu mensaje - ExpensaCheck",
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h3>¡Hola ${safeName}!</h3>
            <p>Gracias por contactarnos. Te responderemos a la brevedad.</p>
          </div>
        `,
      });
      if (userResponse.error) {
        console.warn("User confirmation failed (expected in trial mode):", userResponse.error);
      }
    } catch (confError) {
      console.warn("User confirmation exception:", confError);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        error: "Error en el servicio de contacto",
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);