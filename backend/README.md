# 🛠️ School Management System — Backend API Server

Modular Monolith backend service built with **Node.js**, **Express**, and **MongoDB (Mongoose)** tailored for Ugandan Senior Secondary Schools.

---

## 📌 Architecture Overview

The backend uses a modular domain service structure located in `src/`:

```text
backend/
├── src/
│   ├── config/             # DB & authentication configuration
│   ├── middleware/         # Auth (JWT verification) & RBAC guards
│   ├── models/             # Shared Mongoose models (Student, Class, Grade, Invoice...)
│   ├── routes/             # Primary REST API routes
│   └── modules/            # Domain services
│       ├── admissions/     # Registration clearance, requirements checklist, promotion
│       ├── finance/        # Invoices, receipts, journal entries & MTN MoMo collections
│       ├── hostel/         # Dormitory allocations, exeat gate passes, OTP verification
│       ├── hr/             # Staff directory, qualifications, leave management
│       ├── library/        # Textbook catalog, issue/return lending ledger
│       ├── lms/            # Holiday e-learning modules & revision notes
│       ├── analytics/      # Watchlist, revenue collections, KPI stats
│       ├── behaviour/      # Student discipline incident dossiers
│       └── health/         # System health & ping checks
├── .env.example
├── package.json
└── setupFeeTestData.js     # Test fixture seed script
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. MongoDB Atlas Setup
1. Create a cluster in [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a database user under **Database Access**.
3. Add your development IP under **Network Access**.
4. Select **Connect > Drivers**, copy the Node.js connection string, and replace `<username>`, `<password>`, and `<cluster>`.
5. URL-encode special characters in the database username or password.

### 3. Environment Configuration
Create `.env` in the `backend/` directory:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/school_system_uganda?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret
NODE_ENV=development
```

The actual `.env` file is ignored by Git. Never commit the Atlas connection string or database password.

### 4. Start the Server
```bash
# Development mode with hot-reload (nodemon)
npm run dev

# Production mode
npm start
```

API is available at `http://localhost:5000/api`.

## Payments, messaging, and production operations

### MTN MoMo collections

The finance API supports MTN MoMo collections against an existing invoice:

1. Configure `MTN_MOMO_SUBSCRIPTION_KEY`, `MTN_MOMO_API_USER`, and `MTN_MOMO_API_KEY` using credentials from the MTN MoMo Developer Portal.
2. Keep `MTN_MOMO_TARGET_ENVIRONMENT=sandbox` and use the sandbox base URL while testing. Set production credentials, target environment, and approved base URL only after completing MTN's onboarding.
3. Set `MTN_MOMO_CALLBACK_URL` to the public HTTPS URL ending in `/api/finance/momo/callback`.
4. An authenticated parent can POST `{ "invoiceId": "...", "amount": 100000, "phoneNumber": "07XXXXXXXX" }` to `/api/finance/momo/request`.
5. The callback is not trusted as proof of payment. The backend fetches transaction status directly from MTN before issuing the receipt, updating the invoice, and posting the journal entry. A pending request is not a payment.

Never commit payment credentials. Test duplicate callbacks, failed transactions, invoice balance changes, and receipt/journal posting in sandbox before production.

### SMS and email

SMS delivery uses `AT_API_KEY`, `AT_USERNAME`, and `AT_ENVIRONMENT`. Sandbox mode does not deliver messages and returns an explicit not-delivered status. Email delivery requires SMTP host, port, username, and password configuration. Keep credentials in the deployment secret manager.

### MongoDB Atlas backup and recovery

Enable Atlas automated cloud backups for the production cluster (and point-in-time recovery if included in the selected Atlas tier). Configure a daily snapshot schedule with a retention period that meets the school's recovery requirements; a 30-day retention target is a reasonable starting point. Restrict backup access to designated database administrators and confirm encryption and restore permissions in Atlas.

Document the production cluster, database name, recovery contacts, and acceptable recovery-point/recovery-time objectives in the school's operations record. At least quarterly, restore a recent snapshot into a separate staging cluster, verify student, fee, receipt, and results records, then delete the staging copy using Atlas controls. Do not test restores against the live production database. Atlas backup availability and point-in-time options depend on the selected cluster tier.

### TLS

Terminate HTTPS at the production hosting edge (for example, Vercel or a TLS-configured reverse proxy), keep Helmet's HSTS enabled, and configure `ALLOWED_ORIGINS` with the exact HTTPS frontend origins. Do not expose production API or database traffic over plaintext HTTP.
