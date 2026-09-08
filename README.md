# MediSync — Patient Portal

MediSync is a Next.js healthcare administration platform for coordinating patient requests, healthcare documents, specialist review, hospital matching, referrals, appointments, notifications, and audit activity through AI-assisted, human-in-the-loop workflows.

## Current implementation

| Piece | Status | Notes |
|---|---|---|
| Patient dashboard, request form, request timeline UI | ✅ Implemented | Real React/Next.js pages |
| `/api/requests` | ✅ Implemented | Uses the MediSync store layer |
| `/api/requests/[id]` | ✅ Implemented | Request status and audit information |
| Audit log per request | ✅ Implemented | Stored with the request in the current demo store |
| Data layer (`lib/store.ts`) | 🟢 AWS-free | In-memory persistence for the current demo |
| `/api/webhooks/sns` | ✅ Implemented | Receives SNS Workbench callbacks |
| SNS Workbench integration | ✅ Verified | Specialist approval callback returns HTTP 200 |
| Authentication | 🟢 AWS-free | Signed MediSync session cookie with role-based routing |
| Document upload, Appointments pages | 🔵 Planned | To be connected to the corresponding workflows |

## Running it

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## Authentication

MediSync uses its own signed session cookie for the current demo. The login page provides Patient, Hospital, and Insurance Agent workspaces and routes each role to its corresponding dashboard.

Required environment variables:

```env
NEXT_PUBLIC_APP_URL=https://medisync-os.vercel.app
MEDISYNC_SESSION_SECRET=replace-with-a-long-random-secret
MEDISYNC_WEBHOOK_SECRET=replace-with-your-webhook-secret
```

## SNS Workbench callback

The application exposes:

`POST /api/webhooks/sns`

The endpoint validates `X-MediSync-Webhook-Secret` and supports workflow stages including request creation, classification, specialist review, hospital matching, referral, and appointment updates.

## Data layer

`lib/store.ts` provides the application persistence interface:

- `getRequest`
- `putRequest`
- `listRequestsForPatient`
- `createRequest`
- `appendAudit`
- `listAuditForRequest`

The current implementation is intentionally AWS-free and in-memory for demonstration and integration testing. A persistent PostgreSQL/Supabase-backed implementation can be added later without changing the API routes because the routes depend on the store interface.

## AI safety

AI is used for classification, organization, summarization, routing, and recommendations. It does not diagnose, prescribe, or make autonomous clinical decisions. Authorized human users retain final decision-making control.

## Next vertical slices

1. Patient request submission and classification workflow.
2. Specialist review queue and approval/rejection actions.
3. Hospital referral and intake workflow.
4. Insurance documentation and authorization workflow.
5. Appointment coordination and notifications.
6. Admin dashboard and audit analytics.
7. Replace the demo in-memory store with a persistent non-AWS database when required.
