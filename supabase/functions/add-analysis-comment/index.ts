import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SharedAnalysisCacheService } from "../_shared/services/cache/SharedAnalysisCacheService.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_COMMENTS_PER_HOUR = 3; // Reducido de 5 a 3
const MAX_COMMENTS_PER_DAY = 10; // Nuevo límite diario
const MAX_COMMENTS_PER_MONTH = 30; // Nuevo límite mensual

interface CommentRequest {
  token: string;
  author_name: string;
  author_email?: string;
  comment: string;
}

serve(async (req) => {
  console.log('Request received:', { method: req.method, url: req.url })
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, author_name, author_email, comment }: CommentRequest = await req.json()

    console.log('Received comment request:', { token, author_name, author_email, comment: comment?.substring(0, 50) + '...' })

    // Validaciones básicas
    if (!token || !author_name || !comment) {
      console.log('Validation error - missing fields:', { 
        hasToken: !!token, 
        hasAuthorName: !!author_name, 
        hasComment: !!comment 
      })
      return new Response(
        JSON.stringify({ error: 'Token, author_name, and comment are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (comment.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Comment too long (max 500 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (author_name.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Author name too long (max 100 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verificar que el token sea válido y obtener el análisis
    const { data: linkData, error: linkError } = await supabase
      .from('shared_analysis_links')
      .select('analysis_id, expires_at, is_active')
      .eq('token', token)
      .single()

    if (linkError || !linkData) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!linkData.is_active) {
      return new Response(
        JSON.stringify({ error: 'Link is deactivated' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Link has expired' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener información del análisis para validar restricción temporal
    const { data: analysis, error: analysisError } = await supabase
      .from('expense_analyses')
      .select('period, period_date')
      .eq('id', linkData.analysis_id)
      .single()

    if (analysisError || !analysis) {
      return new Response(
        JSON.stringify({ error: 'Analysis not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar restricción temporal: permitir comentarios dentro de una ventana razonable
    const analysisDate = analysis.period_date ? new Date(analysis.period_date) : parsePeriodToDate(analysis.period);
    const now = new Date();
    
    console.log('Date validation:', {
      analysisId: linkData.analysis_id,
      analysisPeriod: analysis.period,
      analysisPeriodDate: analysis.period_date,
      parsedAnalysisDate: analysisDate.toISOString(),
      currentDate: now.toISOString(),
      isSameMonth: isSameMonth(analysisDate, now)
    });
    
    // Permitir comentarios si:
    // 1. Es el mismo mes del análisis, O
    // 2. El análisis es de hasta 1 mes en el futuro (reducido de 2), O
    // 3. El análisis es de hasta 1 mes en el pasado (reducido de 3)
    const monthsDiff = (now.getFullYear() - analysisDate.getFullYear()) * 12 + 
                     (now.getMonth() - analysisDate.getMonth());
    
    console.log('Months difference:', monthsDiff);
    
    if (monthsDiff < -1 || monthsDiff > 1) {
      return new Response(
        JSON.stringify({ error: 'Comments are only allowed within 1 month of the analysis period' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting: máximo 5 comentarios por hora por IP
    // Extraer la primera IP válida de los headers (puede venir como lista separada por comas)
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    
    let clientIP = 'unknown';
    if (forwardedFor) {
      // x-forwarded-for puede tener múltiples IPs: "client, proxy1, proxy2"
      // Tomamos la primera (la del cliente original)
      clientIP = forwardedFor.split(',')[0].trim();
    } else if (realIP) {
      clientIP = realIP.trim();
    }
    
    console.log('Client IP for rate limiting:', { original: forwardedFor, real: realIP, parsed: clientIP });
    
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Rate limiting GLOBAL (no por IP) - previene ataques coordinados
    const { data: recentHourComments, error: hourError } = await supabase
      .from('analysis_comments')
      .select('id')
      .gte('created_at', oneHourAgo.toISOString());
    
    const { data: recentDayComments, error: dayError } = await supabase
      .from('analysis_comments')
      .select('id')
      .gte('created_at', oneDayAgo.toISOString());
    
    const { data: recentMonthComments, error: monthError } = await supabase
      .from('analysis_comments')
      .select('id')
      .gte('created_at', oneMonthAgo.toISOString());

    console.log('Global rate limiting check:', {
      hourCount: recentHourComments?.length || 0,
      dayCount: recentDayComments?.length || 0,
      monthCount: recentMonthComments?.length || 0
    });

    if (hourError || dayError || monthError) {
      console.error('Rate limiting check error:', { hourError, dayError, monthError });
    } else if (recentHourComments && recentHourComments.length >= MAX_COMMENTS_PER_HOUR) {
      return new Response(
        JSON.stringify({ error: `Global rate limit exceeded. Maximum ${MAX_COMMENTS_PER_HOUR} comments per hour for all users.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (recentDayComments && recentDayComments.length >= MAX_COMMENTS_PER_DAY) {
      return new Response(
        JSON.stringify({ error: `Global rate limit exceeded. Maximum ${MAX_COMMENTS_PER_DAY} comments per day for all users.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (recentMonthComments && recentMonthComments.length >= MAX_COMMENTS_PER_MONTH) {
      return new Response(
        JSON.stringify({ error: `Global rate limit exceeded. Maximum ${MAX_COMMENTS_PER_MONTH} comments per month for all users.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insertar el comentario
    const { data: newComment, error: insertError } = await supabase
      .from('analysis_comments')
      .insert({
        analysis_id: linkData.analysis_id,
        token: token,
        author_name: author_name.trim(),
        author_email: author_email?.trim() || null,
        comment: comment.trim(),
        ip_address: clientIP === 'unknown' ? null : clientIP,
        user_agent: req.headers.get('user-agent') || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting comment:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save comment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Invalidar caché del análisis para incluir nuevo comentario
    const cacheService = new SharedAnalysisCacheService();
    await cacheService.invalidateCache(linkData.analysis_id);

    console.log(`Comment added for analysis ${linkData.analysis_id} by ${author_name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        comment: newComment,
        message: 'Comment added successfully' 
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in add-analysis-comment:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Funciones helper
function parsePeriodToDate(period: string): Date {
  // Asumir formato "YYYY-MM" o "MM/YYYY" o similar
  const parts = period.split(/[-/]/);
  if (parts.length === 2) {
    const year = parseInt(parts[0].length === 4 ? parts[0] : parts[1]);
    const month = parseInt(parts[0].length === 4 ? parts[1] : parts[0]);
    return new Date(year, month - 1, 1);
  }
  return new Date();
}

function isSameMonth(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() && 
         date1.getMonth() === date2.getMonth();
}
