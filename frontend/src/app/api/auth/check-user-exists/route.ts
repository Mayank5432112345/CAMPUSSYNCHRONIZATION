import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const isPlaceholderEnv = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder-project');

    if (isPlaceholderEnv) {
      console.log('[check-user-exists] Offline mock mode: checking mock user existence');
      const emailDomain = email.toLowerCase().split('@')[1];
      const isEducational = emailDomain === 'iiitl.ac.in' || emailDomain.endsWith('.iiitl.ac.in') || emailDomain.endsWith('.edu') || emailDomain.endsWith('.ac.in');
      return NextResponse.json({ exists: isEducational });
    }

    // Create admin client to check auth.users table
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Use admin API to get user by email
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('Error checking user:', error);
      return NextResponse.json(
        { error: 'Failed to check user' },
        { status: 500 }
      );
    }

    // Check if email exists in users list
    const userExists = users.some(user => user.email?.toLowerCase() === email.toLowerCase());

    return NextResponse.json({ exists: userExists });

  } catch (error) {
    console.error('Error in check-user-exists:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
