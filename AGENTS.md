# AGENTS.md — Codex Operating Manual (legal_diary)

This file defines how Codex agents should understand, modify, and review this repository.
It is optimized for:
- Full repo comprehension (file-by-file) and end-to-end flow mapping
- High-impact performance + scalability improvements
- Security hardening (legal/PII sensitive system)
- Multi-agent “competing teams” workflows (A vs B) + cross-review + synthesis

---

## 0) Non-negotiables (Security & Privacy First)

**This is a legal practice management + AI system. Treat ALL user/case data as sensitive.**

- NEVER commit secrets, API keys, tokens, `.env*` files, or credentials.
- NEVER log PII or sensitive legal content (case notes, document text, user queries, client names, phone/email, etc.).
- Any feature that touches auth, access control, documents, or AI calls must include explicit authorization checks.
- Prefer defensive defaults: deny-by-default authorization, strict input validation, safe error messages.

### Known critical issue (must be handled if encountered)
- If you find any exposed API key or secret in repo history or code, stop feature work and prioritize:
  1) rotate key
  2) remove secret from git history (or document the exact remediation steps)
  3) ensure `.env.local` / secrets are ignored and not referenced in committed files

---

## 1) Project snapshot (from README / docs)

Tech stack expectations:
- Frontend: Next.js (App Router likely), React, TypeScript, Ant Design
- Backend: Next.js API routes / route handlers + server-side logic
- DB: PostgreSQL + Prisma ORM
- Auth: NextAuth (env vars include `NEXTAUTH_SECRET`, `NEXTAUTH_URL`)
- AI: LLM provider calls for “AI Insights”

**Repo has extensive documentation** (read before changes):
- `README.md`
- `.claude/context.md` (session context + critical issues)
- `PROJECT_DOCUMENTATION.md`
- `FIXES_CHECKLIST.md`
- `TECHNICAL_DOCUMENTATION.md` / `.pdf`

---

## 2) Local setup & standard commands

Use npm (repo contains `package-lock.json`).

### Install
```bash
npm install
