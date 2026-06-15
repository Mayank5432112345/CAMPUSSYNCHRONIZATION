import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0A0F1E] text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/login" className="text-sm font-semibold text-blue-300 hover:text-blue-200">
          Back to login
        </Link>
        <h1 className="mt-8 text-4xl font-bold">Privacy Policy</h1>
        <p className="mt-4 text-white/70">
          CampusSync stores account, organization, and credential data needed to provide document
          verification and portfolio features.
        </p>
        <section className="mt-8 space-y-4 text-white/70">
          <p>
            Uploaded documents and extracted metadata are used to review, approve, issue, and verify
            credentials inside the application.
          </p>
          <p>
            Access to protected credential data is limited to authorized users and workflows, such
            as students, faculty reviewers, administrators, and approved recruiters.
          </p>
        </section>
      </div>
    </main>
  );
}
