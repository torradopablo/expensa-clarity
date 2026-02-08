import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SharedAnalysisCacheService } from "../_shared/services/cache/SharedAnalysisCacheService.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface InvalidateCacheRequest {
  analysis_id: string;
}

serve(async (req) => {
  console.log('Cache invalidation request received')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { analysis_id }: InvalidateCacheRequest = await req.json()

    if (!analysis_id) {
      return new Response(
        JSON.stringify({ error: 'analysis_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Invalidating cache for analysis: ${analysis_id}`)

    // Invalidate cache for this analysis
    const cacheService = new SharedAnalysisCacheService();
    await cacheService.invalidateCache(analysis_id);

    console.log(`Cache invalidated successfully for analysis: ${analysis_id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cache invalidated successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in invalidate-share-cache:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
