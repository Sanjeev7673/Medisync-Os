# MediSync — Patient Portal (Vertical Slice 1)

This is a real, running Next.js application — not a mockup. It implements
the **Patient Portal + backend API layer** vertical slice: submit a
request, see it move through the lifecycle, view hospital recommendations,
referral, and appointment status. It is the foundation the Specialist,
Hospital, and Admin portals attach to next.

## What's actually real vs. stubbed

| Piece | Status | Notes |
|---|---|---|
| Patient dashboard, request form, request timeline UI | ✅ Implemented | Real React/Next.js pages, fully working |
| `/api/requests` (POST create, GET list) | ✅ Implemented | Against the stand-in store in `lib/store.ts` |
| `/api/requests/[id]` (GET, target output schema) | ✅ Implemented | Matches the brief's Section 40 schema |
| Audit log per request | ✅ Implemented | `lib/store.ts` — visible in the API response |
| Data layer (`lib/store.ts`) | 🟡 Stand-in | In-memory, shaped exactly like the DynamoDB model so swapping it out doesn't change any API route |
| `/api/webhooks/sns` | ⚠️ Requires verification | Designed to receive callbacks from SNS Workbench, but **the actual outbound mechanism SNS Workbench uses to call an external URL has not been confirmed** — do not wire a live Workbench node to this until you've checked (see below) |
| `/api/dev/simulate` | 🔵 Dev-only | Advances a request through the lifecycle so the UI can be built/demoed without a live SNS connection. Delete this route once the real webhook is receiving traffic. |
| Login page | 🔴 Not wired | UI only — no Cognito integration yet. Signs everyone in as demo patient `P1001`. |
| Document upload, Appointments pages | 🔵 Planned | Placeholder pages, not yet connected to the Document or Appointment workflows |

## Running it

```bash
npm install
npm run dev
```
Visit `http://localhost:3000` — it redirects to `/login`, then `/dashboard`
after "signing in." A seeded request (`REQ-1001`) is preloaded so the
dashboard isn't empty on first load.

On the request detail page, use **"Advance workflow (dev)"** to step
through classification → specialist approval → hospital match → referral →
appointment, since the real SNS connection isn't wired yet.

## What you need to verify inside SNS Workbench before going further

These are the two blocking unknowns from the architecture discussion —
nothing in this codebase can resolve them for you:

1. **Inbound trigger**: your canvas currently starts with a
   `manual-trigger`. Production needs Workbench to receive a request from
   this app's backend. Check the trigger node category for a real inbound
   webhook/HTTP trigger node, and note its exact URL format and expected
   payload shape.
2. **Outbound callback**: for Workbench to tell this app "classification
   is done" / "specialist approved" / etc., some node in your workflow
   needs to call an external URL (`/api/webhooks/sns` here). Check whether
   the "Custom API Call" node (seen under your GitHub tooling) works
   generically for any HTTPS endpoint, or is scoped to GitHub's API only.

Once both are confirmed, wire:
- Your workflow's entry point → calls this app's `POST /api/requests`... 

  **or**, more likely given your existing canvas, this app calls **into**
  Workbench (uncomment the fetch call in `app/api/requests/route.ts`), and
  Workbench calls back **out** to `/api/webhooks/sns` at each stage
  (classification, specialist_review, hospital_matching, referral,
  appointment) using the payload shapes documented in that file.

## Swapping the stand-in database for real DynamoDB

Everything in `lib/store.ts` is written as small async functions
(`getRequest`, `putRequest`, `listRequestsForPatient`, `createRequest`,
`appendAudit`, `listAuditForRequest`). To go live:

1. `npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb`
2. Create a `Request` table (partition key `request_id`) and an
   `AuditLog` table (partition key `audit_id`, GSI on `request_id`).
3. Replace the body of each function in `lib/store.ts` with the
   equivalent `DynamoDBDocumentClient` call. **No other file needs to
   change** — every API route only imports from `lib/store.ts`.

## Environment variables (placeholders — do not ask the user for real values)

```
APP_BASE_URL=YOUR_APP_BASE_URL
SNS_WORKFLOW_WEBHOOK_URL=YOUR_SNS_WORKFLOW_INBOUND_URL
AWS_REGION=YOUR_AWS_REGION
DYNAMODB_REQUEST_TABLE=YOUR_REQUEST_TABLE_NAME
DYNAMODB_AUDIT_TABLE=YOUR_AUDIT_TABLE_NAME
COGNITO_USER_POOL_ID=YOUR_COGNITO_USER_POOL_ID
COGNITO_CLIENT_ID=YOUR_COGNITO_CLIENT_ID
```

## Next vertical slices (in build order)

1. Fix the IF Condition in SNS Workbench (manual step, inside Workbench — not code).
2. Verify inbound trigger + outbound callback mechanisms (see above).
3. Wire real DynamoDB per the swap guide above; remove `/api/dev/simulate`.
4. Specialist Portal: a review queue page + approve/reject actions that
   POST to a new `/api/requests/[id]/review` endpoint.
5. Hospital Portal: referral inbox reading the same `Request` table,
   filtered by `hospital_id`.
6. Cognito auth, replacing the hardcoded `P1001` / login stub.
7. Admin dashboard, aggregating counts across the `Request` table.

Each slice follows the same pattern as this one: real UI, real API routes,
data layer shaped for DynamoDB from day one, and every unverified external
piece explicitly flagged rather than assumed.
