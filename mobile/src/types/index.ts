export type UserRole = 'teacher' | 'supervisor' | 'parent' | 'student';

export interface Student {
  id: string;
  name: string;
  admissionNo: string;
  class: string;
  stream: string;
  attendanceStatus: 'present' | 'absent' | 'late' | 'excused';
}

export interface MarkEntry {
  studentId: string;
  studentName: string;
  aoiMark: number; // 20% Formative
  eotMark: number; // 80% Summative
  finalGrade: string; // D1 - F9
  status: 'draft' | 'under_review' | 'approved';
}

export interface Incident {
  id: string;
  studentName: string;
  admissionNo: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  description: string;
  actionTaken: string;
  date: string;
  status: 'open' | 'under_investigation' | 'resolved';
}

export interface ExeatPass {
  id: string;
  studentName: string;
  dormitory: string;
  destination: string;
  departure: string;
  expectedReturn: string;
  otp: string;
  status: 'pending_parent' | 'approved' | 'active_exit' | 'returned';
}
