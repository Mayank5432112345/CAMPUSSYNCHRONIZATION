import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const isPlaceholderEnv = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder-project');

  if (isPlaceholderEnv) {
    const mockSessionCookie = request.cookies.get('sb-mock-session');
    let user = null;
    if (mockSessionCookie) {
      try {
        const session = JSON.parse(mockSessionCookie.value);
        user = session.user;
      } catch {}
    }

    const createMockPromise = (data: any): any => {
      const result = { data, error: null };
      const promise = Promise.resolve(result);
      
      const chain = {
        eq: () => createMockPromise(Array.isArray(data) ? data[0] || data : data),
        limit: () => createMockPromise(data),
        maybeSingle: () => Promise.resolve({ data: Array.isArray(data) ? data[0] || data : data, error: null }),
        single: () => Promise.resolve({ data: Array.isArray(data) ? data[0] || data : data, error: null })
      };
      
      return Object.assign(promise, chain);
    };

    const mockSupabase: any = {
      from: () => ({
        select: () => ({
          eq: () => createMockPromise([{ role: user?.role || 'student', approval_status: 'approved' }])
        })
      })
    };

    return { supabaseResponse, user, supabase: mockSupabase };
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        autoRefreshToken: true,
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return { supabaseResponse, user, supabase }
}
