import React from 'react';
import LegalLayout from '@/components/LegalLayout';

const Terms = () => (
  <LegalLayout title="Terms of Service">
    <div className="space-y-10 text-[#A4ADB3] leading-relaxed text-[15px]">
      <p className="text-sm text-[#A4ADB3]/70">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">1. Acceptance of Terms</h2>
        <p>
          By accessing or using ServX, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you must not use the ServX platform. These Terms constitute a legally binding agreement between you and ServX.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">2. Description of Service</h2>
        <p>
          ServX is an open-source infrastructure command center that provides a unified dashboard for managing servers, databases, deployments, security controls, and third-party integrations. ServX is provided &quot;as is&quot; and &quot;as available&quot; without warranty of any kind. We do not guarantee uninterrupted access, error-free operation, or fitness for any particular purpose.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">3. User Responsibility</h2>
        <p>
          You are solely and fully responsible for all actions you execute through the ServX dashboard. The platform enables you to perform operations that can have significant consequences on your infrastructure. By using ServX, you acknowledge and accept that you are responsible for:
        </p>
        <ul className="list-disc pl-6 mt-3 space-y-2">
          <li>Flushing Redis caches, clearing application caches, or invalidating data stores</li>
          <li>Locking or revoking GitHub contributor access, modifying repository permissions, or revoking external tokens</li>
          <li>Dropping databases, truncating tables, or performing destructive database operations</li>
          <li>Deploying, rolling back, or redeploying applications and services</li>
          <li>Modifying security settings, access controls, or firewall rules</li>
          <li>Any other operations that affect your infrastructure, data, or third-party services</li>
        </ul>
        <p className="mt-4">
          ServX does not guarantee the correctness, safety, or appropriateness of any action. You must verify critical operations before proceeding. We recommend testing in non-production environments and maintaining backups.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">4. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by applicable law, ServX, its creators, contributors, and affiliates shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from or related to your use of the platform. This includes, without limitation, accidental data loss, server downtime, service interruptions, security breaches, or any damage resulting from actions you execute through the dashboard. You use ServX at your own risk.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">5. No Warranty</h2>
        <p>
          ServX is provided without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the platform will be uninterrupted, secure, or free of errors.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">6. Indemnification</h2>
        <p>
          You agree to indemnify, defend, and hold harmless ServX, its creators, and contributors from any claims, damages, losses, or expenses (including reasonable attorneys&apos; fees) arising from your use of the platform or your violation of these Terms.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">7. Open Source License</h2>
        <p>
          ServX is open source. You may use, modify, and distribute it in accordance with its license terms. Use of the hosted ServX platform is subject to these Terms in addition to any applicable open source license.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">8. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. We will notify users of material changes by posting the updated Terms on this page and updating the &quot;Last updated&quot; date. Your continued use of ServX after such changes constitutes acceptance of the updated Terms.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4">9. Contact</h2>
        <p>
          For questions about these Terms of Service, please contact us at{' '}
          <a href="mailto:servx.lab@gmail.com" className="text-[#00C2CB] hover:underline">servx.lab@gmail.com</a>.
        </p>
      </section>
    </div>
  </LegalLayout>
);

export default Terms;
