import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, BookOpen, CalendarCheck2, CheckCircle2, ClipboardList, GraduationCap, Users } from 'lucide-react';

export default function TeacherDashboard({ setCurrentTab }) {
  const { user } = useAuth();
  const [data, setData] = useState({ classes: [], students: [], results: [], attendance: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadTeacherDashboard = async () => {
      const [classesResult, studentsResult, resultsResult, attendanceResult] = await Promise.allSettled([
        api.get('/classes'),
        api.get('/students'),
        api.get(`/exam-results?term=Term 1&academicYear=${new Date().getFullYear()}&limit=100`),
        api.get('/attendance/analytics?term=Term 1'),
      ]);

      if (!isMounted) return;
      setData({
        classes: classesResult.status === 'fulfilled' ? classesResult.value : [],
        students: studentsResult.status === 'fulfilled' ? studentsResult.value : [],
        results: resultsResult.status === 'fulfilled' ? resultsResult.value.results || [] : [],
        attendance: attendanceResult.status === 'fulfilled' ? attendanceResult.value : null,
      });
      setLoading(false);
    };

    loadTeacherDashboard();
    return () => { isMounted = false; };
  }, []);

  const navigateTo = (tab) => setCurrentTab(tab);
  const draftResults = data.results.filter((result) => result.approvalStatus === 'draft').length;
  const publishedResults = data.results.filter((result) => result.approvalStatus === 'published').length;
  const attendanceRate = data.attendance?.weekly?.rate ?? 0;

  const statCards = [
    { label: 'My Classes', value: loading ? '...' : data.classes.length, icon: BookOpen, accent: '#2563eb' },
    { label: 'Learners', value: loading ? '...' : data.students.length, icon: Users, accent: '#0f9f79' },
    { label: 'Weekly Attendance', value: loading ? '...' : `${attendanceRate}%`, icon: CalendarCheck2, accent: '#d97706' },
    { label: 'Marks To Review', value: loading ? '...' : draftResults, icon: ClipboardList, accent: '#c2410c' },
  ];

  return (
    <div style={styles.page}>
      <section style={styles.welcome}>
        <div>
          <p style={styles.eyebrow}>Teacher workspace</p>
          <h1 style={styles.title}>Good morning, {user?.name || 'Teacher'}</h1>
          <p style={styles.subtitle}>Your classes, attendance, and assessment work in one place.</p>
        </div>
        <div style={styles.dateBadge}>{new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      </section>

      <section style={styles.statsGrid}>
        {statCards.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} style={styles.statCard}>
            <div style={{ ...styles.statIcon, color: accent, background: `${accent}14` }}><Icon size={19} /></div>
            <div><div style={styles.statLabel}>{label}</div><strong style={styles.statValue}>{value}</strong></div>
          </div>
        ))}
      </section>

      <section style={styles.grid}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}><div><p style={styles.eyebrow}>Teaching load</p><h2 style={styles.panelTitle}>Assigned classes</h2></div><button style={styles.linkButton} onClick={() => navigateTo('classes')}>View classes <ArrowRight size={15} /></button></div>
          {loading ? <div style={styles.empty}>Loading assigned classes...</div> : data.classes.length === 0 ? <div style={styles.empty}>No classes assigned yet.</div> : (
            <div style={styles.classList}>
              {data.classes.slice(0, 5).map((classItem) => (
                <button key={classItem._id} style={styles.classRow} onClick={() => navigateTo('attendance')}>
                  <span style={styles.classMark}>{classItem.level}</span>
                  <span style={styles.classInfo}><strong>{classItem.name}</strong><small>{classItem.streams?.length || 0} streams · {classItem.currentEnrollment || 0} learners</small></span>
                  <ArrowRight size={16} color="#94a3b8" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}><div><p style={styles.eyebrow}>Assessment centre</p><h2 style={styles.panelTitle}>Marking progress</h2></div><GraduationCap size={22} color="#2563eb" /></div>
          <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${loading ? 0 : data.results.length ? Math.round((publishedResults / data.results.length) * 100) : 0}%` }} /></div>
          <div style={styles.progressMeta}><span>{loading ? '...' : publishedResults} published</span><span>{loading ? '...' : draftResults} drafts</span></div>
          <p style={styles.helper}>Enter BOT, MOT, and EOT marks, then submit completed work for review.</p>
          <button style={styles.primaryButton} onClick={() => navigateTo('grades')}>Open mark entry <ArrowRight size={16} /></button>
        </div>
      </section>

      <section style={styles.actionStrip}>
        <button style={styles.actionButton} onClick={() => navigateTo('attendance')}><CalendarCheck2 size={18} /><span><strong>Take attendance</strong><small>Record today’s register</small></span><ArrowRight size={16} /></button>
        <button style={styles.actionButton} onClick={() => navigateTo('grades')}><ClipboardList size={18} /><span><strong>Enter exam results</strong><small>Update learner marks</small></span><ArrowRight size={16} /></button>
        <button style={styles.actionButton} onClick={() => navigateTo('lms')}><BookOpen size={18} /><span><strong>Learning materials</strong><small>Open course resources</small></span><ArrowRight size={16} /></button>
      </section>

      <section style={styles.notice}><CheckCircle2 size={18} color="#0f9f79" /><span>{loading ? 'Loading attendance data...' : `Attendance is at ${attendanceRate}% for the current week.`}</span><button onClick={() => navigateTo('reports')}>View reports</button></section>
    </div>
  );
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: 20, color: '#17233b' },
  welcome: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, padding: '24px 26px', borderRadius: 16, background: 'linear-gradient(125deg, #e8f2ff, #f8fbff)', border: '1px solid #d7e5f5' },
  eyebrow: { margin: 0, color: '#2563eb', fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' },
  title: { margin: '7px 0 5px', fontSize: 28, color: '#13213b' },
  subtitle: { margin: 0, color: '#5d6c83', fontSize: 14 },
  dateBadge: { padding: '9px 12px', borderRadius: 9, background: '#fff', border: '1px solid #d7e5f5', color: '#52627a', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 },
  statCard: { display: 'flex', alignItems: 'center', gap: 13, padding: 17, background: '#fff', border: '1px solid #e1e8f0', borderRadius: 13, boxShadow: '0 5px 18px rgba(31, 53, 82, 0.06)' },
  statIcon: { width: 39, height: 39, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  statLabel: { color: '#68778d', fontSize: 12, marginBottom: 4 },
  statValue: { color: '#182640', fontSize: 23 },
  grid: { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18 },
  panel: { padding: 21, background: '#fff', border: '1px solid #e1e8f0', borderRadius: 14, boxShadow: '0 5px 18px rgba(31, 53, 82, 0.06)' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 17 },
  panelTitle: { margin: '5px 0 0', fontSize: 18, color: '#182640' },
  linkButton: { display: 'flex', alignItems: 'center', gap: 5, border: 0, background: 'transparent', color: '#2563eb', fontWeight: 700, cursor: 'pointer' },
  classList: { display: 'flex', flexDirection: 'column', gap: 8 },
  classRow: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 8px', border: 0, borderBottom: '1px solid #edf1f5', background: 'transparent', textAlign: 'left', cursor: 'pointer' },
  classMark: { width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: '#e8f2ff', color: '#2563eb', fontWeight: 800, fontSize: 12 },
  classInfo: { display: 'flex', flexDirection: 'column', gap: 3, flex: 1, color: '#253650', fontSize: 14 },
  classInfoSmall: { color: '#8491a3' },
  empty: { padding: '25px 8px', color: '#7c8ba0', fontSize: 14 },
  progressTrack: { height: 11, overflow: 'hidden', borderRadius: 99, background: '#e9eff6' },
  progressFill: { height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #2563eb, #0f9f79)', transition: 'width 400ms ease' },
  progressMeta: { display: 'flex', justifyContent: 'space-between', marginTop: 10, color: '#63738a', fontSize: 12, fontWeight: 700 },
  helper: { margin: '18px 0', color: '#66758a', fontSize: 13, lineHeight: 1.5 },
  primaryButton: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: 0, borderRadius: 8, background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  actionStrip: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  actionButton: { display: 'flex', alignItems: 'center', gap: 11, padding: 15, border: '1px solid #dce6f0', borderRadius: 11, background: '#fafdff', color: '#2563eb', textAlign: 'left', cursor: 'pointer' },
  actionButtonSpan: { flex: 1 },
  notice: { display: 'flex', alignItems: 'center', gap: 9, padding: '12px 15px', borderRadius: 10, background: '#edfaf5', border: '1px solid #c9efdf', color: '#22634e', fontSize: 13 },
  noticeButton: { marginLeft: 'auto', border: 0, background: 'transparent', color: '#0f9f79', fontWeight: 800, cursor: 'pointer' },
};
