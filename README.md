# Unfazed

A practice management platform for therapists in India. Each therapist gets one branded link (for example `unfazed.in/dr-sharma`) that handles bookings, payments, intake, notes, chat and analytics.

```
unfazed/
  unfazed-backend/    Node.js, Express, MongoDB (Mongoose), Socket.io
  unfazed-frontend/   React (Vite), Tailwind CSS v4
```

## Quick start

Requirements: Node.js 18+, and MongoDB (local or Atlas).

```bash
cd unfazed-backend
npm install
npm run seed
npm run dev
```

```bash
cd unfazed-frontend
npm install
npm run dev
```

The API runs on http://localhost:5000 and the app on http://localhost:5173.

Set `MONGO_URI` in `unfazed-backend/.env` before running the seed script. The default points at a local MongoDB.

### Demo data

`npm run seed` creates a therapist with a year of sessions, payments, notes, packages and enquiries.

| What | Where | Credentials |
| --- | --- | --- |
| Therapist dashboard | `/login` | `demo@unfazed.in` / `Password@123` |
| Public branded page | `/dr-sharma` | none |
| Client portal | `/dr-sharma/portal` | `aarav@example.com` / `DEMO2024` |

The demo therapist is on the Growth plan, so the DAP template and advanced analytics show the upgrade prompt.

### Payments

With no Razorpay keys the backend runs a clearly labelled test mode and the checkout page offers a simulated payment, so the full booking flow works offline. Add your Razorpay test keys to `unfazed-backend/.env` to use the real checkout. For webhooks, point Razorpay at `POST /api/payments/webhook` and set `RAZORPAY_WEBHOOK_SECRET`. Set `ALLOW_MOCK_PAYMENTS=false` in production.

### Email and WhatsApp

Notifications are event driven. Email goes through Nodemailer when `SMTP_*` variables are set, otherwise it is logged. The WhatsApp channel is a stub that queues and logs messages. Recent messages are visible on the dashboard.

## How the modules map to the code

| Module | Backend | Frontend |
| --- | --- | --- |
| 1. Auth, profile, branded link | `authController`, `therapistController`, `generateSlug` | `Login`, `Register`, `ProfilePage`, `Hero`, `About`, `ServiceCard` |
| 2. Scheduling | `schedulingController`, `slotService`, `Availability`, `Session` | `Schedule`, `AvailabilityEditor`, `SessionCalendar`, `SlotPicker`, `BookingPage` |
| 3. CRM and intake | `clientController`, `portalController`, `Client` | `Clients`, `ClientDetail`, `ClientTable`, `IntakeForm` |
| 4. Payments and packages | `paymentController`, `billingService`, `invoiceService`, `paymentGatewayService` | `Payment`, `CheckoutForm`, `InvoiceView` |
| 5. Clinical documentation | `noteController`, `SessionNote` | `Notes`, `NoteEditor`, `SoapTemplate` |
| 6. Communication | `chatSocket`, `notificationService` | `ChatWindow`, `MessageBubble` |
| 7. Tiers, entitlements, analytics | `entitlementService`, `entitlementMiddleware`, `analyticsController` | `useEntitlement`, `UpgradeModal`, `Analytics`, `RevenueChart` |

## Design decisions worth knowing

**Entitlements are centralised.** Every gated action calls `canAccess(therapistId, featureKey)` in `entitlementService.js`, directly or through `requireEntitlement` middleware. No route or component compares tier names. Tier limits, feature flags, platform fee and plan prices live in the `SubscriptionTierConfig` collection (seeded from `config/defaultTiers.js`). The frontend asks the API what is allowed and never decides on its own. Gated features are the active-client cap, package count, SOAP and DAP templates, and advanced analytics.

**Private notes cannot leak.** `SessionNote.findSharedForClient` is the only way the portal reads notes. It filters on `type: 'shared'` in the query and returns a whitelisted view. Client-facing routes never touch the model any other way. Note content is rendered through TipTap's schema rather than raw HTML.

**Double booking is prevented in the database.** Sessions carry a `holdsSlot` flag and a partial unique index on `(therapist, startsAt)`. Booking holds a slot for a few minutes while the client pays, and unpaid holds are released by a background job. Overlap checks cover sessions of different lengths.

**Payments are settled once.** The client callback and the Razorpay webhook both go through `settlePayment`, which moves a payment from `created` to `paid` atomically. A late payment for a slot that was lost is refunded.

**Money is stored as integer paise.** Amounts, fees, GST rate, hold duration and cancellation window all come from configuration or data, not constants in route code.

**Portal access.** Clients sign in with their email and a short access code that is emailed to them. Booking again as an existing client does not hand out a token.

## Scripts

Backend: `npm run dev`, `npm start`, `npm run seed`.
Frontend: `npm run dev`, `npm run build`, `npm run preview`.

## Deployment

Frontend on Vercel (set `VITE_API_BASE_URL`), backend on Render or Railway (set every variable from `.env.example`, with `CLIENT_URL` pointing at the deployed frontend), database on MongoDB Atlas. Add a rewrite to `index.html` on the frontend host so client-side routes work.
