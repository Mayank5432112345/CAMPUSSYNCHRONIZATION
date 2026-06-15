import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const adminClient = await createSupabaseAdminClient();
    const mockOrgId = 'd0e8f230-0000-4000-8000-111122223333';
    const studentEmail = 'student_test@iiitl.ac.in';
    const recruiterEmail = 'recruiter_test@iiitl.ac.in';
    const password = 'Password123!';

    console.log('[TEST_SETUP] Creating mock organization if not exists...');
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .upsert({
        id: mockOrgId,
        name: 'IIIT Lucknow',
        slug: 'iiitl-univ-test',
        type: 'university',
        is_active: true,
        settings: {
          allowed_email_domains: ['iiitl.ac.in']
        }
      }, { onConflict: 'id' })
      .select('id')
      .single();

    if (orgError) {
      console.error('[TEST_SETUP] Org upsert error:', orgError);
      return NextResponse.json({ error: 'Failed to setup organization: ' + orgError.message }, { status: 500 });
    }

    // List all users to check if our test users already exist
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    
    // 1. Student User
    let studentUser = existingUsers?.users.find(u => u.email?.toLowerCase() === studentEmail);
    let studentId: string;

    if (!studentUser) {
      console.log('[TEST_SETUP] Creating student user...');
      const { data: newStudent, error: createStudentError } = await adminClient.auth.admin.createUser({
        email: studentEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: 'Test Student',
          organization_id: mockOrgId,
          signup_type: 'student_faculty'
        }
      });
      if (createStudentError || !newStudent.user) {
        throw new Error('Failed to create student user: ' + (createStudentError?.message || 'unknown'));
      }
      studentId = newStudent.user.id;
    } else {
      studentId = studentUser.id;
      // Auto confirm just in case
      await adminClient.auth.admin.updateUserById(studentId, { email_confirm: true });
    }

    // 2. Recruiter User
    let recruiterUser = existingUsers?.users.find(u => u.email?.toLowerCase() === recruiterEmail);
    let recruiterId: string;

    if (!recruiterUser) {
      console.log('[TEST_SETUP] Creating recruiter user...');
      const { data: newRecruiter, error: createRecruiterError } = await adminClient.auth.admin.createUser({
        email: recruiterEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: 'Test Recruiter',
          company_name: 'Tech Corp',
          signup_type: 'recruiter'
        }
      });
      if (createRecruiterError || !newRecruiter.user) {
        throw new Error('Failed to create recruiter user: ' + (createRecruiterError?.message || 'unknown'));
      }
      recruiterId = newRecruiter.user.id;
    } else {
      recruiterId = recruiterUser.id;
      // Auto confirm just in case
      await adminClient.auth.admin.updateUserById(recruiterId, { email_confirm: true });
    }

    console.log('[TEST_SETUP] Setting up profiles and user roles...');
    
    // Upsert Student Profile
    const { error: spError } = await adminClient
      .from('profiles')
      .upsert({
        id: studentId,
        email: studentEmail,
        full_name: 'Test Student',
        role: 'student',
        organization_id: mockOrgId,
        university: 'IIIT Lucknow',
        major: 'Computer Science',
        graduation_year: 2026,
        approval_status: 'approved'
      }, { onConflict: 'id' });

    if (spError) console.error('[TEST_SETUP] Student profile error:', spError);

    // Upsert Recruiter Profile
    const { error: rpError } = await adminClient
      .from('profiles')
      .upsert({
        id: recruiterId,
        email: recruiterEmail,
        full_name: 'Test Recruiter',
        role: 'recruiter',
        organization_id: null,
        approval_status: 'approved'
      }, { onConflict: 'id' });

    if (rpError) console.error('[TEST_SETUP] Recruiter profile error:', rpError);

    // Delete and recreate user roles to avoid conflicts and ensure fresh roles
    await adminClient.from('user_roles').delete().eq('user_id', studentId);
    await adminClient.from('user_roles').delete().eq('user_id', recruiterId);

    // Insert Student Role
    await adminClient.from('user_roles').insert({
      user_id: studentId,
      organization_id: mockOrgId,
      role: 'student',
      approval_status: 'approved'
    });

    // Insert Recruiter Role
    await adminClient.from('user_roles').insert({
      user_id: recruiterId,
      organization_id: null,
      role: 'recruiter',
      approval_status: 'approved'
    });

    // recruiter org_access and user_roles access for the organization
    await adminClient.from('recruiter_org_access').delete().eq('recruiter_user_id', recruiterId).eq('organization_id', mockOrgId);
    await adminClient.from('recruiter_org_access').insert({
      recruiter_user_id: recruiterId,
      organization_id: mockOrgId,
      status: 'approved',
      approved_at: new Date().toISOString()
    });

    await adminClient.from('user_roles').insert({
      user_id: recruiterId,
      organization_id: mockOrgId,
      role: 'recruiter',
      approval_status: 'approved'
    });

    console.log('[TEST_SETUP] Test environment initialized successfully!');
    return NextResponse.json({
      success: true,
      message: 'Test users and organization configured successfully!',
      student: { id: studentId, email: studentEmail },
      recruiter: { id: recruiterId, email: recruiterEmail }
    });

  } catch (error: any) {
    console.error('[TEST_SETUP] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
