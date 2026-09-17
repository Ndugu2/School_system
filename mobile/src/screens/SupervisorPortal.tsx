import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Incident, ExeatPass } from '../types';

const INITIAL_INCIDENTS: Incident[] = [
  { id: '1', studentName: 'Mukasa Ronald', admissionNo: 'NDU/2026/042', severity: 'medium', category: 'Skipping Prep', description: 'Found outside bounds during evening prep hours.', actionTaken: 'Warned and assigned library duty for 2 days.', date: '2026-06-14', status: 'resolved' },
  { id: '2', studentName: 'Kato Dennis', admissionNo: 'NDU/2026/088', severity: 'high', category: 'Uniform Infraction', description: 'Improper grooming and refusing prefect instructions.', actionTaken: 'Case referred to Disciplinary Committee; Parent alerted via SMS.', date: '2026-06-15', status: 'under_investigation' },
];

const INITIAL_EXEATS: ExeatPass[] = [
  { id: '1', studentName: 'Mukasa Ronald', dormitory: 'Lumumba Hall', destination: 'Jinja (Medical)', departure: '08:30', expectedReturn: '17:00', otp: '8492', status: 'active_exit' },
  { id: '2', studentName: 'Kembabazi Joy', dormitory: 'Mary Stuart Hall', destination: 'Kampala Clinic', departure: '09:00', expectedReturn: '16:00', otp: '4190', status: 'approved' },
];

export default function SupervisorPortal() {
  const [activeTab, setActiveTab] = useState<'approvals' | 'discipline' | 'exeat'>('approvals');
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [exeats, setExeats] = useState<ExeatPass[]>(INITIAL_EXEATS);

  // New incident state
  const [studentName, setStudentName] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [description, setDescription] = useState('');

  const handleApproveBatch = () => {
    Alert.alert('Marks Approved', 'S3 Chemistry & Mathematics marks approved and published to Parent Portal.');
  };

  const handleCreateIncident = () => {
    if (!studentName.trim() || !description.trim()) {
      Alert.alert('Error', 'Please enter student name and description');
      return;
    }
    const newInc: Incident = {
      id: Date.now().toString(),
      studentName: studentName.trim(),
      admissionNo: 'NDU/2026/' + Math.floor(100 + Math.random() * 900),
      severity,
      category: category || 'General Infraction',
      description: description.trim(),
      actionTaken: 'Parent notified automatically via SMS broadcast.',
      date: new Date().toISOString().split('T')[0],
      status: 'open'
    };
    setIncidents([newInc, ...incidents]);
    setStudentName('');
    setCategory('');
    setDescription('');
    Alert.alert('Incident Logged', 'Disciplinary record saved and parent notified.');
  };

  return (
    <View style={styles.container}>
      {/* Sub Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'approvals' && styles.tabBtnActive]} onPress={() => setActiveTab('approvals')}>
          <Text style={[styles.tabText, activeTab === 'approvals' && styles.tabTextActive]}>Marks Review</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'discipline' && styles.tabBtnActive]} onPress={() => setActiveTab('discipline')}>
          <Text style={[styles.tabText, activeTab === 'discipline' && styles.tabTextActive]}>Discipline Log</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'exeat' && styles.tabBtnActive]} onPress={() => setActiveTab('exeat')}>
          <Text style={[styles.tabText, activeTab === 'exeat' && styles.tabTextActive]}>Gate Audit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Marks Approval Tab */}
        {activeTab === 'approvals' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Academic Approval</Text>
              <TouchableOpacity style={styles.approveAllBtn} onPress={handleApproveBatch}>
                <Text style={styles.approveAllBtnText}>Approve All (2)</Text>
              </TouchableOpacity>
            </View>

            {[
              { subject: 'Chemistry', class: 'Senior 3 East', teacher: 'Tr. Sarah Nakato', students: 42, avg: '71.4% (C3)' },
              { subject: 'Pure Mathematics', class: 'Senior 5 Sciences', teacher: 'Tr. Peter Mugisha', students: 38, avg: '68.2% (C4)' },
            ].map((sub, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>{sub.subject} • {sub.class}</Text>
                  <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>Pending HOD</Text></View>
                </View>
                <Text style={styles.subMeta}>Teacher: {sub.teacher} • {sub.students} Enrolled Learners</Text>
                <Text style={styles.subAvg}>Class Average: <Text style={{ color: '#10b981', fontWeight: '800' }}>{sub.avg}</Text></Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.returnBtn} onPress={() => Alert.alert('Returned', 'Returned to teacher for score adjustment.')}>
                    <Text style={styles.returnBtnText}>Return to Teacher</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => Alert.alert('Approved', `${sub.subject} scores locked & published.`)}>
                    <Text style={styles.approveBtnText}>Approve & Lock</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Discipline Incident Logger */}
        {activeTab === 'discipline' && (
          <View>
            <Text style={styles.sectionTitle}>Log Student Incident</Text>
            <View style={styles.card}>
              <TextInput style={styles.input} placeholder="Student Name" placeholderTextColor="#64748b" value={studentName} onChangeText={setStudentName} />
              <TextInput style={styles.input} placeholder="Infraction Category (e.g. Skipping Prep, Bullying)" placeholderTextColor="#64748b" value={category} onChangeText={setCategory} />
              
              <View style={styles.severityRow}>
                <Text style={styles.inputLabel}>Severity Level:</Text>
                {(['low', 'medium', 'high'] as const).map(sev => (
                  <TouchableOpacity
                    key={sev}
                    style={[styles.sevBtn, severity === sev && (sev === 'low' ? styles.sevLow : sev === 'medium' ? styles.sevMed : styles.sevHigh)]}
                    onPress={() => setSeverity(sev)}
                  >
                    <Text style={[styles.sevBtnText, severity === sev && styles.sevBtnTextActive]}>{sev.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                multiline
                placeholder="Detailed incident description and witness remarks..."
                placeholderTextColor="#64748b"
                value={description}
                onChangeText={setDescription}
              />

              <TouchableOpacity style={styles.logIncidentBtn} onPress={handleCreateIncident}>
                <Text style={styles.logIncidentBtnText}>Save Incident & Alert Parent</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Active Incident Dossiers</Text>
            {incidents.map(inc => (
              <View key={inc.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>{inc.studentName}</Text>
                  <View style={[styles.sevPill, inc.severity === 'high' ? styles.sevHigh : inc.severity === 'medium' ? styles.sevMed : styles.sevLow]}>
                    <Text style={styles.sevPillText}>{inc.severity.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.incCategory}>{inc.category} • {inc.date}</Text>
                <Text style={styles.incDesc}>{inc.description}</Text>
                <Text style={styles.incAction}>Action: {inc.actionTaken}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Gate Pass Audit */}
        {activeTab === 'exeat' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Boarding Campus Gate Audit</Text>
              <View style={styles.counterBadge}>
                <Text style={styles.counterBadgeText}>1 Off-Campus</Text>
              </View>
            </View>

            {exeats.map(ex => (
              <View key={ex.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>{ex.studentName}</Text>
                  <View style={[styles.statusBadge, ex.status === 'active_exit' ? styles.statusOff : styles.statusApproved]}>
                    <Text style={styles.statusBadgeText}>{ex.status === 'active_exit' ? 'Off-Campus' : 'Approved'}</Text>
                  </View>
                </View>
                <Text style={styles.subMeta}>Dorm: {ex.dormitory} • OTP: <Text style={{ color: '#fbbf24', fontWeight: '800' }}>{ex.otp}</Text></Text>
                <Text style={styles.subMeta}>Destination: {ex.destination}</Text>
                <Text style={styles.timeMeta}>Window: {ex.departure} → Expected Return {ex.expectedReturn}</Text>
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
  approveAllBtn: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  approveAllBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#131927', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#1e293b' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  pendingBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pendingBadgeText: { color: '#b45309', fontSize: 11, fontWeight: '700' },
  subMeta: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  subAvg: { color: '#cbd5e1', fontSize: 13, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  returnBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, borderWidth: 1, borderColor: '#475569' },
  returnBtnText: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' },
  approveBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#10b981' },
  approveBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  input: { backgroundColor: '#0b0f19', color: '#ffffff', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 13 },
  severityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  inputLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  sevBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#1e293b' },
  sevBtnText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  sevBtnTextActive: { color: '#ffffff' },
  sevLow: { backgroundColor: '#10b981' },
  sevMed: { backgroundColor: '#f59e0b' },
  sevHigh: { backgroundColor: '#ef4444' },
  logIncidentBtn: { backgroundColor: '#6366f1', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  logIncidentBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  sevPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  sevPillText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
  incCategory: { color: '#fbbf24', fontSize: 12, fontWeight: '600', marginTop: 2 },
  incDesc: { color: '#e2e8f0', fontSize: 13, marginTop: 4 },
  incAction: { color: '#94a3b8', fontSize: 11, fontStyle: 'italic', marginTop: 6 },
  counterBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  counterBadgeText: { color: '#b91c1c', fontSize: 12, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  statusOff: { backgroundColor: '#ef4444' },
  statusApproved: { backgroundColor: '#10b981' },
  timeMeta: { color: '#6366f1', fontSize: 12, marginTop: 4, fontWeight: '600' }
});
