# 📱 School Management System — Mobile Application

React Native / Expo **UI preview** for teacher, supervisor, parent, and student portal concepts.

> This application is a demo, not a production-connected client. It uses hard-coded sample records and a role switcher instead of authentication. No attendance, grades, payments, SMS, or gate-pass actions are submitted to the backend. Do not use the displayed student or financial data as real records.

---

## 🔑 Portals & Capabilities

### 👨‍🏫 Teacher Portal
- **Daily Classroom Roll Call**: Fast digital attendance (*Present*, *Absent*, *Late*, *Excused*) with status filters.
- **Ugandan Curriculum Marks Capture**: NCDC O-Level (20% AOI Formative + 80% EOT Summative) mark entry with real-time grade conversion (D1–F9).
- **Class Timetable**: Schedule view of teaching periods, assigned subjects, and laboratory sessions.

### 🔍 Supervisor Portal
- **Marks Quality Assurance**: Review, approve, or return teacher score submissions before terminal publishing.
- **Disciplinary Incident Dossiers**: Log infractions with severity flags (*Low*, *Medium*, *High*), investigative notes, and automatic parent SMS notification.
- **Campus Gate Audit**: Real-time counter of active off-campus boarders and exeat approvals.

### 👨‍👩‍👧 Parent Portal preview
- Shows sample child, fee, and report-card layouts.
- Does not submit payments or authorize gate passes. MTN MoMo is available through the authenticated web Parent Portal only.

### 🎓 Student Portal
- **Holiday LMS**: Downloadable course modules, revision past papers, and digital study packs.
- **Library Borrower Tracker**: Monitor issued textbooks and overdue return clearance dates.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Expo Development Server
```bash
npx expo start
```

### 3. Run on Device / Emulator
- Press `a` for Android emulator or scan QR with Expo Go.
- Press `i` for iOS simulator.
- Press `w` for web browser preview.
