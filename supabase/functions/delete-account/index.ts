import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

        // Get the authorization header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No authorization header' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        // Get the user from the JWT
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
            authHeader.replace('Bearer ', '')
        )

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid token' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        const userId = user.id

        console.log(`Deleting account for user: ${userId}`)

        // 1. Delete files from storage
        // The files are in bucket 'expense-files' in folder userId/
        try {
            const { data: files } = await supabaseClient
                .storage
                .from('expense-files')
                .list(userId, {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'name', order: 'asc' },
                    search: '',
                    recursive: true
                })

            if (files && files.length > 0) {
                const pathsToDelete = files.map(f => `${userId}/${f.name}`)
                const { error: removeError } = await supabaseClient
                    .storage
                    .from('expense-files')
                    .remove(pathsToDelete)

                if (removeError) {
                    console.error('Error removing files:', removeError)
                } else {
                    console.log(`Deleted ${pathsToDelete.length} files for user ${userId}`)
                }
            }
        } catch (storageError) {
            console.error('Error deleting storage files:', storageError)
            // Continue even if storage deletion fails
        }

        // 2. Delete the user from auth.users (cascade should handle profiles, expense_analyses, etc.)
        const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId)

        if (deleteError) {
            throw deleteError
        }

        return new Response(
            JSON.stringify({ message: 'Account deleted successfully' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Error deleting account:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
