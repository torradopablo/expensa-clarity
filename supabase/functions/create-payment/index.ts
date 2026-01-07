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
    const { analysisId } = await req.json();

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

    // In a real implementation, you would:
    // 1. Create a Mercado Pago preference
    // 2. Return the checkout URL
    // For now, we'll simulate a successful payment setup

    // Simulated Mercado Pago preference creation
    // In production, you'd use the Mercado Pago SDK:
    // const mercadopago = require('mercadopago');
    // mercadopago.configure({ access_token: Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') });
    
    const preference = {
      items: [
        {
          title: "Análisis de Expensa - ExpensaCheck",
          quantity: 1,
          unit_price: 500,
          currency_id: "ARS",
        },
      ],
      back_urls: {
        success: `${req.headers.get("origin")}/analisis/${analysisId}`,
        failure: `${req.headers.get("origin")}/analizar?error=payment_failed`,
        pending: `${req.headers.get("origin")}/analizar?status=pending`,
      },
      auto_return: "approved",
      external_reference: analysisId,
    };

    // For demo purposes, we'll simulate a successful payment immediately
    // In production, this would redirect to Mercado Pago
    const { error: updateError } = await supabase
      .from("expense_analyses")
      .update({ status: "paid" })
      .eq("id", analysisId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Error al actualizar el estado del pago");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Pago procesado correctamente",
        // In production: checkout_url: preference.init_point
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
