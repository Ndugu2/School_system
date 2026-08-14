# Ndugu Secondary School Management System — Complete Documentation

> **Official Technical & Operational Documentation**  
> Tailored for Uganda Senior Secondary Schools (**Senior 1 to Senior 6**) adhering to **NCDC (National Curriculum Development Centre)** and **UNEB (Uganda National Examinations Board)** standards.

---

## 📌 Executive Summary

**Ndugu Secondary School System** is a next-generation, cloud-ready enterprise School Management System (SMS) designed specifically for Ugandan secondary schools. The system automates academic grading, financial ledger accounting, boarding welfare, parent communication, staff payroll, and UNEB compliance reporting into a unified, secure platform.

---

## 🏛️ System Architecture & Technology Stack

### Tech Stack
* **Frontend**: React (Vite), Lucide Icons, Custom Design Tokens & CSS Variables, Outfit Typography, Responsive PWA architecture.
* **Backend**: Node.js, Express.js (Modular Monolith Architecture under `/backend/src/modules/`).
* **Database**: MongoDB with Mongoose ORM schemas.
* **Document Processing**: PDFKit for server-side generation of printable report cards and ID cards.
* **Authentication**: JSON Web Tokens (JWT) with password hashing via bcrypt.

```
SchoolSystemUganda/
├── frontend/                   # React Vite Frontend Application
│   ├── src/
│   │   ├── components/         # Layout, Navigation & Reusable Components
│   │   ├── context/            # AuthContext, ThemeContext
│   │   ├── pages/              # Module Page Views (Finance, HR, LMS, Admissions...)
│   │   └── services/           # Axios API Service & SyncQueue
└── backend/                    # Express Backend Server
    └── src/
        ├── models/             # Shared Mongoose Schemas (Student, Class, Grade, Fee...)
        ├── routes/             # Primary REST API Routes
        └── modules/            # 12 Modular Domain Services
            ├── admissions/     ├── health/         ├── messaging/
            ├── analytics/      ├── hostel/         ├── operations/
            ├── behaviour/      ├── hr/             
            ├── finance/        ├── inventory/      
            └── library/        └── lms/            
```

---

## 🇺🇬 Curriculum & Assessment Engine

The system features a dual assessment engine specifically built for the Ugandan education system:

### 1. Lower Secondary (S1 – S4): NCDC Competency-Based Curriculum
* **20% School-Based Formative Assessment (SBA)**:
  * Tracks topic-by-topic **Activities of Integration (AOIs)**.
  * 3-Point Competency Scale:
    * **Score 3**: Outstanding (Mastery of competence)
    * **Score 2**: Moderate (Proficient competence)
    * **Score 1**: Basic (Basic competence)
  * $\text{SBA Score (20\%)} = \left(\frac{\text{Average AOI Score}}{3}\right) \times 20$
* **80% Summative Assessment**: End-of-Term examination score out of 80.
* **Final Score Calculation**: $\text{Final Mark (100\%)} = \text{SBA (20\%)} + \text{Summative (80\%)}$.
* **Competency Descriptors**:
  * `1.0 - 1.4`: Basic
  * `1.5 - 2.4`: Moderate
  * `2.5 - 3.0`: Outstanding
* **Generic Skills Evaluation**: Evaluation of Critical Thinking, Communication, Innovation, and Teamwork.
* **UNEB Export**: One-click export into the official UNEB e-Registration / SBA format.

### 2. Upper Secondary (S5 – S6): UACE 20-Point Combination Engine
* **Principal Subject Grading**:
  * **A**: 6 Points | **B**: 5 Points | **C**: 4 Points | **D**: 3 Points | **E**: 2 Points | **O**: 1 Point | **F**: 0 Points
* **Subsidiary Subjects (Sub-Math / Subsidiary ICT)**: Pass = 1 Point, Fail = 0 Points.
* **General Paper (GP)**: Pass = 1 Point.
* **Total Aggregates**: Automated computation out of **20 Points** ($6 + 6 + 6 + 1 + 1$).
* **Combination Enforcer**: Enforces valid combinations (e.g., *PCM/ICT*, *BCM/Sub-Math*, *HEG/ICT*, *PCB/Sub-Math*, *MEG/ICT*).

### 3. O-Level UNEB Grade Scale & Division Calculator
* **Grades**: `D1` (90-100), `D2` (80-89), `C3` (70-79), `C4` (65-69), `C5` (60-64), `C6` (50-59), `P7` (45-49), `P8` (40-44), `F9` (<40).
* **O-Level Division Rules** (Best 8 Subjects):
  * **Division I**: $\le 24$ Aggregates
  * **Division II**: $25 - 32$ Aggregates
  * **Division III**: $33 - 45$ Aggregates
  * **Division IV**: $46 - 52$ Aggregates
  * **Ungraded (U)**: $> 52$ Aggregates

---

## 📦 Core Modules Breakdown

The system is organized into 4 primary pillars:

### Pillar 1: Students Management
1. **Student Directory & Admissions**:
   * Learner Identification Number (LIN) and MoES EMIS compliance tracking.
   * Entry academic history (PLE Index Number & Aggregates, UCE Index Number).
   * Sub-class Streams (*S1 North, S1 South*) and School Houses (*Lumumba, Kabalega, Nkrumah, Nyerere*).
2. **360° Student Dossier**:
   * Tabbed profile view covering Bio-Data, Academic Performance, Real-Time Fee Ledger, Attendance, Welfare/Sickbay Log, and Student ID Badge.
3. **Batch Student ID Card Generator**:
   * Printable grid PDF generator (8–10 cards per A4 sheet) with scannable **Barcode / QR Code** encoding student ID for gate pass and canteen POS.
4. **Subject & Electives Manager**:
   * O-Level elective choices (Agriculture, Computer Studies, Luganda, Art, Literature) and A-Level combination assignment.

### Pillar 2: Staff & HR Management
1. **Staff Profiles**: Teaching and non-teaching staff records, qualifications, contact info, and role assignments.
2. **Leave Management**: Leave requests, approval workflows, and leave balance tracking.
3. **Payroll Engine**: Monthly salary calculation, NSSF deductions, PAYE tax computation, and bank advice slip generation.

### Pillar 3: Finance & ERP
1. **Fee Structure & Billing**:
   * Configurable fee structures per class level (S1 to S6).
   * Automated batch invoice generation per term in UGX.
2. **Payment Integrations & Webhooks**:
   * Direct API endpoints for MTN Mobile Money, Airtel Money, SchoolPay, Pegasus PayWay, and Centenary Bank webhooks for real-time ledger clearing.
   * Instant SMS/WhatsApp receipt generation.
3. **Bursary & Scholarship Tracking**:
   * Partial/Full bursaries (Sports, Academic, Director's Bursary, NGO/State sponsorships).
4. **Expense Tracker & Financial Analytics**:
   * Operational expenses categorization, budget variance tracking, and revenue cash flow charts.

### Pillar 4: Boarding, Inventory & Operations
1. **Digital Gate Pass (Exeat System)**:
   * Parent SMS OTP authorization for student exeat approval.
   * Gate warden barcode scanner interface logging exit & entry times.
2. **Cashless Canteen POS & Pocket Money Wallet**:
   * Student pocket money digital wallet with parent-configured daily spending limits.
3. **Hostel & Dormitory Management**:
   * Room assignments, dormitory inspection scoring, and house competition leaderboards.
4. **Inventory & Asset Registry**:
   * Consumables tracking, asset depreciation log, and library book issue/return ledger.
5. **Operations & Master Timetable Solver**:
   * Multi-constraint timetable builder resolving teacher workload, room allocations, and lab double-periods.

---

## 🔐 Role-Based Access Control (RBAC)

The system enforces strict permission scoping across 5 primary roles:

| Role | Access Scope |
| :--- | :--- |
| **Super-Admin** | Full system configuration, audit logs, global settings, & role assignment. |
| **Admin / Bursar** | Student admissions, finance ledger, invoice management, payroll, & report generation. |
| **Teacher** | Class mark entry (BOT/MOT/EOT/SBA), attendance roll call, & course material upload. |
| **Student** | Personal grade view, e-learning materials, fee balance summary, & library books. |
| **Parent** | Student 360° progress view, fee payment via Mobile Money, attendance alerts, & exeat approvals. |

---

## ⚙️ Installation & Development Guide

### Prerequisites
* **Node.js** (v18.0 or higher)
* **MongoDB** (v6.0 or local MongoDB service)
* **npm** or **yarn**

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Ndugu2/School_system.git
cd School_system

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration
Copy `.env.example` to a root `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/school_system_uganda
JWT_SECRET=your_long_random_access_token_secret
JWT_REFRESH_SECRET=your_different_long_random_refresh_token_secret
CORS_ORIGIN=http://localhost:5173,http://localhost:4173
NODE_ENV=development
```

Optionally create a `.env` file in `/frontend` when the API is hosted elsewhere:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Running Locally
```bash
# Start backend server (from /backend)
npm run start

# Start frontend application (from /frontend)
npm run dev
```

---

## 📄 License & Attribution

Developed for **Ndugu Secondary School System** (Uganda). All rights reserved.
