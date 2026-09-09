# MediSync — Patient Portal

MediSync is a Next.js healthcare administration platform for coordinating patient requests, healthcare documents, specialist review, hospital matching, referrals, appointments, notifications, and audit activity through AI-assisted, human-in-the-loop workflows.

## Current implementation

| Piece | Status | Notes |
|---|---|---|
| Patient dashboard, request form, request timeline UI | ✅ Implemented | Real React/Next.js pages |
| Verified patient onboarding | ✅ Implemented | Email OTP + care-need intake before account activation |
| `/api/requests` | ✅ Implemented | Supabase-backed request repository |
| `/api/requests/[id]` | ✅ Implemented | Request status and audit information |
| Audit log per request | ✅ Implemented | Stored in Supabase |
| Supabase data layer | ✅ Implemented | PostgreSQL-backed application repository |
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

## Authentication and registration

Patient self-registration follows this flow:

1. Enter name, email, and password.
2. Receive a 6-digit email OTP.
3. Verify the OTP.
4. Describe the patient's care need or administrative request.
5. MediSync creates the first patient request and triggers the SNS Workbench workflow.
6. The patient is redirected to the dashboard.

Required environment variables:

```env
NEXT_PUBLIC_APP_URL=https://medisync-os.vercel.app
MEDISYNC_SESSION_SECRET=replace-with-a-long-random-secret
MEDISYNC_WEBHOOK_SECRET=replace-with-your-webhook-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=replace-with-server-only-secret-key
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=MediSync <onboarding@your-verified-domain.com>
```

## SNS Workbench callback

The application exposes:

`POST /api/webhooks/sns`

The endpoint validates `X-MediSync-Webhook-Secret` and supports workflow stages including request creation, classification, specialist review, hospital matching, referral, and appointment updates.

## AI safety

AI is used for classification, organization, summarization, routing, and recommendations. It does not diagnose, prescribe, or make autonomous clinical decisions. Authorized human users retain final decision-making control.

## Next vertical slices

1. Patient request submission and classification workflow.
2. Specialist review queue and approval/rejection actions.
3. Hospital referral and intake workflow.
4. Insurance documentation and authorization workflow.
5. Appointment coordination and notifications.
6. Admin dashboard and audit analytics.
