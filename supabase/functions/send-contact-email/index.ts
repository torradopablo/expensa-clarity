import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// IMPORTANT: Update this to your actual email address
const CONTACT_EMAIL = Deno.env.get("CONTACT_EMAIL") || "soporte@expensacheck.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
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
    const { name, email, subject, message }: ContactEmailRequest = await req.json();

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

    const subjectLabel = subjectLabels[subject] || subject;
    const timestamp = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });

    const adminEmailResponse = await resend.emails.send({
      from: "ExpensaCheck <onboarding@resend.dev>",
      to: [CONTACT_EMAIL],
      reply_to: email,
      subject: `[ExpensaCheck] ${subjectLabel} - ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Nuevo mensaje de contacto</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Nombre:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td>
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
            <p style="white-space: pre-wrap; color: #555;">${message}</p>
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
          <h2 style="color: #333;">¡Hola ${name}!</h2>
          <p>Gracias por contactarnos. Hemos recibido tu mensaje y te responderemos a la brevedad.</p>
          <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #333;">Resumen de tu mensaje:</h3>
            <p><strong>Asunto:</strong> ${subjectLabel}</p>
            <p style="white-space: pre-wrap; color: #555;">${message}</p>
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
