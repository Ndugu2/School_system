# 🖥️ School Management System — Admin & Academic Web Console

Modern, responsive web application engineered for school leadership, bursars, registrars, and educators adhering to **NCDC (Uganda)** curriculum grading and financial standards.

---

## 🔑 Key Modules & Pages

- **Dashboard Overview**: Institutional KPIs, enrollment metrics, fee collection summaries, and academic watchlist.
- **Admissions & Clearance**: Requirements checklist (Uniform, Books, Math sets, Medicals), student promotions engine (S1 $\rightarrow$ S2), and transfer/graduation clearance.
- **Students & Classes**: 360° student directory, stream allocations (East, West, North), and bio-data management.
- **Staff & HR**: Staff profiles, qualifications, department allocations, and leave/duty rosters.
- **Grades & Examinations**: Dual grading engine (NCDC 20% Formative AOI + 80% Summative EOT for O-Level; 20-Point Combination calculator for A-Level) with HOD review gate and results locking.
- **Finance & ERP**: Automated batch invoicing in UGX, Mobile Money (MTN MoMo / Airtel Money) integrations, receipt generation, and expense tracking.
- **Hostel & Exeats**: Room and bed allocations, dormitory occupancy tracking, and digital exeat passes with parent SMS OTP verification.
- **Library Catalog**: Textbook inventory across O/A-Levels and issue/return circulation ledger.
- **Operations & Timetables**: Master timetable builder, school calendar, and event planning.
- **Holiday E-Learning (LMS)**: Digital course modules, study materials, and past revision papers.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create `.env` in `web/`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run Development Server
```bash
npm run dev
```

App opens at `http://localhost:5173`.
