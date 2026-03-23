import React from 'react';
import LegalLayout from '@/components/LegalLayout';

const Privacy = () => (
  <LegalLayout title="Privacy Policy">
    <div className="space-y-10 text-[#A4ADB3] leading-relaxed text-[15px]">
      <p className="text-sm text-[#A4ADB3]/70">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">1. Introduction</h2>
        <p>
          ServX (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is an open-source infrastructure command center that enables developers 
          to manage servers, databases, deployments, and security controls from a unified dashboard. This Privacy Policy 
          describes how we collect, use, store, and protect your information when you use the ServX platform. By using ServX, 
          you consent to the practices described in this policy.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">2. Information We Collect</h2>
        <p>
          We collect only the information necessary to provide and operate the ServX dashboard:
        </p>
        <ul className="list-disc pl-6 mt-3 space-y-2">
          <li><strong className="text-[#A4ADB3]">Account Information:</strong> Email address, display name, and profile picture from your authentication provider (Firebase, Google, or GitHub) when you sign in.</li>
          <li><strong className="text-[#A4ADB3]">Third-Party API Credentials:</strong> API keys, tokens, and connection credentials you voluntarily provide for integrations such as Vercel, Render, GitHub, and other supported services.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">3. Google Workspace API Usage</h2>
        <p>
          ServX uses Google OAuth to authenticate users. We request the https://www.googleapis.com/auth/gmail.send scope solely to allow the ServX platform to dispatch automated system alerts (such as server crash notifications) from your email address. ServX does not request, and does not have the ability to read, store, delete, or share your personal inbox data or existing emails.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">4. API Key and Credential Storage</h2>
        <p>
          Third-party API keys and credentials (e.g., Vercel API tokens, Render API keys, GitHub personal access tokens) are encrypted at rest using industry-standard encryption and stored solely for your personal dashboard functionality. These credentials are used exclusively to perform actions you authorize within your own infrastructure. We do not share, sell, or transmit your API keys to any third party. Data is strictly isolated per user—each user&apos;s data is accessible only to that user and is never used for any purpose other than powering their own ServX dashboard experience.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">5. How We Use Your Information</h2>
        <p>
          We use the information we collect to: authenticate your identity, display your dashboard and connected services, execute actions you initiate (such as deployments or cache flushes), send system alerts when configured, and improve the ServX platform. We do not use your data for advertising, marketing, or any purpose unrelated to the operation of the dashboard.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">6. Data Retention and Deletion</h2>
        <p>
          We retain your data only for as long as your account is active. You may request deletion of your account and all associated data at any time. Upon account deletion, we will remove your personal information and stored credentials from our systems within a reasonable period, subject to applicable legal retention requirements.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">7. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your data against unauthorized access, alteration, disclosure, or destruction. Credentials are encrypted in transit and at rest. Access to production systems is restricted and audited.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">8. Open Source and Transparency</h2>
        <p>
          ServX is open source. You may inspect our codebase to verify how we handle your data. We are committed to transparency and welcome community review of our practices.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">9. Contact</h2>
        <p>
          For privacy-related questions, requests, or concerns, please contact us at{' '}
          <a href="mailto:servx.lab@gmail.com" className="text-[#00C2CB] hover:underline">servx.lab@gmail.com</a>.
        </p>
      </section>
    </div>
  </LegalLayout>
);

export default Privacy;
