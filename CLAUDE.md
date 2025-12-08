# Legal Diary - AI Assistant Context File

**Last Updated:** December 7, 2025

## Project Overview

**Legal Diary** is a full-stack case management system designed for law firms and legal practitioners. It serves as a **Legal Referencer** - a daily task management tool that helps advocates track court hearings, manage cases, and maintain their legal practice.

### Tech Stack
- **Frontend:** Next.js 16.0.3 (App Router) with React 19.2
- **UI Library:** Ant Design 5.28
- **Backend:** Next.js API routes
- **Database:** PostgreSQL with Prisma ORM
- **AI Integration:** OpenAI GPT-4o for case analysis
- **Authentication:** JWT with session-based token management
- **Styling:** CSS Variables + Responsive vh/vw units

### Repository
- **GitHub:** https://github.com/siddharth654321/legal_diary
- **Local Path:** `C:\coding\Legal Diary\legal-diary`

---

## Application Architecture

### File Structure
```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts       # JWT login with rate limiting
│   │   │   ├── register/route.ts    # User + Firm registration
│   │   │   └── logout/route.ts      # Session invalidation
│   │   ├── cases/
│   │   │   ├── route.ts             # GET all, POST new case
│   │   │   └── [id]/
│   │   │       ├── route.ts         # GET, PUT, DELETE case
│   │   │       ├── upload/route.ts  # Document upload
│   │   │       └── ai/
│   │   │           ├── analyze-documents/route.ts
│   │   │           ├── custom-analysis/route.ts
│   │   │           └── reanalyze/route.ts
│   │   ├── dashboard/
│   │   │   └── today/route.ts       # Today's hearings for legal referencer
│   │   ├── hearings/
│   │   │   ├── route.ts             # GET all, POST new hearing
│   │   │   └── [id]/route.ts        # GET, PUT, DELETE hearing
│   │   └── firms/route.ts           # Firm management
│   ├── dashboard/page.tsx           # Legal Referencer dashboard
│   ├── cases/
│   │   ├── page.tsx                 # Cases list with filters
│   │   ├── create/page.tsx          # New case form
│   │   └── [id]/page.tsx            # Case details + AI analysis
│   ├── calendar/page.tsx            # Hearing calendar view
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── layout.tsx                   # Root layout with AuthProvider
├── components/
│   ├── Layout/DashboardLayout.tsx   # Main app layout (sidebar + header)
│   ├── ProtectedRoute.tsx           # Route guard component
│   ├── HearingCalendar/             # Calendar component
│   └── Cases/AIAnalysisTab.tsx      # AI analysis UI
├── context/
│   └── AuthContext.tsx              # Auth state with token management
├── lib/
│   ├── prisma.ts                    # Prisma client singleton
│   ├── auth.ts                      # Password hashing, token generation
│   ├── middleware.ts                # Token verification
│   ├── openai.ts                    # OpenAI GPT-4o integration
│   ├── rateLimit.ts                 # Login attempt rate limiting
│   └── fileProcessor.ts             # Document parsing
└── generated/prisma/                # Prisma generated client
```

---

## Database Schema (Prisma)

### Core Models

#### User
```prisma
model User {
  id, email, name, password, firmId, role (ADVOCATE|ADMIN|SUPPORT_STAFF)
  - Can own a firm (ownedFirm) or be a member (firmMember)
  - Creates cases and has sessions
}
```

#### Firm
```prisma
model Firm {
  id, name, address, phone, email, ownerId
  - Has one owner and multiple members
  - All cases belong to a firm
}
```

#### Case
```prisma
model Case {
  id, caseNumber (unique), caseTitle, clientName, clientEmail, clientPhone
  description, status, priority, opponents, courtName, judgeAssigned
  - Has many hearings, fileDocuments
  - Has one aiSummary
}
```

#### Hearing
```prisma
model Hearing {
  id, caseId, hearingDate, hearingTime, hearingType, courtRoom, notes, status
  - Types: ARGUMENTS, EVIDENCE_RECORDING, FINAL_HEARING, INTERIM_HEARING, JUDGMENT_DELIVERY, PRE_HEARING, OTHER
  - Status: SCHEDULED, POSTPONED, COMPLETED, CANCELLED
}
```

#### AISummary
```prisma
model AISummary {
  id, caseId (unique), summary, keyPoints (JSON), insights
  - Stores AI-generated case analysis
}
```

### Enums
- **CaseStatus:** ACTIVE, PENDING_JUDGMENT, CONCLUDED, APPEAL, DISMISSED
- **Priority:** LOW, MEDIUM, HIGH, URGENT
- **HearingType:** ARGUMENTS, EVIDENCE_RECORDING, FINAL_HEARING, etc.
- **HearingStatus:** SCHEDULED, POSTPONED, COMPLETED, CANCELLED

---

## Key Features

### 1. Legal Referencer Dashboard (`/dashboard`)
The main dashboard redesigned as a **Legal Referencer** showing:
- **Today's date** prominently displayed
- **Today's Schedule table** with columns:
  - Previous Date | Case Number | Party Name | Position/Stage | Next Date | Court | Notes
- **Hearing Management section** below to add/edit upcoming hearings
- Quick stats showing total matters for today

### 2. Case Management (`/cases`, `/cases/[id]`)
- Create, view, edit, delete cases
- Upload documents (PDF, Word, etc.)
- Filter by status, priority, search by case number/client
- Tabbed interface: Overview, Hearings, Documents, AI Analysis

### 3. AI Analysis (OpenAI GPT-4o)
- **Case Re-analysis:** Generate summary, key points, insights from case data + documents
- **Document Analysis:** Analyze selected documents for key findings, risks, recommendations
- **Custom Analysis:** Ask custom questions about the case with AI

### 4. Hearing Calendar (`/calendar`)
- Interactive calendar showing all scheduled hearings
- Click date to schedule new hearing
- View hearing details in modal
- Color-coded by hearing type

### 5. Authentication
- JWT token-based authentication (7-day expiry)
- Rate limiting on login (5 attempts per 15 minutes)
- Mandatory firm association during registration
- Token expiry checking with auto-logout

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user with firm |
| POST | `/api/auth/login` | Login and get JWT token |
| POST | `/api/auth/logout` | Invalidate session |

### Cases
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cases` | List all cases for firm |
| POST | `/api/cases` | Create new case |
| GET | `/api/cases/[id]` | Get case details |
| PUT | `/api/cases/[id]` | Update case |
| DELETE | `/api/cases/[id]` | Delete case |
| POST | `/api/cases/[id]/upload` | Upload documents |

### AI Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cases/[id]/ai/reanalyze` | Re-analyze case with AI |
| POST | `/api/cases/[id]/ai/analyze-documents` | Analyze specific documents |
| POST | `/api/cases/[id]/ai/custom-analysis` | Custom AI query |

### Hearings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hearings` | List all hearings |
| POST | `/api/hearings` | Create new hearing |
| GET | `/api/hearings/[id]` | Get hearing details |
| PUT | `/api/hearings/[id]` | Update hearing |
| DELETE | `/api/hearings/[id]` | Delete hearing |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/today` | Get today's hearings with prev/next dates |

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://legal_user:LegalDiary@123@localhost:5432/legal_diary"

# OpenAI
OPENAI_API_KEY=sk-proj-...

# NextAuth (for future use)
NEXTAUTH_SECRET=your_secret_key_here
NEXTAUTH_URL=http://localhost:3000

# File Upload
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
UPLOAD_DIR=public/uploads
```

**For Vercel Deployment:**
- Set `DATABASE_URL` to your production PostgreSQL connection string
- Set `OPENAI_API_KEY` with a valid production key
- Update `NEXTAUTH_URL` to your Vercel domain

---

## Design Guidelines

### Theme: Minimalistic Lawyer
- **Primary Color:** Navy (#1a3a52) - Trust, Authority
- **Secondary:** Charcoal (#5a5a5a) - Professionalism
- **Accent:** Gold (#d4af37) - Prestige
- **Background:** White (#ffffff) and Light Gray-Blue (#f5f7fa)
- **No gradients** - Clean, professional aesthetic

### Responsive Design
- All units use `vh`, `vw`, `rem` (not `px`)
- Typography uses `clamp()` for fluid scaling
- Mobile-first with progressive enhancement
- Desktop sidebar hidden on mobile, replaced with drawer

---

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run Prisma migrations
npx prisma migrate dev

# Open Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma client
npx prisma generate
```

---

## Recent Changes (December 2025)

### Dashboard Redesign as Legal Referencer
1. **New Dashboard Layout:**
   - Today's date prominently displayed with "Legal Referencer" label
   - Daily tasks table showing today's hearings
   - Columns: Previous Date, Case Number, Party Name, Position/Stage, Next Date, Court, Notes

2. **Hearing Management Section:**
   - Added below the dashboard
   - Table showing upcoming 10 hearings
   - Add new hearing button with modal form
   - Edit/Delete actions for each hearing

3. **New API Endpoints:**
   - `GET /api/dashboard/today` - Fetches today's hearings with previous/next dates calculated
   - `PUT /api/hearings/[id]` - Update hearing details
   - `DELETE /api/hearings/[id]` - Remove hearing

---

## Key Code Patterns

### Authentication Flow
```typescript
// All API routes verify token:
const token = request.headers.get('authorization')?.replace('Bearer ', '');
const user = await verifyToken(token);
if (!user || !user.firmId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Protected Routes (Client)
```tsx
<ProtectedRoute>
  <DashboardLayout>
    {/* Page content */}
  </DashboardLayout>
</ProtectedRoute>
```

### Firm-Scoped Data
All case and hearing queries are scoped to the user's firm:
```typescript
await prisma.case.findMany({
  where: { firmId: user.firmId }
});
```

---

## Known Issues / Notes

1. **OpenAI API Key:** The API key in the global CLAUDE.md may be invalid - update `.env` with a valid key
2. **Local Database:** Uses PostgreSQL on localhost:5432 - ensure it's running
3. **Source Maps Warning:** Some warnings about invalid source maps during dev - can be ignored

---

## Contact

**Repository Owner:** Siddharth
**GitHub:** https://github.com/siddharth654321/legal_diary
