# Ndugu Secondary School Management System (Uganda)

> High-performance, comprehensive School Management System (SMS) built specifically for **Uganda Secondary Schools (Senior 1 – Senior 6)**, fully supporting **NCDC Competency-Based Curriculum (20% SBA / 80% EOT)** and **UACE A-Level 20-Point Combination Engine**.

---

## 📖 Complete Documentation

Detailed system architecture, database models, Ugandan curriculum grading specifications, payment webhooks, and module breakdowns are available in the **[SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md)** file.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/Ndugu2/School_system.git
cd School_system

# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd ../frontend && npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and set `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `PORT=5000`. The frontend uses `http://localhost:5000/api` by default; set `VITE_API_URL` in `frontend/.env` only when using another API URL.

### 3. Run Locally
```bash
# Backend (from /backend)
npm run dev

# Frontend (from /frontend)
npm run dev
```

---

## 📋 Features Overview

- 🎓 **Ugandan Curriculum**: NCDC 20% Formative (AOI) + 80% EOT assessment, UACE 20-point combination calculator, O-Level Division calculation (D1–F9).
- 💳 **Ugandan Finance**: Fee structures in UGX, Mobile Money (MTN MoMo / Airtel Money) & SchoolPay webhooks, bursary management.
- 🆔 **UNEB / EMIS Ready**: LIN tracking, PLE & UCE index numbers, batch printable QR-coded Student ID cards.
- 🚪 **Smart Boarding**: Parent OTP Exeat Gate Pass system, Cashless Canteen POS Pocket Money wallet, Dormitory inspection grading.
- 📱 **Communication**: WhatsApp Business API + Africa's Talking SMS alerts, parent PWA portal.
