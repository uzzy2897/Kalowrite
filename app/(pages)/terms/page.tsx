import React from "react";

export const metadata = {
  title: "Terms of Service | KaloWrite",
  description:
    "Read KaloWrite’s Terms of Service to understand your rights and obligations when using our AI writing platform.",
};

// 💅 Reusable components for headings and paragraphs
const H1 = ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-start text-3xl font-bold  mb-4">{children}</h1>
  );
  
  const H2 = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-xl font-semibold  mt-10 mb-3 border-b  pb-1">
      {children}
    </h2>
  );
  
  const H3 = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-lg font-semibold 0 mt-6 mb-2">{children}</h3>
  );
  
  const P = ({ children }: { children: React.ReactNode }) => (
    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">{children}</p>
  );
  
  const LinkText = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href} className="text-emerald-600 hover:underline">
      {children}
    </a>
  );

export default function TermsPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-16">
      <H1>Terms of Service</H1>
      <p className="text-start text-sm text-muted-foreground mb-10">
        Effective date: <strong>5th Oct, 2025</strong> <br />
        Last updated: <strong>5th Oct, 2025</strong>
      </p>

      <P>
        <strong>Company:</strong> ADVEREO MEDIA LLC (“the Company”, “we”, “us”, or “KaloWrite”)
        <br />
        <strong>Website:</strong>{" "}
        <LinkText href="https://kalowrite.com">https://kalowrite.com</LinkText>
      </P>
      <P>
        Important: KaloWrite is not a tool for academic dishonesty or cheating. By using the
        Service, you agree not to use it for academic cheating or other prohibited purposes.
      </P>

      <section>
        <H2>1. Acceptance of Terms</H2>
        <P>
          By accessing or using KaloWrite (the “Service”), you agree to these Terms of Service
          (“Terms”). If you do not agree, do not use the Service.
        </P>
      </section>

      <section>
        <H2>2. Eligibility</H2>
        <P>
          KaloWrite is intended for users who are at least 13 years old. If you are under 13, you
          must not use the Service or create an account. If we learn we have collected personal data
          from a child under 13, we will delete the account and related data.
        </P>
        <P>
          Users aged 13–17 may use free features (including the 500-word free allowance) but cannot
          purchase paid subscriptions or credits without verified parental consent. Parents or
          guardians must authorize purchases. We may request proof of consent before allowing
          transactions.
        </P>
        <P>
          If you believe a child under 13 has provided us information, contact{" "}
          <LinkText href="mailto:support@kalowrite.com">support@kalowrite.com</LinkText>.
        </P>
      </section>

      <section>
        <H2>3. Accounts, Authentication & Security</H2>
        <P>
          Users must create an account to access most features. Authentication is handled via Clerk
          or supported OAuth providers. Keep your credentials secure and notify{" "}
          <LinkText href="mailto:support@kalowrite.com">support@kalowrite.com</LinkText> of
          unauthorized access. We may suspend or terminate accounts for violations.
        </P>
      </section>

      <section>
        <H2>4. Plans, Billing & Free Trial</H2>
        <P>
          KaloWrite offers both free and paid plans, listed on the Pricing page. Free users receive
          500 words on signup. Paid plans renew automatically via Stripe. You authorize recurring
          charges and can cancel anytime via your billing dashboard.
        </P>
        <P>
          Users on Pro or Ultra plans can purchase additional word credits (“top-ups”). Pricing,
          features, and models may change at any time with prior notice for renewals.
        </P>
      </section>

      <section>
        <H2>5. Refunds & Cancellations</H2>
        <P>
          You may cancel your subscription at any time, stopping future renewals. However,
          cancellations do not entitle you to a refund for the current billing cycle unless stated
          otherwise.
        </P>
        <P>
          Because you gain immediate access to digital AI services, all payments are{" "}
          <strong>non-refundable</strong>. This includes subscription renewals and top-ups. You
          waive the 14-day withdrawal right under EU consumer law.
        </P>
        <P>
          We reserve the right to suspend accounts for misuse, fraud, or multiple free-tier abuse.
        </P>
      </section>

      <section>
        <H2>6. Acceptable Use / Prohibited Conduct</H2>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
          <li>Do not use KaloWrite for cheating, plagiarism, or academic dishonesty.</li>
          <li>Do not violate laws, IP rights, or others’ privacy.</li>
          <li>Do not submit malware or harmful content.</li>
          <li>Do not reverse-engineer, scrape, or overload the system.</li>
        </ul>
        <P>Violation may result in account suspension or legal action.</P>
      </section>

      <section>
        <H2>7. User Content & License</H2>
        <P>
          You retain ownership of any text or content you submit. By submitting content, you grant
          KaloWrite a limited license to store, process, and display it for providing the Service and
          diagnostics.
        </P>
        <P>
          You are responsible for how you use AI-generated output. We do not claim ownership over
          generated text.
        </P>
      </section>

      <section>
        <H2>8. Intellectual Property</H2>
        <P>
          All platform code, design, and trademarks belong to ADVEREO MEDIA LLC or licensors. You
          may not copy, modify, or redistribute materials except as allowed.
        </P>
        <P>
          For DMCA or IP takedown requests, contact{" "}
          <LinkText href="mailto:support@kalowrite.com">support@kalowrite.com</LinkText>.
        </P>
      </section>

      <section>
        <H2>9. Privacy & Data Handling</H2>
        <P>
          KaloWrite’s data practices are governed by our{" "}
          <LinkText href="/privacy">Privacy Policy</LinkText>. By using the Service, you consent to
          such processing.
        </P>
      </section>

      <section>
        <H2>10. Security</H2>
        <P>
          We use reasonable technical and organizational measures to protect user data, but cannot
          guarantee absolute security. Users are responsible for securing their login credentials.
        </P>
      </section>

      <section>
        <H2>11. Disclaimers & No Warranty</H2>
        <P>
          THE SERVICE IS PROVIDED “AS IS” WITHOUT WARRANTIES OF ANY KIND. KALOWRITE DISCLAIMS ALL
          IMPLIED WARRANTIES, INCLUDING MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.
        </P>
      </section>

      <section>
        <H2>12. Limitation of Liability</H2>
        <P>
          To the maximum extent permitted by law, ADVEREO MEDIA LLC shall not be liable for indirect,
          incidental, or consequential damages. Liability is capped at the greater of $100 or the
          amount you paid in the prior 12 months.
        </P>
      </section>

      <section>
        <H2>13. Indemnification</H2>
        <P>
          You agree to indemnify and hold harmless ADVEREO MEDIA LLC and its affiliates against
          claims arising from your content, usage, or breach of these Terms.
        </P>
      </section>

      <section>
        <H2>14. Termination & Suspension</H2>
        <P>
          We may suspend or terminate accounts for violations or legal reasons. Upon termination,
          access is revoked. You can delete your account via settings or by contacting{" "}
          <LinkText href="mailto:support@kalowrite.com">support@kalowrite.com</LinkText>.
        </P>
      </section>

      <section>
        <H2>15. Governing Law & Dispute Resolution</H2>
        <P>
          These Terms are governed by the laws of Wyoming. Venue for disputes is Wyoming County
          Court House. Alternative arbitration options may apply where legally permitted.
        </P>
      </section>

      <section>
        <H2>16. Modification of Terms</H2>
        <P>
          We may update these Terms periodically. Continued use after changes constitutes acceptance
          of the new Terms.
        </P>
      </section>

      <section>
        <H2>17. Miscellaneous</H2>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
          <li>These Terms and the Privacy Policy form the entire agreement.</li>
          <li>If any clause is invalid, the rest remains in effect.</li>
          <li>KaloWrite may assign its rights; users may not assign without consent.</li>
        </ul>
      </section>

      <section>
        <H2>18. Contact</H2>
        <P>
          For legal, privacy, or account inquiries, contact{" "}
          <LinkText href="mailto:support@kalowrite.com">support@kalowrite.com</LinkText>.
        </P>
      </section>
    </main>
  );
}
