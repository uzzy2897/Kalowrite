import React from "react";

export const metadata = {
  title: "Ethical Usage & Acceptable Use Policy | KaloWrite",
  description:
    "Learn about KaloWrite’s ethical usage and acceptable use policy — permitted uses, prohibited activities, enforcement, and reporting procedures.",
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
export default function EthicalUsePage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-16">
      <H1>Ethical Usage & Acceptable Use Policy</H1>
      <p className="text-start text-sm text-muted-foreground mb-10">
        Effective date: <strong>5th Oct, 2025</strong> <br />
        Last updated: <strong>5th Oct, 2025</strong>
      </p>

      <section>
        <H2>What this page is</H2>
        <P>
          <strong>KaloWrite</strong> is an AI-powered tool that helps users improve clarity, tone,
          and readability of text. This page explains permitted and prohibited uses and describes
          how we handle reports of misuse. This Policy supplements our{" "}
          <LinkText href="/terms">Terms of Service</LinkText> and{" "}
          <LinkText href="/privacy">Privacy Policy</LinkText>.
        </P>
      </section>

      <section>
        <H2>Important — no proactive monitoring</H2>
        <P>
          KaloWrite does not proactively review, read, or moderate user-submitted content for
          compliance with this Policy. We respect user privacy and operate on a{" "}
          <strong>reactive basis</strong>: we review content only if:
        </P>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
          <li>You or another user reports potential misuse via our abuse channel,</li>
          <li>We are required to by law or valid legal request, or</li>
          <li>Automated systems trigger an alert (if you enable such features).</li>
        </ul>
      </section>

      <section>
        <H2>Permitted uses (examples)</H2>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
          <li>Improving grammar, tone, and clarity of your original writing.</li>
          <li>Refining business communications, personal notes, blog drafts, or creative writing.</li>
          <li>Any lawful use where you have the right to the source material.</li>
        </ul>
      </section>

      <section>
        <H2>Prohibited uses (examples)</H2>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
          <li>
            Using KaloWrite to produce content intended to commit illegal acts, defraud, or
            materially harm others.
          </li>
          <li>
            Impersonating individuals, producing phishing or deceptive content, or facilitating
            academic cheating where prohibited.
          </li>
          <li>
            Uploading or processing highly sensitive personal data of others without lawful basis or
            consent.
          </li>
        </ul>
      </section>

      <section>
        <H2>How enforcement works (reactive)</H2>
        <P>
          <strong>Reports:</strong> When someone reports potential misuse, we:
        </P>
        <ul className="list-decimal pl-6 space-y-1 text-gray-700 dark:text-gray-300">
          <li>Acknowledge receipt of the report.</li>
          <li>Review relevant content, logs, or context.</li>
          <li>Take appropriate action if we find a material violation.</li>
        </ul>

        <P>
          <strong>Law & legal requests:</strong> We comply with valid legal requests such as
          subpoenas or court orders and disclose information only as required by law.
        </P>
        <P>
          <strong>Automated alerts:</strong> Automated systems may flag suspicious activity but are
          used only to prioritize human review, never as final enforcement.
        </P>
      </section>

      <section>
        <H2>Possible actions</H2>
        <P>
          Depending on findings, we may issue warnings, temporarily restrict features, suspend or
          terminate accounts, remove offending content, or cooperate with authorities. Actions are
          taken only after human review consistent with this Policy and our{" "}
          <LinkText href="/privacy">Privacy Policy</LinkText>.
        </P>
      </section>

      <section>
        <H2>How to report abuse</H2>
        <P>
          To report suspected misuse, email{" "}
          <LinkText href="mailto:abuse@kalowrite.com">abuse@kalowrite.com</LinkText> with:
        </P>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
          <li>The account or email involved (if known)</li>
          <li>A short description of the issue</li>
          <li>Relevant URLs or screenshots</li>
          <li>Your contact details</li>
        </ul>
        <P>
          We will acknowledge receipt and aim to respond within 7 business days. If the report
          involves imminent harm, contact local authorities first, then notify us.
        </P>
      </section>

      <section>
        <H2>Appeals</H2>
        <P>
          If action is taken against your account and you believe it was a mistake, reply to the
          enforcement notice or email{" "}
          <LinkText href="mailto:legal@kalowrite.com">legal@kalowrite.com</LinkText> with your
          appeal. We will review and respond within a reasonable timeframe.
        </P>
      </section>

      <section>
        <H2>Privacy note</H2>
        <P>
          Any content reviewed during an investigation is processed in accordance with our{" "}
          <LinkText href="/privacy">Privacy Policy</LinkText>. KaloWrite does not use reviewed user
          content for model training without explicit consent.
        </P>
      </section>

      <section>
        <H2>Changes</H2>
        <P>
          We may update this Policy periodically. Material updates will be posted here with a new
          “Last updated” date.
        </P>
      </section>
    </main>
  );
}
