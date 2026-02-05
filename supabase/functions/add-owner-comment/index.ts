import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"
import { SharedAnalysisCacheService } from "../_shared/services/cache/SharedAnalysisCacheService.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, HEAD',
  'Access-Control-Max-Age': '86400',
}

interface OwnerCommentRequest {
  token: string;
  comment: string;
  parent_comment_id?: string;
}

serve(async (req) => {
  console.log('Request received:', { method: req.method, url: req.url })
  
  // Always return CORS headers for all responses
  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json'
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request')
    return new Response('ok', { headers: responseHeaders })
  }

  try {
    const { token, comment, parent_comment_id }: OwnerCommentRequest = await req.json()

    console.log('Received owner comment request:', { 
      token, 
      hasAuthHeader: !!req.headers.get('authorization'),
      comment: comment?.substring(0, 50) + '...',
      parent_comment_id 
    })

    // Validaciones básicas
    if (!token || !comment) {
      console.log('Validation error - missing fields:', { 
        hasToken: !!token, 
        hasComment: !!comment 
      })
      return new Response(
        JSON.stringify({ error: 'Token and comment are required' }),
        { status: 400, headers: responseHeaders }
      )
    }

    if (comment.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Comment too long (max 1000 characters)' }),
        { status: 400, headers: responseHeaders }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Service role client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Auth client to validate requester identity from JWT
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get('authorization') ?? '',
        },
      },
    })

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser()

    if (userError || !userData?.user) {
      console.log('Auth error validating user:', { userError })
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: responseHeaders }
      )
    }

    const requesterUserId = userData.user.id

    // Verificar que el token sea válido y obtener el análisis
    const { data: linkData, error: linkError } = await supabase
      .from('shared_analysis_links')
      .select('analysis_id, expires_at, is_active')
      .eq('token', token)
      .single()

    if (linkError || !linkData) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 404, headers: responseHeaders }
      )
    }

    if (!linkData.is_active) {
      return new Response(
        JSON.stringify({ error: 'Link is deactivated' }),
        { status: 403, headers: responseHeaders }
      )
    }

    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Link has expired' }),
        { status: 403, headers: responseHeaders }
      )
    }

    // Verificar que el usuario es el owner del análisis
    const { data: analysis, error: analysisError } = await supabase
      .from('expense_analyses')
      .select('user_id')
      .eq('id', linkData.analysis_id)
      .single()

    if (analysisError || !analysis) {
      return new Response(
        JSON.stringify({ error: 'Analysis not found' }),
        { status: 404, headers: responseHeaders }
      )
    }

    if (analysis.user_id !== requesterUserId) {
      return new Response(
        JSON.stringify({ error: 'Only the analysis owner can comment' }),
        { status: 403, headers: responseHeaders }
      )
    }

    // Si es una respuesta, verificar que el comentario padre existe
    if (parent_comment_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('analysis_comments')
        .select('id, analysis_id')
        .eq('id', parent_comment_id)
        .eq('analysis_id', linkData.analysis_id)
        .single()

      if (parentError || !parentComment) {
        return new Response(
          JSON.stringify({ error: 'Parent comment not found' }),
          { status: 404, headers: responseHeaders }
        )
      }
    }

    // Insertar el comentario del owner
    const { data: newComment, error: insertError } = await supabase
      .from('analysis_comments')
      .insert({
        analysis_id: linkData.analysis_id,
        token: token,
        author_name: 'Owner', // Placeholder, se sobreescribirá con el nombre real
        author_email: null,
        comment: comment.trim(),
        ip_address: null, // Los comentarios de owner no registran IP
        user_agent: null,
        is_owner_comment: true,
        user_id: requesterUserId,
        parent_comment_id: parent_comment_id || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting owner comment:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save comment' }),
        { status: 500, headers: responseHeaders }
      )
    }

    // Invalidar caché del análisis para incluir nuevo comentario
    const cacheService = new SharedAnalysisCacheService();
    await cacheService.invalidateCache(linkData.analysis_id);

    console.log(`Owner comment added for analysis ${linkData.analysis_id} by user ${requesterUserId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        comment: newComment,
        message: 'Owner comment added successfully' 
      }),
      { status: 201, headers: responseHeaders }
    )

  } catch (error) {
    console.error('Error in add-owner-comment:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: responseHeaders }
    )
  }
})
