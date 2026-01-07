import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

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
      console.error("MERCADOPAGO_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Mercado Pago no está configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Mercado Pago preference
    const preference = {
      items: [
        {
          id: analysisId,
          title: "Análisis de Expensa - ExpensaCheck",
          description: "Análisis completo de tu liquidación de expensas con detección de anomalías",
          quantity: 1,
          unit_price: 500,
          currency_id: "ARS",
        },
      ],
      payer: {
        email: userEmail,
      },
      back_urls: {
        success: successUrl || `${req.headers.get("origin")}/analizar?payment=success&analysisId=${analysisId}`,
        failure: failureUrl || `${req.headers.get("origin")}/analizar?payment=failure`,
        pending: `${req.headers.get("origin")}/analizar?payment=pending&analysisId=${analysisId}`,
      },
      auto_return: "approved",
      external_reference: analysisId,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
      statement_descriptor: "EXPENSACHECK",
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    console.log("Creating MP preference:", JSON.stringify(preference));

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
