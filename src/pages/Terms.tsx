import React from 'react';
import LegalLayout from '@/components/LegalLayout';

const Terms = () => (
  <LegalLayout title="Terms of Service">
    <div className="space-y-8 text-[#A4ADB3] leading-relaxed">
      <p className="text-sm text-[#A4ADB3]/80">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <section>
        <h2 className="text-xl font-semibold text-[#00C2CB] mb-4">1. Acceptance of Terms</h2>
        <p>
          By accessing or using ServX, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#00C2CB] mb-4">2. Description of Service</h2>
        <p>
          ServX is an open-source infrastructure management tool provided &quot;as is.&quot; It enables you to manage servers, databases, 
          deployments, and related integrations from a unified dashboard.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#00C2CB] mb-4">3. User Responsibility</h2>
        <p>
          You are solely responsible for the actions you trigger through the dashboard. This includes, but is not limited to:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Deleting databases or dropping caches</li>
          <li>Deploying or rolling back applications</li>
          <li>Modifying security settings or access controls</li>
          <li>Any other operations that affect your infrastructure</li>
        </ul>
        <p className="mt-4">
          ServX does not guarantee the correctness or safety of any action. Always verify critical operations before proceeding.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#00C2CB] mb-4">4. No Warranty</h2>
        <p>
          ServX is provided without warranty of any kind, express or implied. We do not guarantee uninterrupted access, 
          error-free operation, or fitness for any particular purpose.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#00C2CB] mb-4">5. Limitation of Liability</h2>
        <p>
          To the extent permitted by law, ServX and its contributors shall not be liable for any indirect, incidental, 
          special, or consequential damages arising from your use of the platform.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#00C2CB] mb-4">6. Open Source</h2>
        <p>
          ServX is open source. You may use, modify, and distribute it in accordance with its license terms.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#00C2CB] mb-4">7. Changes</h2>
        <p>
          We may update these Terms from time to time. Continued use of ServX after changes constitutes acceptance of the updated Terms.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#00C2CB] mb-4">8. Contact</h2>
        <p>
          For questions about these Terms, contact us through the project repository or your preferred support channel.
        </p>
      </section>
    </div>
  </LegalLayout>
);

export default Terms;
