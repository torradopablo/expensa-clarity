import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SharedAnalysisCacheService } from "../_shared/services/cache/SharedAnalysisCacheService.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action } = await req.json()
    const cacheService = new SharedAnalysisCacheService()

    switch (action) {
      case 'cleanup':
        await cacheService.cleanupExpiredCache()
        return new Response(
          JSON.stringify({ message: 'Cache cleanup completed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'stats':
        const stats = await cacheService.getCacheStats()
        return new Response(
          JSON.stringify({ data: stats }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Error in cache-maintenance:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
