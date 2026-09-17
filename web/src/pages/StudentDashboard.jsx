import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Award, CalendarCheck2, CreditCard, FileText, GraduationCap } from 'lucide-react';

export default function StudentDashboard({ setCurrentTab }) {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadStudentDashboard = async () => {
      const studentsResult = await api.get('/students').catch(() => []);
      const currentStudent = studentsResult.find((candidate) => (
        String(candidate.user?._id) === String(user?.id || user?._id)
        || candidate.user?.email === user?.email
      )) || null;
      if (!currentStudent) {
        if (isMounted) setLoading(false);
        return;
      }

      const [resultsResult, attendanceResult] = await Promise.allSettled([
        api.get(`/exam-results?student=${currentStudent._id}&term=Term 1&academicYear=${new Date().getFullYear()}&approvalStatus=published`),
        api.get(`/attendance?studentId=${currentStudent._id}&term=Term 1`),
      ]);

      if (!isMounted) return;
      setStudent(currentStudent);
      setResults(resultsResult.status === 'fulfilled' ? resultsResult.value.results || [] : []);
      setAttendance(attendanceResult.status === 'fulfilled' ? attendanceResult.value : []);
      setLoading(false);
    };

    loadStudentDashboard();
    return () => { isMounted = false; };
  }, [user?.email, user?.id || user?._id]);

  const present = attendance.filter(record => ['Present', 'present'].includes(record.status)).length;
  const attendanceRate = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
  const averageScore = results.length ? Math.round(results.reduce((total, result) => total + (result.percentage || 0), 0) / results.length) : 0;
  const navigateTo = (tab) => setCurrentTab(tab);

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Student dashboard</p>
          <h1 style={styles.title}>Welcome back, {student?.user?.name || 'Student'}</h1>
          <p style={styles.subtitle}>{student?.studentId || 'Your learning journey at a glance'}</p>
        </div>
        <div style={styles.termBadge}>Term 1 · {new Date().getFullYear()}</div>
      </section>

      {loading ? <div style={styles.loading}>Loading your academic summary...</div> : !student ? <div style={styles.empty}>No student profile is linked to this account yet.</div> : (
        <>
          <section style={styles.statsGrid}>
            <div style={styles.statCard}><CalendarCheck2 size={20} color="#0f9f79" /><span><small>Attendance</small><strong>{attendanceRate}%</strong></span></div>
            <div style={styles.statCard}><Award size={20} color="#2563eb" /><span><small>Average score</small><strong>{averageScore}%</strong></span></div>
            <div style={styles.statCard}><GraduationCap size={20} color="#d97706" /><span><small>Class</small><strong>{student.currentClass?.name || student.currentClassLevel || 'Not assigned'}</strong></span></div>
            <div style={styles.statCard}><FileText size={20} color="#c2410c" /><span><small>Published results</small><strong>{results.length}</strong></span></div>
          </section>

          <section style={styles.grid}>
            <div style={styles.panel}>
              <div style={styles.panelHeader}><div><p style={styles.eyebrow}>Latest academic work</p><h2 style={styles.panelTitle}>My results</h2></div><button style={styles.linkButton} onClick={() => navigateTo('grades')}>Open grades <ArrowRight size={15} /></button></div>
              {results.length === 0 ? <p style={styles.empty}>No published results are available yet.</p> : <div style={styles.resultList}>{results.slice(0, 5).map(result => <div key={result._id} style={styles.resultRow}><span><strong>{result.subject?.name || 'Subject'}</strong><small>{result.examType} · {result.approvalStatus}</small></span><b>{result.percentage}%</b></div>)}</div>}
            </div>
            <div style={styles.panel}>
              <div style={styles.panelHeader}><div><p style={styles.eyebrow}>School life</p><h2 style={styles.panelTitle}>Quick access</h2></div><CreditCard size={21} color="#2563eb" /></div>
              <button style={styles.actionButton} onClick={() => navigateTo('attendance')}><CalendarCheck2 size={18} /><span><strong>Attendance</strong><small>Review your register</small></span><ArrowRight size={15} /></button>
              <button style={styles.actionButton} onClick={() => navigateTo('fees')}><CreditCard size={18} /><span><strong>Fees & invoices</strong><small>View your account</small></span><ArrowRight size={15} /></button>
              <button style={styles.actionButton} onClick={() => navigateTo('lms')}><GraduationCap size={18} /><span><strong>Learning materials</strong><small>Continue studying</small></span><ArrowRight size={15} /></button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: 20, color: '#17233b' },
  hero: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, padding: '25px 27px', borderRadius: 16, background: 'linear-gradient(125deg, #e9f7f3, #f8fbff)', border: '1px solid #d7ebe5' },
  eyebrow: { margin: 0, color: '#2563eb', fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' },
  title: { margin: '7px 0 5px', fontSize: 28, color: '#13213b' },
  subtitle: { margin: 0, color: '#64748b', fontSize: 14 },
  termBadge: { padding: '9px 12px', borderRadius: 9, background: '#fff', border: '1px solid #d7ebe5', color: '#52627a', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  loading: { padding: 30, color: '#64748b', background: '#fff', border: '1px solid #e1e8f0', borderRadius: 14 },
  empty: { padding: '25px 8px', color: '#7c8ba0', fontSize: 14 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 },
  statCard: { display: 'flex', alignItems: 'center', gap: 12, padding: 17, background: '#fff', border: '1px solid #e1e8f0', borderRadius: 13, boxShadow: '0 5px 18px rgba(31, 53, 82, 0.06)' },
  statCardSpan: { display: 'flex', flexDirection: 'column', gap: 4 },
  statCardSmall: { color: '#68778d', fontSize: 12 },
  statCardStrong: { color: '#182640', fontSize: 20 },
  grid: { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18 },
  panel: { padding: 21, background: '#fff', border: '1px solid #e1e8f0', borderRadius: 14, boxShadow: '0 5px 18px rgba(31, 53, 82, 0.06)' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 17 },
  panelTitle: { margin: '5px 0 0', fontSize: 18, color: '#182640' },
  linkButton: { display: 'flex', alignItems: 'center', gap: 5, border: 0, background: 'transparent', color: '#2563eb', fontWeight: 700, cursor: 'pointer' },
  resultList: { display: 'flex', flexDirection: 'column' },
  resultRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 4px', borderBottom: '1px solid #edf1f5', color: '#253650' },
  resultRowSpan: { display: 'flex', flexDirection: 'column', gap: 4 },
  resultRowSmall: { color: '#8491a3', fontSize: 11, textTransform: 'capitalize' },
  resultRowB: { color: '#0f9f79', fontSize: 18 },
  actionButton: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 8px', marginBottom: 7, border: 0, borderBottom: '1px solid #edf1f5', background: 'transparent', color: '#2563eb', textAlign: 'left', cursor: 'pointer' },
  actionButtonSpan: { display: 'flex', flexDirection: 'column', gap: 3, flex: 1 },
  actionButtonSmall: { color: '#8491a3', fontSize: 11 },
};
