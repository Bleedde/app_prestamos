import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Email confirmado, redirigir al dashboard
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Si falla, redirigir al login
  return NextResponse.redirect(new URL('/login', request.url));
}
