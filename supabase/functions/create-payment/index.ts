import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysisId, successUrl, failureUrl } = await req.json();

    if (!analysisId) {
      return new Response(
        JSON.stringify({ error: "Se requiere analysisId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const userEmail = user.email;

    // Verify the analysis belongs to the user
    const { data: analysis, error: analysisError } = await supabase
      .from("expense_analyses")
      .select("*")
      .eq("id", analysisId)
      .eq("user_id", userId)
      .single();

    if (analysisError || !analysis) {
      return new Response(
        JSON.stringify({ error: "Análisis no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Mercado Pago Access Token
    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    if (!MERCADOPAGO_ACCESS_TOKEN) {
      console.error("[create-payment] CRITICAL: MERCADOPAGO_ACCESS_TOKEN is not set in Supabase secrets.");
      return new Response(
        JSON.stringify({
          error: "Configuración incompleta",
          details: "MERCADOPAGO_ACCESS_TOKEN no encontrado en el entorno."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (MERCADOPAGO_ACCESS_TOKEN.trim() === "") {
      console.error("[create-payment] CRITICAL: MERCADOPAGO_ACCESS_TOKEN is set but empty.");
      return new Response(
        JSON.stringify({
          error: "Configuración inválida",
          details: "MERCADOPAGO_ACCESS_TOKEN está vacío."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build absolute back URLs
    // Hierarchy: Origin header > SITE_URL secret > Fallback hardcoded
    const siteUrl = Deno.env.get("SITE_URL") || "https://expensa-check.vercel.app";
    const rawOrigin = req.headers.get("origin") || req.headers.get("Origin") || siteUrl;
    const origin = rawOrigin.replace(/\/$/, ""); // Ensure no trailing slash

    const finalSuccessUrl = `${origin}/analizar?payment=success&analysisId=${analysisId}`;
    const finalFailureUrl = `${origin}/analizar?payment=failure`;
    const finalPendingUrl = `${origin}/analizar?payment=pending&analysisId=${analysisId}`;

    // IMPORTANT: Mercado Pago requires HTTPS for auto_return: "approved".
    // If we're on localhost (http), we should disable auto_return to avoid 400 errors.
    const isHttps = origin.startsWith("https://");
    const autoReturn = isHttps ? "approved" : undefined;

    console.log(`[create-payment] Origin detected: ${origin}. Protocol: ${isHttps ? "HTTPS" : "HTTP"}. Auto-return: ${autoReturn || "disabled"}`);

    // Create Mercado Pago preference
    const preference = {
      items: [
        {
          id: analysisId,
          title: "Análisis de Expensa - ExpensaCheck",
          description: "Análisis completo de tu liquidación de expensas con detección de anomalías",
          quantity: 1,
          unit_price: 3500,
          currency_id: "ARS",
        },
      ],
      payer: {
        email: userEmail,
      },
      back_urls: {
        success: finalSuccessUrl,
        failure: finalFailureUrl,
        pending: finalPendingUrl,
      },
      auto_return: autoReturn,
      external_reference: analysisId,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
      statement_descriptor: "EXPENSACHECK",
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    console.log("[create-payment] Sending preference to MP:", JSON.stringify(preference, null, 2));

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error("Mercado Pago error:", mpResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Error al crear el pago en Mercado Pago" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mpData = await mpResponse.json();
    console.log("MP preference created:", mpData.id);

    // Create service role client for audit logging (bypass RLS)
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update analysis with payment preference ID
    const { error: updateError } = await supabase
      .from("expense_analyses")
      .update({
        payment_id: mpData.id,
        status: "pending_payment"
      })
      .eq("id", analysisId);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    // Record in payment_audits table
    const { error: auditError } = await supabaseService
      .from("payment_audits")
      .insert({
        analysis_id: analysisId,
        user_id: userId,
        preference_id: mpData.id,
        amount: 3500, // Matching the item price
        status: "pending",
        raw_response: mpData
      });

    if (auditError) {
      console.error("Audit logging error:", auditError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        preferenceId: mpData.id,
        initPoint: mpData.init_point, // Checkout URL
        sandboxInitPoint: mpData.sandbox_init_point, // Sandbox checkout URL
        analysisId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Create payment error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
