import React from "react";

export const metadata = {
  title: "Privacy Policy | KaloWrite",
  description:
    "Read KaloWrite’s Privacy Policy to learn how we collect, use, and protect your personal data.",
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

export default function PrivacyPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-16">
      <H1>Privacy Policy</H1>
      <p className="text-start text-sm text-muted-foreground mb-10">
        Effective date: <strong>5th Oct, 2025</strong> <br />
        Last updated: <strong>5th Oct, 2025</strong>
      </p>

      <section>
        <H2>1. Overview</H2>
        <P>
          This Privacy Policy explains how <strong>ADVEREO MEDIA LLC</strong> (“we”, “us”,
          “KaloWrite”, or the “Company”) collects, uses, discloses, and safeguards personal
          information when you visit or use{" "}
          <LinkText href="https://kalowrite.com">https://kalowrite.com</LinkText> (the “Site”)
          and the KaloWrite service (the “Service”). KaloWrite is an AI text humanizer offered via
          the Site and by account signup. The Site contains pricing and contact information and
          states it’s not for academic dishonesty. If you are a registered user, this Policy also
          describes your rights and choices regarding your personal data.
        </P>
      </section>

      <section>
        <H2>2. Contact & Controller</H2>
        <P>
          <strong>Controller:</strong> ADVEREO MEDIA LLC
        </P>
        <P>
          <strong>Email:</strong>{" "}
          <LinkText href="mailto:support@kalowrite.com">support@kalowrite.com</LinkText> (You may
          also contact us via the contact form on the Site.)
        </P>
        <P>
          <strong>Business address:</strong> 30 N Gould St, Ste R, Sheridan, WY 82801
        </P>
      </section>

      <section>
        <H2>3. Information We Collect</H2>

        <H3>A. Information you provide directly</H3>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
          <li>Account registration data (name, email, password or third-party auth identifiers via Clerk).</li>
          <li>Billing & payment information (via Stripe — we do not store full card data; Stripe processes payments).</li>
          <li>Content you submit to the Service (uploaded text, documents, any content you ask the AI to humanize).</li>
          <li>Support requests, feedback, and communications you send to us.</li>
        </ul>

        <H3>B. Information automatically collected</H3>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
          <li>Usage metrics (pages visited, features used, request logs, tokens/word usage).</li>
          <li>Device and connection data (IP address, browser user agent, device identifiers, timestamps).</li>
          <li>Cookies and similar technologies to support login state and analytics.</li>
        </ul>

        <H3>C. Third-party data</H3>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
          <li>Data from authentication providers (Clerk).</li>
          <li>Data from payment processors (Stripe) related to transactions.</li>
        </ul>
      </section>

      <section>
        <H2>4. How We Use Your Information</H2>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
          <li>Provide, maintain, and operate the Service (including user authentication and account management).</li>
          <li>Process payments and prevent fraud (handled by Stripe).</li>
          <li>Enforce Terms of Service, prevent abuse, and maintain security.</li>
          <li>Provide customer support and respond to user inquiries.</li>
          <li>Improve and develop features, analytics, and marketing.</li>
        </ul>
        <P>
          We do not use your content for external AI model training unless we explicitly notify you
          and obtain consent.
        </P>
      </section>

      <section>
        <H2>5. Legal Bases for Processing (EU/EEA)</H2>
        <P>
          For users in the EU/EEA, we rely on legal bases including consent, contract performance,
          legitimate interests, and legal compliance.
        </P>
      </section>

      <section>
        <H2>6. Sharing & Disclosure</H2>
        <P>We may share personal data with trusted vendors who help operate the Service:</P>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
          <li>Clerk — authentication & user management.</li>
          <li>Stripe — payment processing and billing.</li>
          <li>Supabase — data and file storage.</li>
          <li>Vercel — hosting and edge functions.</li>
        </ul>
        <P>
          We also share information when required by law, or during business transfers such as
          mergers or acquisitions.
        </P>
      </section>

      <section>
        <H2>7. Cookies, Analytics & Third Party Tracking</H2>
        <P>
          We and our third-party partners use cookies to operate the Service, maintain sessions, and
          analyze usage. Analytics and marketing cookies are optional and require your consent where
          required by law.
        </P>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
          <li>
            <strong>Strictly necessary cookies:</strong> Essential for core functionality (e.g.,
            authentication via Clerk).
          </li>
          <li>
            <strong>Analytics cookies:</strong> Measure usage and help improve performance (e.g.,
            Google Analytics 4).
          </li>
          <li>
            <strong>Marketing cookies:</strong> Measure ad effectiveness (e.g., Meta Pixel), enabled
            only with consent.
          </li>
        </ul>
      </section>

      <section>
        <H2>8. Data Retention & Deletion</H2>
        <P>
          We retain data as long as necessary to provide the Service and meet legal obligations. You
          may request account deletion via{" "}
          <LinkText href="mailto:support@kalowrite.com">support@kalowrite.com</LinkText>.
        </P>
      </section>

      <section>
        <H2>9. Security</H2>
        <P>
          We implement commercially reasonable security measures and rely on providers (Stripe,
          Clerk, Supabase, Vercel) with strong protections. No system is 100% secure.
        </P>
      </section>

      <section>
        <H2>10. International Transfers</H2>
        <P>
          We may transfer data to countries outside your residence and rely on EU Standard
          Contractual Clauses and DPAs for safeguards.
        </P>
      </section>

      <section>
        <H2>11. Your Rights</H2>
        <P>
          Depending on your jurisdiction, you may have rights to access, delete, correct, or port
          your data. EU and California residents have additional rights under GDPR and CCPA/CPRA.
        </P>
      </section>

      <section>
        <H2>12. Children</H2>
        <P>
          The Service is not intended for children under 13. We do not knowingly collect data from
          minors without parental consent. Parents can contact us for review or deletion requests.
        </P>
      </section>

      <section>
        <H2>13. Changes to This Policy</H2>
        <P>
          We may update this Privacy Policy. Changes will be posted with a new “Last updated” date,
          and users will be notified when required by law.
        </P>
      </section>

      <section>
        <H2>14. Contact</H2>
        <P>
          Questions or concerns? Contact{" "}
          <LinkText href="mailto:support@kalowrite.com">support@kalowrite.com</LinkText>
        </P>
      </section>
    </main>
  );
}
