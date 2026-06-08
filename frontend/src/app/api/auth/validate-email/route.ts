import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseServer';

/**
 * POST /api/auth/validate-email
 * 
 * Validates if an email domain is allowed based on:
 * 1. Organization-specific allowed_email_domains
 * 2. Global allowed_domains table
 * 
 * This enables institution-specific email validation during signup
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
    const { email } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({
        isValid: false,
        error: 'Please enter a valid email address',
        domain: null
      }, { status: 400 });
    }

    // Extract domain from email
    const domain = email.trim().toLowerCase().split('@')[1];

    if (!domain) {
      return NextResponse.json({
        isValid: false,
        error: 'Invalid email format',
        domain: null
      }, { status: 400 });
    }

    console.log(`[Email Validation] Checking domain: ${domain}`);

    // Step 1: Check organization-specific allowed domains (safely)
    let allOrgs: any[] = [];
    let dbErrorOccurred = false;

    try {
      const supabase = await createSupabaseAdminClient();
      const { data, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, settings')
        .eq('is_active', true);

      if (orgError) {
        console.error(`[Email Validation] Error fetching organizations:`, orgError);
        dbErrorOccurred = true;
      } else {
        allOrgs = data || [];
      }
    } catch (dbErr) {
      console.error(`[Email Validation] Database connection exception:`, dbErr);
      dbErrorOccurred = true;
    }

    // Filter to only orgs with non-empty allowed_email_domains arrays
    const orgsWithDomain = allOrgs.filter((org: any) => {
      const domains = org.settings?.allowed_email_domains;
      return Array.isArray(domains) && domains.length > 0;
    });

    if (orgsWithDomain.length > 0) {
      const matchingOrg = orgsWithDomain.find((org: any) => {
        const allowedDomains = org.settings?.allowed_email_domains || [];
        return allowedDomains.some((allowedDomain: string) => {
          const normalizedAllowed = allowedDomain.toLowerCase().trim();
          
          let matches = false;
          if (normalizedAllowed.startsWith('*.')) {
            const wildcardDomain = normalizedAllowed.substring(2);
            matches = domain.endsWith('.' + wildcardDomain);
          } else {
            matches = domain === normalizedAllowed;
          }
          return matches;
        });
      });

      if (matchingOrg) {
        console.log(`[Email Validation] ✅ Found matching org: ${matchingOrg.name}`);
        return NextResponse.json({
          isValid: true,
          domain,
          organizationId: matchingOrg.id,
          organizationName: matchingOrg.name,
          organizationSlug: matchingOrg.slug
        });
      }
    }

    // Step 2: Check global allowed_domains table for general educational patterns (safely)
    let isAllowedGlobal = false;
    try {
      const supabase = await createSupabaseAdminClient();
      const { data: allowedDomains, error: domainError } = await supabase
        .from('allowed_domains')
        .select('domain')
        .eq('is_active', true);

      if (!domainError && allowedDomains && allowedDomains.length > 0) {
        isAllowedGlobal = allowedDomains.some((d: { domain: string }) => {
          const pattern = d.domain.toLowerCase();
          return domain.includes(pattern) || domain.endsWith(pattern);
        });
      }
    } catch (dbErr) {
      console.error(`[Email Validation] Global allowed_domains query exception:`, dbErr);
    }

    if (isAllowedGlobal) {
      console.log(`[Email Validation] ✅ Validated via global patterns`);
      return NextResponse.json({
        isValid: true,
        domain,
        isGenericEducational: true
      });
    }

    // Step 3: Pattern-based educational fallback (offline check)
    const isIIITL = domain === 'iiitl.ac.in' || domain.endsWith('.iiitl.ac.in');
    const isEducational = isIIITL || domain.endsWith('.edu') || domain.endsWith('.ac.in') || domain.includes('edu.') || domain.includes('ac.');

    if (isEducational) {
      const mockSlug = isIIITL ? 'iiitl' : domain.split('.')[0];
      const mockName = isIIITL 
        ? 'Indian Institute of Information Technology, Lucknow (IIITL)' 
        : mockSlug.toUpperCase() + ' University';

      console.log(`[Email Validation] ✅ Validated via educational fallback matching: ${mockName}`);
      return NextResponse.json({
        isValid: true,
        domain,
        organizationId: getOrgUuid(mockSlug),
        organizationName: mockName,
        organizationSlug: mockSlug,
        isFallback: true
      });
    }

    // Step 4: No match found - reject
    console.log(`[Email Validation] ❌ Domain "${domain}" not found in any allowed list`);
    return NextResponse.json({
      isValid: false,
      error: 'Please use your institutional email address. If your institution is not yet onboarded, contact support.',
      domain
    });

  } catch (error) {
    console.error('Email validation error:', error);
    return NextResponse.json({
      isValid: false,
      error: 'Unable to validate email. Please try again.',
      domain: null
    }, { status: 500 });
  }
}
