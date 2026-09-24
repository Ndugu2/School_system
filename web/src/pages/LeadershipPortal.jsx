import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, ArrowRight, BarChart3, BookOpen, CalendarCheck2, CircleDollarSign, ClipboardCheck, Clock3, GraduationCap, ShieldCheck, UserRoundCheck, Users, WalletCards } from 'lucide-react';

const makeStat = (label, value, icon, color, note) => ({ label, value, icon, color, note });

export default function LeadershipPortal({ type, setCurrentTab }) {
  const { user } = useAuth();
  const isHeadteacher = type === 'headteacher';
  const isHod = type === 'hod';
  const [data, setData] = useState({ students: 0, teachers: 0, attendance: null, results: [], fees: null, overdue: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const year = new Date().getFullYear();
    Promise.allSettled([
      api.get('/students'),
      api.get('/attendance/analytics?term=Term 1'),
      api.get(`/exam-results?term=Term 1&academicYear=${year}&limit=100`),
      isHeadteacher ? api.get(`/fees/reports/class-summary?term=Term 1&academicYear=${year}`) : Promise.resolve(null),
      api.get('/teachers'),
      isHeadteacher ? api.get(`/fees/reports/overdue-students?term=Term 1&academicYear=${year}`) : Promise.resolve([]),
    ]).then(([students, attendance, results, fees, teachers, overdue]) => {
      if (!mounted) return;
      setData({
        students: students.status === 'fulfilled' ? students.value.length : 0,
        attendance: attendance.status === 'fulfilled' ? attendance.value : null,
        results: results.status === 'fulfilled' ? results.value.results || [] : [],
        fees: fees.status === 'fulfilled' ? fees.value.totalCollected ?? 0 : null,
        teachers: teachers.status === 'fulfilled' ? teachers.value.length : 0,
        overdue: overdue.status === 'fulfilled' ? overdue.value.students || overdue.value || [] : [],
      });
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [isHeadteacher]);

  const drafts = data.results.filter((item) => ['draft', 'submitted', 'hod-approved'].includes(item.approvalStatus)).length;
  const published = data.results.filter((item) => item.approvalStatus === 'published').length;
  const attendanceRate = data.attendance?.weekly?.rate ?? 0;

  const cards = isHeadteacher
    ? [
        makeStat('Total learners', loading ? '...' : data.students, Users, '#2563eb', 'Current enrollment'),
        makeStat('Weekly attendance', loading ? '...' : `${attendanceRate}%`, CalendarCheck2, '#0f9f79', 'Whole-school rate'),
        makeStat('Fee collections', loading || data.fees === null ? '...' : `UGX ${Number(data.fees).toLocaleString('en-UG')}`, CircleDollarSign, '#b7791f', 'Term 1 collections'),
        makeStat('Teaching staff', loading ? '...' : data.teachers, UserRoundCheck, '#7c3aed', 'Active teacher profiles')
      ]
    : [
        makeStat(isHod ? 'Learners in department' : 'Learners tracked', loading ? '...' : data.students, Users, '#2563eb', isHod ? 'Academic oversight' : 'Across school academics'),
        makeStat('Weekly attendance', loading ? '...' : `${attendanceRate}%`, CalendarCheck2, '#0f9f79', 'Current academic term'),
        makeStat(isHod ? 'Results for review' : 'Results awaiting review', loading ? '...' : drafts, ClipboardCheck, '#d97706', isHod ? 'Submitted or draft assessments' : 'Draft assessment entries'),
        makeStat('Published results', loading ? '...' : published, GraduationCap, '#7c3aed', 'Available to families')
      ];

  const actions = isHeadteacher
    ? [
        ['Student records', 'Review enrolment and welfare', 'students', Users],
        ['Academic reports', 'Review school performance', 'reports', BarChart3],
        ['Finance overview', 'Monitor collections and spend', 'finance', CircleDollarSign],
        ['Staff oversight', 'Review staff and leave activity', 'hr', UserRoundCheck],
      ]
    : [
        ['Review assessment', 'Approve and publish results', 'grades', ClipboardCheck],
        ['Attendance trends', 'Identify learners needing support', 'attendance', CalendarCheck2],
      [isHod ? 'Department classes' : 'Classes & subjects', 'Review academic allocation', 'classes', BookOpen],
      [isHod ? 'Teacher performance' : 'Teacher coverage', 'Check subject assignment and workload', 'teachers', UserRoundCheck],
      ];

  return (
    <div style={s.page}>
      <section style={s.hero}>
        <div>
          <p style={s.eyebrow}>Leadership workspace</p>
            <h1 style={s.title}>{isHeadteacher ? 'Headteacher Portal' : isHod ? 'HOD Portal' : 'Director of Studies Portal'}</h1>
          <p style={s.subtitle}>
            Good day, {user?.name || 'Leader'}. {isHeadteacher ? 'See school health, priorities, and decisions that need your attention.' : isHod ? 'Coordinate your department, review assessment quality, and support teachers.' : 'Oversee academic quality, assessment progress, and learning outcomes.'}
          </p>
        </div>
        <div style={s.date}>{new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      </section>

      <section style={s.cards}>
        {cards.map(({ label, value, icon: Icon, color, note }) => (
          <article key={label} style={s.card}>
            <span style={{ ...s.cardIcon, color, background: `${color}16` }}><Icon size={20} /></span>
            <div>
              <p style={s.label}>{label}</p>
              <strong style={s.value}>{value}</strong>
              <small style={s.note}>{note}</small>
            </div>
          </article>
        ))}
      </section>

      <section style={s.grid}>
        <article style={s.panel}>
          <p style={s.eyebrow}>Priority actions</p>
          <h2 style={s.heading}>{isHeadteacher ? 'School leadership centre' : 'Academic quality centre'}</h2>
          <div style={s.actions}>
            {actions.map(([label, note, tab, Icon]) => (
              <button key={tab} style={s.action} onClick={() => setCurrentTab(tab)}>
                <Icon size={18} />
                <span><strong>{label}</strong><small>{note}</small></span>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </article>

        <article style={s.panel}>
            <p style={s.eyebrow}>Academic snapshot</p>
            <h2 style={s.heading}>{isHod ? 'Department readiness' : 'Assessment readiness'}</h2>
          <div style={s.metrics}>
            <span>Published results <strong>{published}</strong></span>
            <span>Draft results requiring review <strong>{drafts}</strong></span>
            <span>Attendance this week <strong>{attendanceRate}%</strong></span>
          </div>
          <button onClick={() => setCurrentTab('reports')} style={s.primary}>Open reports <ArrowRight size={16} /></button>
        </article>
      </section>

      {!isHeadteacher && (
        <section style={s.grid}>
          <article style={s.panel}>
            <div style={s.panelTop}>
              <div>
                <p style={s.eyebrow}>Requires attention</p>
                <h2 style={s.heading}>Academic alerts</h2>
              </div>
              <AlertTriangle color="#c2410c" size={20} />
            </div>
            <div style={s.alerts}>
              <Alert icon={CalendarCheck2} color="#c2410c" title={`${data.attendance?.frequentlyAbsent?.length || 0} learners need attendance follow-up`} note="Frequent absences recorded this term" tab="attendance" go={setCurrentTab} />
              <Alert icon={Clock3} color="#a16207" title={`${drafts} results await academic review`} note="Draft assessment entries still open" tab="grades" go={setCurrentTab} />
              <Alert icon={Users} color="#0f766e" title={`${data.teachers || 0} teachers are on current timetable`} note="Subject coverage across classes" tab="teachers" go={setCurrentTab} />
            </div>
          </article>

          <article style={s.panel}>
            <p style={s.eyebrow}>Decision desk</p>
            <h2 style={s.heading}>Curriculum oversight</h2>
            <div style={s.decisions}>
              <Decision icon={ShieldCheck} title="Review academic results" note="Approve verified department marks" tab="grades" go={setCurrentTab} />
              <Decision icon={BookOpen} title="Monitor subject allocation" note="Check teaching loads and coverage" tab="classes" go={setCurrentTab} />
              <Decision icon={Users} title="Communicate with families" note="Open parent and staff messages" tab="messages" go={setCurrentTab} />
            </div>
          </article>
        </section>
      )}

      {isHeadteacher && (
        <section style={s.grid}>
          <article style={s.panel}>
            <div style={s.panelTop}>
              <div>
                <p style={s.eyebrow}>Requires attention</p>
                <h2 style={s.heading}>Leadership alerts</h2>
              </div>
              <AlertTriangle color="#c2410c" size={20} />
            </div>
            <div style={s.alerts}>
              <Alert icon={CalendarCheck2} color="#c2410c" title={`${loading ? '...' : data.attendance?.frequentlyAbsent?.length || 0} learners need attendance follow-up`} note="Frequent absences recorded this term" tab="attendance" go={setCurrentTab} />
              <Alert icon={Clock3} color="#a16207" title={`${loading ? '...' : drafts} results await academic review`} note="Draft assessment entries still open" tab="grades" go={setCurrentTab} />
              <Alert icon={WalletCards} color="#6d28d9" title={`${loading ? '...' : data.overdue.length} fee accounts require follow-up`} note="Outstanding balances for the current term" tab="fees" go={setCurrentTab} />
            </div>
          </article>

          <article style={s.panel}>
            <p style={s.eyebrow}>Decision desk</p>
            <h2 style={s.heading}>Approvals & oversight</h2>
            <div style={s.decisions}>
              <Decision icon={ShieldCheck} title="Review academic results" note="Publish only verified reports" tab="grades" go={setCurrentTab} />
              <Decision icon={CalendarCheck2} title="Review events & calendar" note="Confirm priority school activities" tab="operations" go={setCurrentTab} />
              <Decision icon={Users} title="Communicate with families" note="Open parent and staff messages" tab="messages" go={setCurrentTab} />
            </div>
          </article>
        </section>
      )}
    </div>
  );
}

function Alert({ icon: Icon, color, title, note, tab, go }) {
  return <button style={s.alert} onClick={() => go(tab)}><span style={{ ...s.smallIcon, color, background: `${color}14` }}><Icon size={17} /></span><span><strong>{title}</strong><small>{note}</small></span><ArrowRight size={16} /></button>;
}

function Decision({ icon: Icon, title, note, tab, go }) {
  return <button style={s.decision} onClick={() => go(tab)}><Icon size={18} /><span><strong>{title}</strong><small>{note}</small></span></button>;
}

const s = {
  page: { display: 'flex', flexDirection: 'column', gap: 20 },
  hero: { display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', padding: '27px 28px', borderRadius: 16, background: 'linear-gradient(125deg,#f0eaff,#f8faff)', border: '1px solid #e3d8ff' },
  eyebrow: { margin: 0, color: '#6322e5', fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' },
  title: { margin: '7px 0 5px', color: '#1b1935', fontSize: 28 },
  subtitle: { margin: 0, color: '#62617a', fontSize: 14 },
  date: { padding: '9px 12px', border: '1px solid #e1d9f5', borderRadius: 9, background: '#fff', color: '#55516e', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 14 },
  card: { display: 'flex', gap: 13, alignItems: 'center', padding: 17, border: '1px solid var(--border)', borderRadius: 13, background: 'var(--bg-secondary)', boxShadow: 'var(--shadow-sm)' },
  cardIcon: { width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 10 },
  label: { margin: 0, color: 'var(--text-secondary)', fontSize: 12 },
  value: { display: 'block', margin: '3px 0', color: 'var(--text-primary)', fontSize: 21 },
  note: { color: 'var(--text-tertiary)', fontSize: 11 },
  grid: { display: 'grid', gridTemplateColumns: '1.25fr .75fr', gap: 18 },
  panel: { padding: 22, border: '1px solid var(--border)', borderRadius: 14, background: 'var(--bg-secondary)', boxShadow: 'var(--shadow-sm)' },
  panelTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  heading: { margin: '5px 0 18px', color: 'var(--text-primary)', fontSize: 18 },
  actions: { display: 'flex', flexDirection: 'column', gap: 8 },
  action: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 12, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-primary)', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer' },
  metrics: { display: 'flex', flexDirection: 'column', gap: 12 },
  primary: { marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 700 },
  alerts: { display: 'flex', flexDirection: 'column', gap: 10 },
  alert: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 12, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-primary)', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer' },
  smallIcon: { width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 8 },
  decisions: { display: 'flex', flexDirection: 'column', gap: 10 },
  decision: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 12, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-primary)', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer' },
};


