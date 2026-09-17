import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';

const MODULES = [
  { id: '1', subject: 'Chemistry (S3)', title: 'Periodic Table & Chemical Bonding', teacher: 'Tr. Sarah Nakato', size: '2.4 MB PDF', status: 'downloaded' },
  { id: '2', subject: 'Biology (S3)', title: 'Cell Biology & Plant Respiration Notes', teacher: 'Tr. James Okello', size: '1.8 MB PDF', status: 'available' },
  { id: '3', subject: 'Mathematics (S3)', title: 'Quadratic Equations & UNEB Past Papers', teacher: 'Tr. Peter Mugisha', size: '4.1 MB PDF', status: 'available' },
  { id: '4', subject: 'Computer Studies (S3)', title: 'ICT Practical Exercise • Spreadsheet Data', teacher: 'Tr. Robert Wasswa', size: '1.2 MB XLSX', status: 'downloaded' },
];

const BORROWED_BOOKS = [
  { title: 'Song of Lawino & Song of Ocol', author: 'Okot p’Bitek', due: '2026-07-01', status: 'Active Loan' },
  { title: 'Comprehensive Chemistry (S1 - S4)', author: 'Dr. J. Byamukama', due: '2026-06-10', status: 'Overdue Clearance' },
];

export default function StudentPortal() {
  const [activeTab, setActiveTab] = useState<'lms' | 'library'>('lms');

  return (
    <View style={styles.container}>
      {/* Sub Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'lms' && styles.tabBtnActive]} onPress={() => setActiveTab('lms')}>
          <Text style={[styles.tabText, activeTab === 'lms' && styles.tabTextActive]}>Holiday E-Learning</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'library' && styles.tabBtnActive]} onPress={() => setActiveTab('library')}>
          <Text style={[styles.tabText, activeTab === 'library' && styles.tabTextActive]}>My Library Books</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* LMS Tab */}
        {activeTab === 'lms' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Holiday Course Modules (Term II)</Text>
            </View>

            {MODULES.map(m => (
              <View key={m.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.subjectText}>{m.subject}</Text>
                  <View style={[styles.statusPill, m.status === 'downloaded' ? styles.statusDownloaded : styles.statusAvailable]}>
                    <Text style={styles.statusPillText}>{m.status === 'downloaded' ? 'Offline Ready' : 'Download'}</Text>
                  </View>
                </View>
                <Text style={styles.moduleTitle}>{m.title}</Text>
                <Text style={styles.moduleTeacher}>Instructor: {m.teacher} • {m.size}</Text>

                <TouchableOpacity
                  style={[styles.openBtn, m.status === 'downloaded' ? styles.btnOpen : styles.btnDownload]}
                  onPress={() => Alert.alert('Study Material', `Opening ${m.title}`)}
                >
                  <Text style={styles.openBtnText}>{m.status === 'downloaded' ? 'Open & Study' : 'Download Module'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Library Tab */}
        {activeTab === 'library' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Issued Library Textbooks</Text>
            </View>

            {BORROWED_BOOKS.map((b, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.bookTitle}>{b.title}</Text>
                  <View style={[styles.statusPill, b.status.includes('Overdue') ? styles.statusOverdue : styles.statusDownloaded]}>
                    <Text style={styles.statusPillText}>{b.status}</Text>
                  </View>
                </View>
                <Text style={styles.moduleTeacher}>by {b.author}</Text>
                <Text style={styles.dueText}>Due Date: <Text style={{ color: b.status.includes('Overdue') ? '#ef4444' : '#6366f1', fontWeight: '700' }}>{b.due}</Text></Text>
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
  sectionHeader: { marginVertical: 12 },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: '#131927', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#1e293b' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  subjectText: { color: '#fbbf24', fontSize: 12, fontWeight: '700' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  statusDownloaded: { backgroundColor: '#10b981' },
  statusAvailable: { backgroundColor: '#6366f1' },
  statusOverdue: { backgroundColor: '#ef4444' },
  moduleTitle: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  moduleTeacher: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  dueText: { color: '#cbd5e1', fontSize: 12, marginTop: 6 },
  openBtn: { marginTop: 12, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnOpen: { backgroundColor: '#10b981' },
  btnDownload: { backgroundColor: '#4f46e5' },
  openBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  bookTitle: { color: '#ffffff', fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 }
});
