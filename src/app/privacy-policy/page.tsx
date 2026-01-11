import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Legal Diary",
  description: "Privacy policy for Legal Diary, including Google OAuth and Calendar data usage.",
};

export default function PrivacyPolicyPage() {
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
          <Link href="/" style={{
            display: "inline-block",
            marginBottom: "16px",
            color: "#1a3a52",
            textDecoration: "none",
            fontSize: "0.9rem",
            fontWeight: 500,
          }}>
            ← Back to Home
          </Link>
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
            Privacy Policy
          </h1>
          <p style={{ color: "#666666", fontSize: "0.95rem" }}>
            Effective date: January 4, 2026
          </p>
        </header>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>Overview</h2>
          <p>
            Legal Diary is a legal practice management system. This policy explains what
            data we collect, how we use it, and how we handle Google OAuth and Google
            Calendar access for account sign-in and hearing sync.
          </p>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
            Data We Collect
          </h2>
          <ul style={{ paddingLeft: "18px", lineHeight: 1.7 }}>
            <li>
              Account details: name, email, firm information, and login credentials
              (passwords are hashed).
            </li>
            <li>
              Case data: case numbers, titles, client names, hearing schedules, notes,
              and uploaded documents (if you add them).
            </li>
            <li>
              Authentication data: session tokens and related security metadata.
            </li>
            <li>
              Google OAuth data (if you connect Google): Google account identifier, email,
              name, profile photo URL, and OAuth tokens.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
            Google APIs We Use
          </h2>
          <p>
            Legal Diary uses Google APIs only to enable Google sign-in and calendar
            synchronization:
          </p>
          <ul style={{ paddingLeft: "18px", lineHeight: 1.7 }}>
            <li>
              Google OAuth 2.0 / OpenID Connect for sign-in (scopes: openid, email, profile).
            </li>
            <li>
              Google OAuth2 Userinfo API to retrieve your basic profile and email.
            </li>
            <li>
              Google Calendar API (v3) to create, update, and delete hearing events in
              your calendar (scope: https://www.googleapis.com/auth/calendar).
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
            How We Use Google Data
          </h2>
          <ul style={{ paddingLeft: "18px", lineHeight: 1.7 }}>
            <li>
              Sign-in: we use your Google email, name, and Google ID to create or link
              your Legal Diary account.
            </li>
            <li>
              Calendar sync: we send hearing details to Google Calendar on your behalf.
              Event data may include case number, case title, client name, hearing date/time,
              hearing type, court room, and notes you enter.
            </li>
            <li>
              Token management: we store encrypted OAuth access and refresh tokens so we
              can keep your calendar in sync until you disconnect.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
            How We Share Data
          </h2>
          <p>
            We do not sell your data. We only share data with Google when you enable
            Google sign-in or calendar sync, and only for the purposes described above.
          </p>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
            Data Retention and Your Choices
          </h2>
          <ul style={{ paddingLeft: "18px", lineHeight: 1.7 }}>
            <li>
              You can disconnect Google Calendar at any time in Settings, which revokes
              tokens and stops sync.
            </li>
            <li>
              You can revoke Legal Diary access in your Google Account at
              myaccount.google.com/permissions.
            </li>
            <li>
              Calendar events are stored in your Google Calendar until you delete them.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
            Security
          </h2>
          <p>
            We use encryption for stored OAuth tokens and protect data with access
            controls, authentication, and secure transport (HTTPS).
          </p>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
            Google API Services User Data Policy
          </h2>
          <p>
            Legal Diary&apos;s use and transfer of information received from Google APIs
            adheres to the Google API Services User Data Policy, including the Limited
            Use requirements.
          </p>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
            Contact
          </h2>
          <p>
            For privacy questions, contact your Legal Diary administrator or email
            siddharthrj4444@gmail.com.
          </p>
        </section>
      </div>
    </main>
  );
}
