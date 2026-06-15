import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0A0F1E] text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/login" className="text-sm font-semibold text-blue-300 hover:text-blue-200">
          Back to login
        </Link>
        <h1 className="mt-8 text-4xl font-bold">Terms of Service</h1>
        <p className="mt-4 text-white/70">
          CampusSync is a credential management platform for issuing, reviewing, and verifying
          academic records. Use the service responsibly and only upload documents you are allowed
          to submit or manage.
        </p>
        <section className="mt-8 space-y-4 text-white/70">
          <p>
            Accounts may be limited or removed if they are used to submit false information,
            abuse verification workflows, or access data without permission.
          </p>
          <p>
            Institutions and authorized reviewers are responsible for validating submitted
            documents before approving credentials.
          </p>
        </section>
      </div>
    </main>
  );
}
