import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First verify the shared link is valid
    const { data: linkData, error: linkError } = await supabase
      .from("shared_analysis_links")
      .select("analysis_id, is_active, expires_at, view_count")
      .eq("token", token)
      .maybeSingle();

    if (linkError) {
      console.error("Error fetching link:", linkError);
      return new Response(
        JSON.stringify({ error: "Error fetching shared link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!linkData) {
      return new Response(
        JSON.stringify({ error: "Link not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!linkData.is_active) {
      return new Response(
        JSON.stringify({ error: "Link is deactivated" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Link has expired" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update view count
    await supabase
      .from("shared_analysis_links")
      .update({ view_count: linkData.view_count + 1 })
      .eq("token", token);

    // Fetch the analysis
    const { data: analysisData, error: analysisError } = await supabase
      .from("expense_analyses")
      .select("id, building_name, period, unit, total_amount, previous_total, status, created_at")
      .eq("id", linkData.analysis_id)
      .single();

    if (analysisError) {
      console.error("Error fetching analysis:", analysisError);
      return new Response(
        JSON.stringify({ error: "Error fetching analysis" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("expense_categories")
      .select("id, name, icon, current_amount, previous_amount, status, explanation")
      .eq("analysis_id", linkData.analysis_id)
      .order("current_amount", { ascending: false });

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError);
      return new Response(
        JSON.stringify({ error: "Error fetching categories" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        analysis: analysisData,
        categories: categoriesData || []
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});