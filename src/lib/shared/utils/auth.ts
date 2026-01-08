import { NextRequest } from 'next/server';
import { SupabaseClientFactory } from '../../infrastructure/database/supabase.client';

export async function authenticateUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No autorizado');
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabase = SupabaseClientFactory.createClientWithAuth(token);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Token inválido');
  }

  return user;
}
