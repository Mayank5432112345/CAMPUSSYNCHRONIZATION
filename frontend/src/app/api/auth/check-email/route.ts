import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseServer';

/**
 * POST /api/auth/check-email
 * 
 * Check if an email domain matches any organization's allowed domains.
 * Used during signup to determine:
 * - If user can signup as student/faculty (domain match)
 * - Which organizations they can join
 * - If they should use recruiter flow instead (no domain match)
 */
function getOrgUuid(slug: string): string {
  let hex = '';
  for (let i = 0; i < slug.length; i++) {
    hex += slug.charCodeAt(i).toString(16);
  }
  hex = hex.padEnd(12, '0').substring(0, 12);
  return `d0e8f230-0000-4000-8000-${hex}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Extract domain from email
    const emailLower = email.toLowerCase().trim();
    const domain = emailLower.split('@')[1];

    if (!domain) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Try to query active organizations from database, catch all errors to fallback
    let allOrganizations: any[] = [];
    let dbErrorOccurred = false;

    try {
      const supabase = await createSupabaseAdminClient();
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, type, settings')
        .eq('is_active', true);

      if (error) {
        console.error('[CHECK_EMAIL] Database query error:', error);
        dbErrorOccurred = true;
      } else {
        allOrganizations = data || [];
      }
    } catch (dbErr) {
      console.error('[CHECK_EMAIL] Database connection exception:', dbErr);
      dbErrorOccurred = true;
    }

    // Filter organizations that have this domain in their allowed_email_domains
    const matches = allOrganizations.filter((org: any) => {
      const settings = org.settings as { allowed_email_domains?: string[] };
      const allowedDomains = settings?.allowed_email_domains || [];
      return Array.isArray(allowedDomains) && allowedDomains.some(d => d.toLowerCase() === domain);
    });

    const isIIITL = domain === 'iiitl.ac.in' || domain.endsWith('.iiitl.ac.in');
    const isEducational = isIIITL || domain.endsWith('.edu') || domain.endsWith('.ac.in') || domain.includes('edu.') || domain.includes('ac.');

    let finalMatches = matches;
    if (finalMatches.length === 0 && isEducational) {
      const mockSlug = isIIITL ? 'iiitl' : domain.split('.')[0];
      const mockName = isIIITL 
        ? 'Indian Institute of Information Technology, Lucknow (IIITL)' 
        : mockSlug.toUpperCase() + ' University';

      finalMatches = [{
        id: getOrgUuid(mockSlug),
        name: mockName,
        slug: mockSlug,
        type: 'university'
      }];
    }

    if (finalMatches.length > 0) {
      // Email domain matches one or more organizations (or fallback)
      return NextResponse.json({
        canSignup: true,
        userType: 'student', // Default to student, can upgrade to faculty later
        matches: finalMatches.map((org: any) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          type: org.type
        })),
        domain,
        message: finalMatches[0].id.startsWith('d0e8f230-0000-4000-8000-')
          ? `Validated via educational fallback for ${finalMatches[0].name}`
          : `This email is registered with ${finalMatches[0].name}`
      });
    }

    if (dbErrorOccurred) {
      return NextResponse.json(
        { error: 'Database connection failed and domain is not recognized as educational' },
        { status: 500 }
      );
    }

    // No domain match - suggest recruiter signup
    return NextResponse.json({
      canSignup: true,
      userType: 'recruiter',
      matches: [],
      domain,
      message: 'No organization found for this email domain. You can sign up as a recruiter to request access to organizations.'
    });
  } catch (error: unknown) {
    console.error('[CHECK_EMAIL] Uncaught error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
