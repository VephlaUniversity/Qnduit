# QNDUIT

QNDUIT connects Talent and Employers through public profiles, jobs, applications, messaging and subscription plans. Admins manage accounts, jobs, subscriptions and Support. This document describes the repository at the PR #56 merge (`bd53884`); verify behavior and deployment settings against the revision you run.

## Architecture and stack

The Vite frontend is a React 19 single-page application with React Router, Tailwind CSS, Axios and Radix UI components. The backend is an Express 5 API running on Node.js, using Mongoose and MongoDB. Authentication uses JWTs and bcrypt. Flutterwave handles the mounted payment flow; SendGrid sends email; Cloudinary stores uploaded media and authenticated message attachments. Leaflet/OpenStreetMap support map UI. The current deployment uses a cPanel-hosted frontend and Railway backend; deployment and external-service settings are managed separately from this repository.

The browser calls the Express API, which checks identity and role, reads or writes MongoDB, and calls providers for payments, email and media. Subscription activation and other multi-document workflows use MongoDB transactions. A transaction-capable replica set or sharded deployment is therefore needed for those workflows; a standalone MongoDB server is insufficient.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/App.jsx` | Frontend routes and dashboard entry points |
| `src/components/auth/` | Signup and sign-in interfaces |
| `src/components/{talentDashboard,employerDashboard,adminDashboard}/` | Role-specific interfaces |
| `src/components/pages/`, `profiles/`, `home/` | Public pages and profile components |
| `src/components/utils/` | API base, session, request and feature helpers |
| `public/` | Static assets |
| `backend/src/app.js`, `server.js` | API composition and process entry point |
| `backend/src/routes/`, `controllers/` | Mounted endpoints and request handling |
| `backend/src/models/`, `services/` | MongoDB models and business workflows |
| `backend/src/middleware/`, `utils/`, `config/` | Authorization, uploads, provider helpers and configuration |
| `backend/src/scripts/`, `backend/scripts/` | Operational scripts and packaging checks |

## Local setup

1. Install Node.js 22 (Node 22.14 was used in prior project validation), npm and a local MongoDB replica set. Use isolated test accounts and provider sandbox credentials.
2. From the repository root run `npm ci`; then run `cd backend && npm ci`.
3. Copy the root example to the backend: `cp .env.example backend/.env`. Set a local `MONGO_URI` and a strong `JWT_SECRET`; configure only the external services needed for your test. The backend loads `.env` from its working directory, so start it from `backend/`.
4. Create a private staging directory if testing attachments, for example `mkdir -p /tmp/qnduit-private-attachments && chmod 700 /tmp/qnduit-private-attachments`. Ensure it is outside the application and public directories and accessible by the backend user. Provision the required indexes separately as described below.
5. Run `cd backend && npm run dev` in one terminal. In another, from the root run `npm run dev`. The backend defaults to port 5000 and Vite normally uses 5173.
6. **Local browser integration needs configuration work:** `src/components/utils/api.js` hardcodes the deployed API base and `backend/src/app.js` only allows the QNDUIT production origins. A local frontend will otherwise call the live API or be blocked by CORS. For isolated testing, use a local-only configuration change or approved proxy that points to the local backend and permits the local origin; do not commit production credentials or accidentally exercise production accounts.

`npm run build` builds the frontend. `cd backend && npm run build` checks backend package/import integrity; it does not establish provider or database readiness. `npm run lint` runs frontend lint. The backend `npm test` script is a placeholder and intentionally fails; it is not an automated test suite.

**Secrets:** the example contains placeholders only. The existing `.gitignore` does not automatically exclude every `.env` file, so explicitly check `git status` before staging and never add local credentials. Create an Admin only in an isolated environment with the reviewed `backend/src/scripts/createAdmin.js` script and `ADMIN_*` values; do not use its credentials outside that environment.

## Configuration

`.env.example` lists names used by the source. Copy it to `backend/.env`, not the frontend. No real values belong in Git.

| Variables | Purpose / requirement |
| --- | --- |
| `MONGO_URI`, `JWT_SECRET` | Database connection and signing/verification of access tokens; required for normal operation. |
| `PORT`, `NODE_ENV` | HTTP port (default 5000) and runtime mode. |
| `FRONTEND_URL`, `BACKEND_URL` | URLs used in password-reset, job and payment callback flows; use environment-appropriate URLs. |
| `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `CONTACT_RECEIVER_EMAIL` | SendGrid credentials/sender and contact-message recipient. Required for the relevant email flows. |
| `FLW_SECRET_KEY`, `FLW_SECRET_HASH`, `FLW_TALENT_PUBLIC_PLAN_ID`, `FLW_EMPLOYER_BRONZE_PLAN_ID`, `FLW_EMPLOYER_SILVER_PLAN_ID`, `FLW_EMPLOYER_PLATINUM_PLAN_ID` | Flutterwave API, webhook verification and plan IDs for paid checkout. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary media and private attachment storage. |
| `MESSAGE_ATTACHMENTS_ENABLED`, `MESSAGE_ATTACHMENT_STORAGE`, `MESSAGE_ATTACHMENT_DIR` | Attachments require exactly `true`, `cloudinary`, and a private absolute staging path, plus provider and index readiness. Disabled by default. |
| `MESSAGE_UNREAD_SINCE` | Empty disables unread counts; otherwise use an exact ISO UTC timestamp such as `2026-10-27T00:00:00.000Z`. It sets the rollout cutoff. |
| `NOTIFICATION_CAPTURE_ENABLED`, `NOTIFICATION_DELIVERY_ENABLED` | Separate opt-in capture and delivery switches; enabled only with exact `true`. |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin creation script only. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Legacy Stripe code; do not assume the unmounted handlers are active payment integrations. |

Changing environment variables requires restarting/redeploying the backend process. Provider credentials being present does not prove that a provider operation works.

## Authentication and access

Talent and Employer register, verify their email and sign in through the respective signup endpoints and shared login; Admins use their own login. Password reset uses an emailed link. Protected API requests use `Authorization: Bearer <token>`; middleware verifies the account and role, and controllers apply ownership/status restrictions. Token expiration is 30 days for Talent/Employer and seven days for Admin. Suspended accounts have restricted access, including their own Support flow; deleted or invalid accounts cannot continue authenticated use. See `authMiddleware.js`, `accountAccess.js`, and route/controller checks for the exact policy.

Paid and verified/publication rules govern Talent public visibility. Employer messaging requires an eligible active Silver or Platinum subscription; Bronze and Free do not gain access. The free/ineligible Employer job limit counts stored jobs, including certain deleted records; eligible paid plans have different limits. Check the current policy and server response instead of trusting frontend visibility alone.

## Workflows and limitations

- **Talent:** manage profile/resume, gallery, education, experience and skills; discover jobs and Employers; save and apply to jobs; manage meetings, messages and Support. Public Talent routes expose an allowlisted profile only when publication eligibility is satisfied.
- **Employer:** manage company profile, post and manage Employer jobs, review Employer-job applications, follow/save Talent, schedule meetings, select plans and use eligible messaging.
- **Admin:** manage Talent and Employer accounts and Employer jobs; create/manage Admin jobs in a separate collection. Published Admin jobs enter the shared job discovery/application flow. Applications are stored separately; an Admin application review page and Admin application list/detail/count endpoints are not implemented in this revision. Job attribution uses the authenticated Admin ID.
- **Subscriptions:** Flutterwave callbacks/webhook use the shared activation lifecycle. After a successful transaction, a durable confirmation event is dispatched via SendGrid; provider acceptance is not proof of inbox delivery. Admin invoice preview/send uses linked subscription/payment records. Invoice amounts are stored checkout amounts and `paidAt` is application activation time, not necessarily provider settlement evidence. Cancellation removes application access; it does not by itself stop provider billing or refund. Downgrade is recorded as pending, not automatically applied.
- **Messages:** authenticated participants can send text and, when configured, attachments. Employer access is checked separately. Private downloads validate participant identity. Attachment processing also requires Cloudinary, secure staging and the declared unique Message index. Recovery is started by the backend process; validate storage durability and provider operations during deployment.
- **Support:** Talent/Employer tickets are scoped to their owner; Admins manage them. Older email-only tickets may need explicit ownership reconciliation. Notifications and unread counts have separate rollout switches.

## API reference

All paths below start with `/api`. `Public` means no route-level login; individual controllers may validate additional input. `T`, `E`, `A` mean authenticated Talent, Employer and Admin; `Auth` means authenticated with additional controller checks. Source, ownership, verification, subscription and rate-limit checks still apply. `:id` and other colon-prefixed fields are path parameters. Inspect the matching route and controller for the complete request validation and response shape.

| Method and path | Access | Purpose |
| --- | --- | --- |
| `POST /auth/login`, `/auth/forgot-password`, `/auth/reset-password/:token` | Public | Sign in and password reset |
| `GET /auth/session` | T/E | Current session identity/status |
| `POST /admin/auth/login` | Public | Admin sign-in |
| `PATCH /admin/auth/{talents,employers}/:id/verification` | A | Set verification |
| `POST /talents/register`, `/talents/verify` | Public | Talent signup and email verification |
| `POST /talents/resume`; `PUT /talents/:id/profile`, `/talents/:id/plan`, `/talents/update` | Auth; profile/plan T | Talent resume/profile/plan |
| `GET /talents/profile`, `/talents/search-by-email` | Auth; search E | Current profile / Employer search |
| `GET /talents/:id/dashboard`, `/talents/public`, `/talents/public/:username` | Public route | Dashboard data and eligible public profiles |
| `POST /employers/signup`, `/employers/verify` | Public | Employer signup / verification |
| `PUT /employers/update`; `GET /employers/profile`, `/employers/messaging-access`, `/employers/subscription`; `POST /employers/pay` | E | Profile, entitlement and checkout |
| `GET /employers/saved-candidates`; `POST`, `DELETE /employers/saved-candidates/:id` | E | Saved Talent |
| `POST /payments/create-checkout`; `GET /payments/subscription` | Auth | Talent checkout / subscription |
| `POST /payments/employer/create-checkout`, `/payments/employer/pay-later`; `GET /payments/employer/subscription` | Auth | Employer checkout, unpaid selection and subscription; controller validates role |
| `GET /payments/callback`, `/payments/employer/payment/callback`; `POST /payments/flutterwave/webhook` | Public provider entry | Verify provider callback/webhook; never treat unverified input as payment proof |
| `GET /jobs`, `/jobs/search`, `/jobs/suggest`, `/jobs/public/:id`, `/jobs/related/:id` | Public | Search and public job details |
| `POST /jobs/create`; `PUT /jobs/update/:id`; `DELETE /jobs/delete/:id`; `GET /jobs/my-jobs`, `/jobs/:id` | E | Employer-owned job management |
| `POST /jobs/:id/contact` | Auth | Contact Employer job poster, subject to limits |
| `POST /applications/apply`; `GET /applications/my-applications` | T | Apply and view own history; body includes `jobId` and source for Admin jobs |
| `GET /applications/job/:jobId`, `/applications/employer`; `PATCH /applications/:applicationId/archive`, `/applications/:applicationId/status` | E | Employer job applications only |
| `GET`, `POST /saved-jobs`; `POST /saved-jobs/remove-job` | Auth | Saved jobs; explicit source distinguishes Admin and Employer jobs |
| `POST /meetings/create`; `PUT /meetings/update/:id`; `GET /meetings/my-meetings`, `/meetings/:id`; `DELETE /meetings/delete/:id` | E | Employer meeting management |
| `GET /meetings/talent-meetings`; `DELETE /meetings/cancel/:id` | T | Talent meetings |
| `PUT`, `GET /resume` | Auth | Save or retrieve own resume |
| `POST /messages/send`, `/messages/heartbeat`, `/messages/presence`; `GET /messages`, `/messages/chats`, `/messages/search`, `/messages/unread`, `/messages/:messageId/attachments/:attachmentId`; `PATCH /messages/read` | T/E; Employer requires eligible plan | Messages, presence, unread acknowledgements and authorized attachments |
| `GET /follows/employers/search`, `/follows/employers/following`, `/follows/status/:employerId`; `POST`, `DELETE /follows/employers/:employerId` | T | Discover and follow Employers |
| `GET /follows/talents/followers`, `/follows/talents/following`; `POST`, `DELETE /follows/talents/:talentId` | E | Employer follow workflows |
| `POST /support/tickets`, `/support/tickets/:ticketId/replies`; `GET /support/tickets/mine` | T/E | Own Support tickets |
| `GET /support/admin/tickets`; `PATCH /support/admin/tickets/:ticketId/status`; `POST /support/admin/tickets/:ticketId/replies`; `DELETE /support/admin/tickets/:ticketId` | A | Support administration |
| `GET /profiles/:userType/:userId`, `/profiles/:userType/:userId/views`, `/profiles/:userType/:userId/views/summary`; `POST /profiles/:userType/:userId/views` | Verified T/E | Profiles and view tracking; ownership checks apply |
| `GET /notifications`; `POST /notifications/read-displayed`, `/notifications/:id/read` | T/E | Notifications when rollout is enabled |
| `PUT /gen/change-password`; `DELETE /gen/delete-account`; `GET /gen/search` | Auth | Account utilities |
| `GET /gen/stats`; `POST /contact` | Public | Public statistics and contact form |
| `GET /admin/dashboard`, `/admin/talents`, `/admin/talents/:id`, `/admin/employers`, `/admin/employers/:id` | A | Dashboard and account records |
| `PATCH /admin/{talents,employers}/:id/status`, `/admin/{talents,employers}/:id/verification`; `DELETE /admin/{talents,employers}/:id` | A | Account management |
| `GET /admin/jobs`, `/admin/jobs/:id`; `PATCH /admin/jobs/:id/flag`; `DELETE /admin/jobs/:id` | A | Manage Employer jobs |
| `GET`, `POST /admin/posted-jobs`; `GET`, `PATCH`, `DELETE /admin/posted-jobs/:source/:id`; `PATCH /admin/posted-jobs/:source/:id/status`, `/admin/posted-jobs/:source/:id/flag` | A | Separate Admin jobs; source identifies Admin job records |
| `GET /admin/subscriptions/stats`, `/admin/subscriptions`, `/admin/subscriptions/:type/:id`; `GET`, `POST /admin/subscriptions/:role/:accountId/{invoice-email,cancel,downgrade}` | A | Subscription records, previews and actions |

For example, a Talent applying to an Admin job sends `POST /api/applications/apply` with a bearer token and JSON `{"jobId":"<job-id>","source":"admin"}`. Successful creation returns an application object; invalid identity, source or eligibility is rejected. Error responses generally include a `message` and may include `success: false`; exact statuses and payloads vary by controller. Do not infer unrestricted access from an endpoint's name.

## Data and operational readiness

| Models | Main relationships and purpose |
| --- | --- |
| `Talent`, `Employer`, `Admin`, `Resume` | Account identity, role/status/verification, profiles and Talent resume data. |
| `Job`, `AdminJob` | Separate Employer and Admin job collections; Admin job `postedBy` references the authenticated Admin. |
| `JobApplication`, `AdminJobApplication`, `SavedJob` | Talent-to-job relationships. Admin applications carry source, job, applicant, posting Admin, status and timestamps; they do not include a profile snapshot. |
| `TalentPayment`, `EmployerPayment`, `TalentSubscription`, `EmployerSubscription` | Payment and plan records used to derive access and invoice evidence. |
| `SubscriptionLifecycle`, `SubscriptionCharge`, `SubscriptionCancellation`, `SubscriptionDowngrade` | Activation serialization and audit records. `SubscriptionConfirmation`, `SubscriptionEmailGate`, `SubscriptionEmailAttempt` track confirmation or invoice delivery. |
| `Message`, `MessagePresence`, `Notification` | Participant messages and attachments, presence and in-app notifications. |
| `SupportTicket`, `Follow`, `EmployerTalentFollow`, `Meeting`, `ProfileView` | Support ownership, follow relationships, meeting records and profile views. |

Indexes are part of operational setup, not just schema declarations. Several schemas explicitly disable automatic index/collection creation. Before rollout, inspect existing collections, data and indexes; arrange a reviewed migration, check duplicate keys and never blindly drop or synchronize production indexes. Notable requirements include:

- `Message`: unique partial `{ sender: 1, senderModel: 1, clientMessageId: 1 }` where `clientMessageId` has BSON type `string`, plus declared timeline and unread indexes.
- `AdminJob`: `{ isDeleted: 1, createdAt: -1, _id: -1 }`.
- `AdminJobApplication`: unique `{ jobId: 1, applicantId: 1 }` and `{ applicantId: 1, createdAt: -1 }`.
- `SubscriptionConfirmation`: `{ status: 1, nextAttemptAt: 1, _id: 1 }`; its `_id` is the event's unique key.
- `SupportTicket`, `Notification`, `ProfileView`, follow and application models declare additional access, uniqueness or reconciliation indexes. Review their schemas and operational requirements before enabling features.

Confirm collections and indexes exist before enabling dependent workflows. Recovery or readiness cannot be inferred from a successful server start. MongoDB transactions are required for subscription activation, Admin-job applications and other transactional paths. Test backups, configuration, provider sandbox behavior, authorization and recovery separately before deployment. Coordinate compatible frontend/backend releases and verify the served assets and live behavior afterward.

## Contributing

Branch from current `dev`, review incoming work, make focused changes and verify them with appropriate local tests. Document any new environment variables, indexes, migrations and behavior. Run the frontend build, backend packaging check and relevant lint/tests; record limitations and avoid real customer data or secrets in fixtures and logs. Open a PR describing the change, evidence, rollout requirements and any unverified behavior. Coordinate deployment with the responsible team.
