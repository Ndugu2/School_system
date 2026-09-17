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
│       ├── finance/        # Invoices, receipts, SchoolPay & MoMo webhooks
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
