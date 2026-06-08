import { createBrowserClient } from '@supabase/ssr'

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Create a singleton client for browser usage with proper cookie handling for Next.js 15
let client: ReturnType<typeof createBrowserClient> | undefined;

export function getSupabaseBrowserClient() {
  if (client) {
    return client;
  }

  client = createBrowserClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    }
  );

  const isPlaceholderEnv = !supabaseUrl || supabaseUrl.includes('placeholder-project') || supabaseUrl.includes('placeholder.supabase.co');

  if (isPlaceholderEnv) {
    console.warn('[Supabase Client] Running in offline mock mode (placeholder credentials detected)');

    // Mock user database in local storage
    const getMockUsers = () => {
      try {
        return JSON.parse(localStorage.getItem('cs_mock_users') || '[]');
      } catch {
        return [];
      }
    };

    const saveMockUsers = (users: any[]) => {
      try {
        localStorage.setItem('cs_mock_users', JSON.stringify(users));
      } catch {}
    };

    // Mock session state in local storage
    const getMockSession = () => {
      try {
        const session = localStorage.getItem('cs_mock_session');
        return session ? JSON.parse(session) : null;
      } catch {
        return null;
      }
    };

    const saveMockSession = (session: any) => {
      try {
        if (session) {
          localStorage.setItem('cs_mock_session', JSON.stringify(session));
        } else {
          localStorage.removeItem('cs_mock_session');
        }
      } catch {}
    };

    // Mock auth namespace
    const mockAuth: any = {
      signInWithPassword: async ({ email, password }: any) => {
        console.log('[Mock Auth] signInWithPassword:', email);
        const users = getMockUsers();
        let user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
          const domain = email.toLowerCase().split('@')[1] || 'iiitl.ac.in';
          const mockSlug = domain.split('.')[0];
          user = {
            id: 'mock-user-' + Math.random().toString(36).substring(2, 9),
            email,
            role: 'student',
            user_metadata: { full_name: 'Mock Test User' }
          };
          users.push(user);
          saveMockUsers(users);
        }

        const session = {
          access_token: 'mock-access-token-' + user.role,
          refresh_token: 'mock-refresh-token-' + Math.random().toString(36).substring(2, 12),
          user
        };

        saveMockSession(session);
        return { data: { user, session }, error: null };
      },

      signUp: async ({ email, password, options }: any) => {
        console.log('[Mock Auth] signUp:', email);
        const users = getMockUsers();
        if (users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
          return { data: { user: null, session: null }, error: { message: 'User already exists' } };
        }
        const user = {
          id: 'mock-user-' + Math.random().toString(36).substring(2, 9),
          email,
          role: options?.data?.role || 'student',
          user_metadata: options?.data || { full_name: 'Mock Test User' }
        };
        users.push(user);
        saveMockUsers(users);
        return { data: { user, session: null }, error: null };
      },

      signOut: async () => {
        console.log('[Mock Auth] signOut');
        saveMockSession(null);
        return { error: null };
      },

      getSession: async () => {
        const session = getMockSession();
        return { data: { session }, error: null };
      },

      getUser: async () => {
        const session = getMockSession();
        return { data: { user: session ? session.user : null }, error: null };
      },

      onAuthStateChange: (callback: any) => {
        console.log('[Mock Auth] onAuthStateChange registered');
        const session = getMockSession();
        callback('SIGNED_IN', session);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                console.log('[Mock Auth] unsubscribe called');
              }
            }
          }
        };
      },

      resetPasswordForEmail: async (email: string) => {
        console.log('[Mock Auth] resetPasswordForEmail:', email);
        return { data: {}, error: null };
      }
    };

    Object.defineProperty(client, 'auth', {
      value: mockAuth,
      writable: true,
      configurable: true
    });
  }

  return client;
}

// Export default client for backwards compatibility
export const supabase = getSupabaseBrowserClient();
