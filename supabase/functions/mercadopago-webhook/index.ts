import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Mercado Pago sends notifications as query params for IPN
    const url = new URL(req.url);
    const topic = url.searchParams.get("topic") || url.searchParams.get("type");
    const id = url.searchParams.get("id") || url.searchParams.get("data.id");

    // Also check body for webhook notifications
    let body: any = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        // Body might be empty for some webhook types
      }
    }

    const notificationType = topic || body.type || body.action;
    const resourceId = id || body.data?.id;

    console.log("Webhook received:", { notificationType, resourceId, body });

    // We only care about payment notifications
    if (!notificationType || !resourceId) {
      return new Response(
        JSON.stringify({ message: "Notification received but no action needed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Mercado Pago Access Token
    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      console.error("MERCADOPAGO_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for webhook processing
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle different notification types
    if (notificationType === "payment" || notificationType === "payment.created" || notificationType === "payment.updated") {
      // Fetch payment details from Mercado Pago
      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${resourceId}`,
        {
          headers: {
            Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          },
        }
      );

      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        console.error("Error fetching payment:", errorText);
        return new Response(
          JSON.stringify({ error: "Error fetching payment details" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const payment = await paymentResponse.json();
      console.log("Payment details:", {
        id: payment.id,
        status: payment.status,
        external_reference: payment.external_reference,
      });

      const analysisId = payment.external_reference;

      if (!analysisId) {
        console.log("No external_reference found in payment");
        return new Response(
          JSON.stringify({ message: "No analysis ID found" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Map Mercado Pago status to our status
      let newStatus: string;
      switch (payment.status) {
        case "approved":
          newStatus = "paid";
          break;
        case "pending":
        case "in_process":
          newStatus = "pending_payment";
          break;
        case "rejected":
        case "cancelled":
          newStatus = "payment_failed";
          break;
        default:
          newStatus = "pending_payment";
      }

      // Update analysis status
      const { error: updateError } = await supabase
        .from("expense_analyses")
        .update({
          status: newStatus,
          payment_id: payment.id.toString(),
        })
        .eq("id", analysisId);

      if (updateError) {
        console.error("Error updating analysis:", updateError);
        return new Response(
          JSON.stringify({ error: "Error updating analysis" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Analysis ${analysisId} updated to status: ${newStatus}`);

      return new Response(
        JSON.stringify({ success: true, status: newStatus }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For merchant_order notifications
    if (notificationType === "merchant_order") {
      const orderResponse = await fetch(
        `https://api.mercadopago.com/merchant_orders/${resourceId}`,
        {
          headers: {
            Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          },
        }
      );

      if (orderResponse.ok) {
        const order = await orderResponse.json();
        console.log("Merchant order:", order.id, "status:", order.status);
        
        // Check if order is fully paid
        if (order.status === "closed" && order.external_reference) {
          const { error } = await supabase
            .from("expense_analyses")
            .update({ status: "paid" })
            .eq("id", order.external_reference);

          if (error) {
            console.error("Error updating from merchant order:", error);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ message: "Webhook processed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
