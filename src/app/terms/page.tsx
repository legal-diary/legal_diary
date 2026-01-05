import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Legal Diary",
  description: "Terms of service for Legal Diary.",
};

export default function TermsOfServicePage() {
  return (
    <main style={{
      minHeight: "100dvh",
      background: "linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%)",
      padding: "clamp(20px, 4vw, 48px)",
      color: "#1a1a1a",
    }}>
      <div style={{
        maxWidth: "920px",
        margin: "0 auto",
        background: "#ffffff",
        border: "1px solid #ededed",
        borderRadius: "12px",
        padding: "clamp(20px, 4vw, 40px)",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
      }}>
        <header style={{ marginBottom: "24px" }}>
          <p style={{
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontSize: "0.75rem",
            color: "#666666",
            marginBottom: "8px",
          }}>
            Legal Diary
          </p>
          <h1 style={{
            fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
            fontWeight: 800,
            marginBottom: "8px",
          }}>
            Terms of Service
          </h1>
          <p style={{ color: "#666666", fontSize: "0.95rem" }}>
            Effective date: January 4, 2026
          </p>
        </header>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>Agreement</h2>
          <p>
            By accessing or using Legal Diary, you agree to these Terms of Service.
            If you do not agree, do not use the service.
          </p>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
            Intended Use
          </h2>
          <p>
            Legal Diary is a legal practice management system intended for authorized
            law firms and legal professionals. You are responsible for ensuring your
            use complies with applicable laws and professional obligations.
          </p>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
            Accounts and Security
          </h2>
          <ul style={{ paddingLeft: "18px", lineHeight: 1.7 }}>
            <li>You must provide accurate account information.</li>
            <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
            <li>You are responsible for activity that occurs under your account.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
            Data and Confidentiality
          </h2>
          <p>
            Legal Diary may store sensitive legal and client data you enter. You are
            responsible for ensuring you have the rights and permissions to store and
            process such data. Do not upload content you do not have permission to use.
          </p>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
            Acceptable Use
          </h2>
          <ul style={{ paddingLeft: "18px", lineHeight: 1.7 }}>
            <li>Do not use the service to violate laws or regulations.</li>
            <li>Do not attempt to access or probe other users&apos; data or accounts.</li>
            <li>Do not disrupt or interfere with system security or performance.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
            Third-Party Services
          </h2>
          <p>
            Legal Diary integrates with third-party services such as Google OAuth and
            Google Calendar. Your use of those services is subject to their terms and
            policies. We are not responsible for third-party services.
          </p>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
            Availability and Changes
          </h2>
          <p>
            We may modify, suspend, or discontinue the service at any time. We may
            update these terms from time to time; continued use means you accept the
            updated terms.
          </p>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
            Disclaimer
          </h2>
          <p>
            The service is provided &quot;as is&quot; without warranties of any kind. Legal
            Diary does not provide legal advice, and you are responsible for verifying
            all outputs and records.
          </p>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
            Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by law, Legal Diary is not liable for any
            indirect, incidental, special, consequential, or punitive damages arising
            from your use of the service.
          </p>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
            Contact
          </h2>
          <p>
            For questions about these terms, email siddharthrj4444@gmail.com.
          </p>
        </section>
      </div>
    </main>
  );
}
