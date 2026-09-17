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

### 2. Environment Configuration
Create `.env` in the `backend/` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/school_system_uganda
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret
NODE_ENV=development
```

### 3. Start the Server
```bash
# Development mode with hot-reload (nodemon)
npm run dev

# Production mode
npm start
```

API is available at `http://localhost:5000/api`.
