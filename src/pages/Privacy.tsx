import React from 'react';
import LegalLayout from '@/components/LegalLayout';

const Privacy = () => (
  <LegalLayout title="Privacy Policy">
    <div className="space-y-8 text-[#A4ADB3] leading-relaxed">
      <p className="text-sm text-[#A4ADB3]/80">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <section>
        <h2 className="text-xl font-semibold text-[#00C2CB] mb-4">1. Introduction</h2>
        <p>
          ServX (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is an open-source infrastructure management dashboard. 
          This Privacy Policy explains how we collect, use, and protect your information when you use our platform.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#00C2CB] mb-4">2. Data We Collect</h2>
        <p>
          We collect only the information necessary to operate the dashboard:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Account information (email, name) from your authentication provider (Firebase, Google, GitHub)</li>
          <li>API keys and credentials you provide for integrations (Vercel, Render, etc.)—stored encrypted and used solely for your account</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#00C2CB] mb-4">3. Google Workspace APIs</h2>
        <p>
          ServX uses Google Workspace APIs for system alerts. Specifically:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>We use the <strong className="text-[#A4ADB3]">gmail.send</strong> scope to send transactional emails (e.g., welcome messages, system alerts).</li>
          <li>We do <strong className="text-[#A4ADB3]">not</strong> read, store, or sell your personal inbox data.</li>
          <li>We do not access any email content beyond what is required to send outbound messages on your behalf.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#00C2CB] mb-4">4. API Keys & Credentials</h2>
        <p>
          API keys and credentials (e.g., Vercel, Render tokens) are encrypted and stored solely for your personal dashboard functionality. 
          They are never shared or sold. Data is isolated per user—each user&apos;s data is accessible only to that user.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#00C2CB] mb-4">5. Data Retention</h2>
        <p>
          We retain your data only as long as your account is active. You may request deletion of your account and associated data at any time.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#00C2CB] mb-4">6. Open Source</h2>
        <p>
          ServX is open source. You may inspect our codebase to verify how we handle your data.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#00C2CB] mb-4">7. Contact</h2>
        <p>
          For privacy-related questions, contact us through the project repository or your preferred support channel.
        </p>
      </section>
    </div>
  </LegalLayout>
);

export default Privacy;
