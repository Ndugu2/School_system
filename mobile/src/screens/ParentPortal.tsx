import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';

const CHILDREN = [
  { id: '1', name: 'Mukasa Ronald', class: 'Senior 3 East', lin: 'LIN-99201', balance: 450000, attendance: '96.5%', division: 'Division I (18 Aggs)' },
  { id: '2', name: 'Mukasa Sarah', class: 'Senior 1 West', lin: 'LIN-10482', balance: 0, attendance: '98.0%', division: 'Division I (14 Aggs)' }
];

const REPORT_CARD_MUKASA = [
  { subject: 'English Language', aoi: '18/20', eot: '68/80', total: 86, grade: 'D2' },
  { subject: 'Mathematics', aoi: '19/20', eot: '74/80', total: 93, grade: 'D1' },
  { subject: 'Physics', aoi: '15/20', eot: '60/80', total: 75, grade: 'C3' },
  { subject: 'Chemistry', aoi: '16/20', eot: '64/80', total: 80, grade: 'D2' },
  { subject: 'Biology', aoi: '17/20', eot: '70/80', total: 87, grade: 'D2' },
  { subject: 'Geography', aoi: '18/20', eot: '72/80', total: 90, grade: 'D1' },
  { subject: 'History', aoi: '14/20', eot: '58/80', total: 72, grade: 'C3' },
  { subject: 'Computer Studies', aoi: '20/20', eot: '75/80', total: 95, grade: 'D1' },
];

export default function ParentPortal() {
  const [selectedChild, setSelectedChild] = useState(CHILDREN[0]);
  const [activeTab, setActiveTab] = useState<'finance' | 'academics' | 'exeat'>('finance');

  const handlePayMobileMoney = (network: 'MTN' | 'Airtel') => {
    Alert.alert(
      `${network} Mobile Money`,
      `Prompt sent to registered phone number for UGX ${selectedChild.balance.toLocaleString()}. Enter your PIN to complete fees payment.`,
      [{ text: 'OK' }]
    );
  };

  const handleApproveExeat = () => {
    Alert.alert(
      'Approve Gate Pass',
      'Enter the 4-digit SMS OTP received on your phone to authorize Ronald Mukasa departure for Jinja.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm OTP (8492)', onPress: () => Alert.alert('Authorized', 'Gate Pass Approved. Warden notified.') }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Multi-Child Selector */}
      <View style={styles.childBar}>
        <Text style={styles.childBarLabel}>Select Student:</Text>
        <View style={styles.childPills}>
          {CHILDREN.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.childPill, selectedChild.id === c.id && styles.childPillActive]}
              onPress={() => setSelectedChild(c)}
            >
              <Text style={[styles.childPillText, selectedChild.id === c.id && styles.childPillTextActive]}>
                {c.name} ({c.class.split(' ')[0]})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sub Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'finance' && styles.tabBtnActive]} onPress={() => setActiveTab('finance')}>
          <Text style={[styles.tabText, activeTab === 'finance' && styles.tabTextActive]}>Fees & Ledger</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'academics' && styles.tabBtnActive]} onPress={() => setActiveTab('academics')}>
          <Text style={[styles.tabText, activeTab === 'academics' && styles.tabTextActive]}>Report Card</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'exeat' && styles.tabBtnActive]} onPress={() => setActiveTab('exeat')}>
          <Text style={[styles.tabText, activeTab === 'exeat' && styles.tabTextActive]}>Gate Passes</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Child Summary Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{selectedChild.name.charAt(0)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.studentName}>{selectedChild.name}</Text>
            <Text style={styles.studentMeta}>{selectedChild.class} • {selectedChild.lin}</Text>
            <Text style={styles.attendanceMeta}>Term Attendance: <Text style={{ color: '#10b981', fontWeight: '800' }}>{selectedChild.attendance}</Text></Text>
          </View>
        </View>

        {/* Finance Tab */}
        {activeTab === 'finance' && (
          <View>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceTitle}>Outstanding School Fees (Term II)</Text>
              <Text style={[styles.balanceAmount, { color: selectedChild.balance > 0 ? '#ef4444' : '#10b981' }]}>
                UGX {selectedChild.balance.toLocaleString()}
              </Text>
              <Text style={styles.balanceStatus}>
                {selectedChild.balance > 0 ? 'Payment due before End of Term Examinations' : 'All fees fully settled. Thank you!'}
              </Text>

              {selectedChild.balance > 0 && (
                <View style={styles.payButtonsRow}>
                  <TouchableOpacity style={[styles.momoBtn, { backgroundColor: '#facc15' }]} onPress={() => handlePayMobileMoney('MTN')}>
                    <Text style={[styles.momoBtnText, { color: '#000000' }]}>MTN MoMo Pay</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.momoBtn, { backgroundColor: '#dc2626' }]} onPress={() => handlePayMobileMoney('Airtel')}>
                    <Text style={[styles.momoBtnText, { color: '#ffffff' }]}>Airtel Money</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <Text style={styles.sectionTitle}>Recent Receipts & Ledger</Text>
            {[
              { id: 'REC-901', term: 'Term II Tuition Deposit', amount: 'UGX 850,000', date: '2026-05-12', mode: 'MTN Mobile Money' },
              { id: 'REC-744', term: 'Term I Clearance', amount: 'UGX 1,300,000', date: '2026-02-04', mode: 'Centenary Bank Agent' },
            ].map(r => (
              <View key={r.id} style={styles.receiptCard}>
                <View style={styles.cardHead}>
                  <Text style={styles.receiptId}>{r.id} • {r.term}</Text>
                  <Text style={styles.receiptAmount}>{r.amount}</Text>
                </View>
                <Text style={styles.receiptMeta}>{r.date} • Paid via {r.mode}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Academics Tab */}
        {activeTab === 'academics' && (
          <View>
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryBadgeText}>Terminal Standing: {selectedChild.division}</Text>
            </View>

            <View style={styles.reportTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 2 }]}>Subject</Text>
                <Text style={styles.th}>AOI (20%)</Text>
                <Text style={styles.th}>EOT (80%)</Text>
                <Text style={styles.th}>Final</Text>
                <Text style={styles.th}>Grade</Text>
              </View>

              {REPORT_CARD_MUKASA.map((r, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tdSubject, { flex: 2 }]}>{r.subject}</Text>
                  <Text style={styles.td}>{r.aoi}</Text>
                  <Text style={styles.td}>{r.eot}</Text>
                  <Text style={[styles.td, { fontWeight: '700', color: '#6366f1' }]}>{r.total}%</Text>
                  <Text style={[styles.tdGrade, { color: r.grade.startsWith('D') ? '#10b981' : '#f59e0b' }]}>{r.grade}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Exeat Tab */}
        {activeTab === 'exeat' && (
          <View>
            <View style={styles.exeatCard}>
              <Text style={styles.exeatTitle}>Boarding Leave Pass Pending Approval</Text>
              <Text style={styles.exeatMeta}>Destination: Jinja (Family Funeral)</Text>
              <Text style={styles.exeatMeta}>Departure: 2026-06-12 08:30 • Expected Return: 2026-06-14 17:00</Text>
              <Text style={styles.exeatOtp}>Generated OTP: 8492</Text>

              <TouchableOpacity style={styles.approveExeatBtn} onPress={handleApproveExeat}>
                <Text style={styles.approveExeatBtnText}>Authorize Gate Pass with OTP</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f19' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  childBar: { paddingHorizontal: 16, paddingTop: 12 },
  childBarLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  childPills: { flexDirection: 'row', gap: 8 },
  childPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1e293b' },
  childPillActive: { backgroundColor: '#6366f1' },
  childPillText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  childPillTextActive: { color: '#ffffff', fontWeight: '700' },
  tabRow: { flexDirection: 'row', backgroundColor: '#131927', padding: 4, marginHorizontal: 16, marginTop: 12, borderRadius: 10 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#6366f1' },
  tabText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#ffffff', fontWeight: '700' },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#131927', borderRadius: 12, padding: 14, marginVertical: 12, borderWidth: 1, borderColor: '#1e293b' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#ffffff', fontWeight: '800', fontSize: 18 },
  profileInfo: { flex: 1 },
  studentName: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  studentMeta: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  attendanceMeta: { color: '#cbd5e1', fontSize: 12, marginTop: 4 },
  balanceCard: { backgroundColor: '#131927', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#1e293b' },
  balanceTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  balanceAmount: { fontSize: 28, fontWeight: '800', marginVertical: 6 },
  balanceStatus: { color: '#cbd5e1', fontSize: 12, marginBottom: 14 },
  payButtonsRow: { flexDirection: 'row', gap: 10 },
  momoBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  momoBtnText: { fontWeight: '800', fontSize: 13 },
  sectionTitle: { color: '#ffffff', fontSize: 15, fontWeight: '700', marginBottom: 8 },
  receiptCard: { backgroundColor: '#131927', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1e293b' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptId: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  receiptAmount: { color: '#10b981', fontSize: 14, fontWeight: '800' },
  receiptMeta: { color: '#94a3b8', fontSize: 11, marginTop: 4 },
  summaryBadge: { backgroundColor: '#1e1b4b', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#3730a3' },
  summaryBadgeText: { color: '#c7d2fe', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  reportTable: { backgroundColor: '#131927', borderRadius: 10, borderWidth: 1, borderColor: '#1e293b', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1e293b', padding: 10 },
  th: { flex: 1, color: '#94a3b8', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  tableRow: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
  tdSubject: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  td: { flex: 1, color: '#94a3b8', fontSize: 12, textAlign: 'center' },
  tdGrade: { flex: 1, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  exeatCard: { backgroundColor: '#131927', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1e293b' },
  exeatTitle: { color: '#ffffff', fontSize: 15, fontWeight: '700', marginBottom: 6 },
  exeatMeta: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  exeatOtp: { color: '#fbbf24', fontSize: 16, fontWeight: '800', marginVertical: 10 },
  approveExeatBtn: { backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  approveExeatBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' }
});
