import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import TeacherPortal from './screens/TeacherPortal';
import SupervisorPortal from './screens/SupervisorPortal';
import ParentPortal from './screens/ParentPortal';
import StudentPortal from './screens/StudentPortal';
import { UserRole } from './types';

export default function App() {
  const [activeRole, setActiveRole] = useState<UserRole>('teacher');

  const ROLES: { key: UserRole; label: string; icon: string }[] = [
    { key: 'teacher', label: 'Teacher', icon: '👨‍🏫' },
    { key: 'supervisor', label: 'Supervisor', icon: '🔍' },
    { key: 'parent', label: 'Parent', icon: '👨‍👩‍👧' },
    { key: 'student', label: 'Student', icon: '🎓' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />
      
      {/* Top Brand Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.crestCircle}>
            <Text style={styles.crestText}>NA</Text>
          </View>
          <View>
            <Text style={styles.schoolName}>Ndugu Secondary School</Text>
            <Text style={styles.termSub}>Term II, 2026 • Kampala, Uganda</Text>
          </View>
        </View>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.livePillText}>CONNECTED</Text>
        </View>
      </View>

      {/* Role Switcher Bar */}
      <View style={styles.roleContainer}>
        <Text style={styles.roleHeaderLabel}>Active User Role:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleScroll}>
          {ROLES.map(r => {
            const isActive = activeRole === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[styles.rolePill, isActive && styles.rolePillActive]}
                onPress={() => setActiveRole(r.key)}
              >
                <Text style={styles.roleIcon}>{r.icon}</Text>
                <Text style={[styles.roleLabel, isActive && styles.roleLabelActive]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Portal Views */}
      <View style={styles.portalBody}>
        {activeRole === 'teacher' && <TeacherPortal />}
        {activeRole === 'supervisor' && <SupervisorPortal />}
        {activeRole === 'parent' && <ParentPortal />}
        {activeRole === 'student' && <StudentPortal />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#131927',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  crestCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
  },
  schoolName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  termSub: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  livePillText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roleContainer: {
    backgroundColor: '#0b0f19',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  roleHeaderLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  roleScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  rolePillActive: {
    backgroundColor: '#6366f1',
    borderColor: '#818cf8',
  },
  roleIcon: {
    fontSize: 14,
  },
  roleLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  roleLabelActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  portalBody: {
    flex: 1,
  },
});
