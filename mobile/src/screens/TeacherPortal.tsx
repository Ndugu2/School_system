import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Student, MarkEntry } from '../types';

const INITIAL_STUDENTS: Student[] = [
  { id: '1', name: 'Mukasa Ronald', admissionNo: 'NDU/2026/042', class: 'Senior 3', stream: 'East', attendanceStatus: 'present' },
  { id: '2', name: 'Kato Dennis', admissionNo: 'NDU/2026/088', class: 'Senior 3', stream: 'East', attendanceStatus: 'absent' },
  { id: '3', name: 'Auma Brenda', admissionNo: 'NDU/2026/015', class: 'Senior 3', stream: 'East', attendanceStatus: 'present' },
  { id: '4', name: 'Nassanga Florence', admissionNo: 'NDU/2026/104', class: 'Senior 3', stream: 'East', attendanceStatus: 'late' },
  { id: '5', name: 'Ssemwogerere Paul', admissionNo: 'NDU/2026/119', class: 'Senior 3', stream: 'East', attendanceStatus: 'excused' },
];

const INITIAL_MARKS: MarkEntry[] = [
  { studentId: '1', studentName: 'Mukasa Ronald', aoiMark: 16, eotMark: 64, finalGrade: 'D2', status: 'draft' },
  { studentId: '2', studentName: 'Kato Dennis', aoiMark: 12, eotMark: 48, finalGrade: 'C5', status: 'draft' },
  { studentId: '3', studentName: 'Auma Brenda', aoiMark: 19, eotMark: 72, finalGrade: 'D1', status: 'draft' },
  { studentId: '4', studentName: 'Nassanga Florence', aoiMark: 14, eotMark: 56, finalGrade: 'C4', status: 'draft' },
];

export default function TeacherPortal() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'marks' | 'timetable'>('attendance');
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [marks, setMarks] = useState<MarkEntry[]>(INITIAL_MARKS);
  const [selectedClass, setSelectedClass] = useState('S3 East');

  const toggleAttendance = (id: string, status: Student['attendanceStatus']) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, attendanceStatus: status } : s));
  };

  const handleUpdateMark = (studentId: string, aoi: string, eot: string) => {
    const aoiNum = Math.min(20, Math.max(0, parseFloat(aoi) || 0));
    const eotNum = Math.min(80, Math.max(0, parseFloat(eot) || 0));
    const total = Math.round(aoiNum + eotNum);

    let grade = 'F9';
    if (total >= 90) grade = 'D1';
    else if (total >= 80) grade = 'D2';
    else if (total >= 70) grade = 'C3';
    else if (total >= 65) grade = 'C4';
    else if (total >= 60) grade = 'C5';
    else if (total >= 50) grade = 'C6';
    else if (total >= 45) grade = 'P7';
    else if (total >= 40) grade = 'P8';

    setMarks(prev => prev.map(m => m.studentId === studentId ? { ...m, aoiMark: aoiNum, eotMark: eotNum, finalGrade: grade } : m));
  };

  const submitForReview = () => {
    Alert.alert('Success', 'Marks submitted to Head of Department (HOD) for review & verification.');
    setMarks(prev => prev.map(m => ({ ...m, status: 'under_review' })));
  };

  return (
    <View style={styles.container}>
      {/* Sub Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'attendance' && styles.tabBtnActive]} onPress={() => setActiveTab('attendance')}>
          <Text style={[styles.tabText, activeTab === 'attendance' && styles.tabTextActive]}>Roll Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'marks' && styles.tabBtnActive]} onPress={() => setActiveTab('marks')}>
          <Text style={[styles.tabText, activeTab === 'marks' && styles.tabTextActive]}>Marks Entry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'timetable' && styles.tabBtnActive]} onPress={() => setActiveTab('timetable')}>
          <Text style={[styles.tabText, activeTab === 'timetable' && styles.tabTextActive]}>Timetable</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Daily Roll Call • {selectedClass}</Text>
              <Text style={styles.dateLabel}>{new Date().toDateString()}</Text>
            </View>

            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: '#10b981' }]}>{students.filter(s => s.attendanceStatus === 'present').length}</Text>
                <Text style={styles.statLbl}>Present</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: '#ef4444' }]}>{students.filter(s => s.attendanceStatus === 'absent').length}</Text>
                <Text style={styles.statLbl}>Absent</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: '#f59e0b' }]}>{students.filter(s => s.attendanceStatus === 'late').length}</Text>
                <Text style={styles.statLbl}>Late</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: '#6366f1' }]}>{students.filter(s => s.attendanceStatus === 'excused').length}</Text>
                <Text style={styles.statLbl}>Excused</Text>
              </View>
            </View>

            {students.map(s => (
              <View key={s.id} style={styles.card}>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{s.name}</Text>
                  <Text style={styles.admissionNo}>{s.admissionNo}</Text>
                </View>

                <View style={styles.statusButtons}>
                  {(['present', 'absent', 'late', 'excused'] as const).map(st => (
                    <TouchableOpacity
                      key={st}
                      onPress={() => toggleAttendance(s.id, st)}
                      style={[
                        styles.statusBtn,
                        s.attendanceStatus === st && (
                          st === 'present' ? styles.btnPresent :
                          st === 'absent' ? styles.btnAbsent :
                          st === 'late' ? styles.btnLate : styles.btnExcused
                        )
                      ]}
                    >
                      <Text style={[styles.statusBtnText, s.attendanceStatus === st && styles.statusBtnTextActive]}>
                        {st.charAt(0).toUpperCase() + st.slice(1, 4)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Marks Entry Tab */}
        {activeTab === 'marks' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>NCDC Assessment • Chemistry (S3)</Text>
              <TouchableOpacity style={styles.submitHeaderBtn} onPress={submitForReview}>
                <Text style={styles.submitHeaderBtnText}>Submit HOD</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>
                O-Level Formula: 20% Formative (AOI) + 80% Summative (EOT) = 100%
              </Text>
            </View>

            {marks.map(m => (
              <View key={m.studentId} style={styles.card}>
                <View style={styles.markHeader}>
                  <Text style={styles.studentName}>{m.studentName}</Text>
                  <View style={styles.gradePill}>
                    <Text style={styles.gradePillText}>{m.finalGrade}</Text>
                  </View>
                </View>

                <View style={styles.markInputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>AOI (20%)</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      defaultValue={m.aoiMark.toString()}
                      onChangeText={v => handleUpdateMark(m.studentId, v, m.eotMark.toString())}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>EOT (80%)</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      defaultValue={m.eotMark.toString()}
                      onChangeText={v => handleUpdateMark(m.studentId, m.aoiMark.toString(), v)}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Total</Text>
                    <Text style={styles.totalValue}>{m.aoiMark + m.eotMark}%</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Timetable Tab */}
        {activeTab === 'timetable' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Teacher Schedule • Term II</Text>
            </View>

            {[
              { time: '08:00 - 09:20', subject: 'Chemistry (Double Lab)', class: 'S3 East', room: 'Lab 2' },
              { time: '09:20 - 10:40', subject: 'Biology (Theory)', class: 'S2 West', room: 'Room 14' },
              { time: '11:10 - 12:30', subject: 'Chemistry', class: 'S4 North', room: 'Room 08' },
              { time: '14:00 - 15:20', subject: 'Science Club Practical', class: 'All Streams', room: 'Main Quad' },
            ].map((slot, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.slotRow}>
                  <Text style={styles.slotTime}>{slot.time}</Text>
                  <Text style={styles.slotRoom}>{slot.room}</Text>
                </View>
                <Text style={styles.slotSubject}>{slot.subject}</Text>
                <Text style={styles.slotClass}>{slot.class}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f19' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  tabRow: { flexDirection: 'row', backgroundColor: '#131927', padding: 4, marginHorizontal: 16, marginTop: 12, borderRadius: 10 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#6366f1' },
  tabText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#ffffff', fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  dateLabel: { color: '#94a3b8', fontSize: 12 },
  submitHeaderBtn: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  submitHeaderBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  statsCard: { flexDirection: 'row', backgroundColor: '#131927', borderRadius: 12, padding: 14, marginBottom: 14, justifyContent: 'space-around', borderWidth: 1, borderColor: '#1e293b' },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLbl: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  card: { backgroundColor: '#131927', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1e293b' },
  studentInfo: { marginBottom: 10 },
  studentName: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  admissionNo: { color: '#94a3b8', fontSize: 12 },
  statusButtons: { flexDirection: 'row', gap: 6 },
  statusBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1e293b' },
  statusBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  statusBtnTextActive: { color: '#ffffff', fontWeight: '700' },
  btnPresent: { backgroundColor: '#10b981' },
  btnAbsent: { backgroundColor: '#ef4444' },
  btnLate: { backgroundColor: '#f59e0b' },
  btnExcused: { backgroundColor: '#6366f1' },
  infoBanner: { backgroundColor: '#1e1b4b', padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#3730a3' },
  infoBannerText: { color: '#c7d2fe', fontSize: 12, textAlign: 'center' },
  markHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  gradePill: { backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  gradePillText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  markInputRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  inputGroup: { flex: 1 },
  inputLabel: { color: '#94a3b8', fontSize: 11, marginBottom: 4, fontWeight: '600' },
  textInput: { backgroundColor: '#0b0f19', color: '#ffffff', borderWidth: 1, borderColor: '#334155', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, textAlign: 'center', fontWeight: '700' },
  totalValue: { color: '#6366f1', fontSize: 16, fontWeight: '800', textAlign: 'center', paddingTop: 6 },
  slotRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  slotTime: { color: '#fbbf24', fontSize: 12, fontWeight: '700' },
  slotRoom: { color: '#94a3b8', fontSize: 12 },
  slotSubject: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  slotClass: { color: '#94a3b8', fontSize: 13, marginTop: 2 }
});
