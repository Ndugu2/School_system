import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, FileText, Lock } from 'lucide-react';
import { api } from '../services/api';

const gradeTone = (grade) => grade?.startsWith('D') ? '#15803d' : grade?.startsWith('C') ? '#2563eb' : grade?.startsWith('P') ? '#b45309' : '#dc2626';

export default function ParentGrades({ viewer = 'parent' }) {
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => { api.get('/students').then(data => { setChildren(data); setChildId(data[0]?._id || ''); }).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    if (!childId) return;
    setLoading(true);
    api.get(`/exam-results?student=${childId}&term=${encodeURIComponent(term)}&academicYear=${year}`)
      .then(data => setResults(data.results || [])).catch(() => setResults([])).finally(() => setLoading(false));
  }, [childId, term, year]);

  const subjects = useMemo(() => Object.values(results.reduce((all, result) => {
    const key = result.subject?._id || result.subject?.name;
    if (!all[key]) all[key] = { name: result.subject?.name || 'Subject', bot: null, mot: null, eot: null, total: 0, grade: '' };
    const mark = result.percentage ?? Math.round((result.marksObtained / result.maxMarks) * 100);
    if (result.examType === 'BOT') all[key].bot = mark;
    if (result.examType === 'MOT') all[key].mot = mark;
    if (result.examType === 'EOT') all[key].eot = mark;
    all[key].total = Math.round((all[key].bot || 0) * .15 + (all[key].mot || 0) * .15 + (all[key].eot || 0) * .70);
    all[key].grade = result.examType === 'EOT' ? result.grade : all[key].grade;
    return all;
  }, {})), [results]);
  const child = children.find(item => item._id === childId);

  const isStudent = viewer === 'student';
  if (!loading && !children.length) return <div style={s.empty}>{isStudent ? 'Your student profile is not linked to this account. Please contact the school office.' : 'No learner is linked to this parent account. Ask the school to confirm your guardian email or parent portal link.'}</div>;
  return <div style={s.page}>
    <div><h2 style={s.title}>{isStudent ? 'My Grades & Reports' : 'Grades & Reports'}</h2><p style={s.subtitle}>Published results only. Marks remain private until approved by the school.</p></div>
    <div style={s.controls}>
      <label style={s.label}>{isStudent ? 'Student' : 'Learner'}<select value={childId} onChange={e => setChildId(e.target.value)} style={s.select} disabled={isStudent}>{children.map(child => <option key={child._id} value={child._id}>{child.user?.name} · {child.currentClassLevel || 'Class pending'}</option>)}</select></label>
      <label style={s.label}>Term<select value={term} onChange={e => setTerm(e.target.value)} style={s.select}><option>Term 1</option><option>Term 2</option><option>Term 3</option></select></label>
    </div>
    <div style={s.notice}><Lock size={17}/><span>Official results are shown after the school has reviewed and published them.</span></div>
    <section style={s.card}>
      <div style={s.cardHeader}><div><h3 style={s.cardTitle}>{child?.user?.name || 'Learner'}’s results</h3><p style={s.small}>{term} {year} · Uganda O-Level scale</p></div><CheckCircle2 size={22} color="#16a34a"/></div>
      {loading ? <p style={s.empty}>Loading published results…</p> : subjects.length ? <div style={s.tableWrap}><table style={s.table}><thead><tr><th>Subject</th><th>BOT (15%)</th><th>MOT (15%)</th><th>EOT (70%)</th><th>Final total</th><th>Grade</th></tr></thead><tbody>{subjects.map(subject => <tr key={subject.name}><td style={s.subject}>{subject.name}</td><td>{subject.bot ?? '—'}</td><td>{subject.mot ?? '—'}</td><td>{subject.eot ?? '—'}</td><td style={s.total}>{subject.total}%</td><td><span style={{...s.grade, color: gradeTone(subject.grade), background: `${gradeTone(subject.grade)}18`}}>{subject.grade || '—'}</span></td></tr>)}</tbody></table></div> : <div style={s.empty}><BookOpen size={30}/><p>No published results are available for this term yet.</p></div>}
    </section>
    <div style={s.help}><FileText size={18}/><span>Need clarification about a published result? Use <strong>School Messages</strong> to contact the school.</span></div>
  </div>;
}

const s = { page: { display: 'flex', flexDirection: 'column', gap: 20 }, title: { margin: 0, fontSize: 24, color: 'var(--text-primary)' }, subtitle: { color: 'var(--text-secondary)', margin: '5px 0 0' }, controls: { display: 'flex', gap: 16, flexWrap: 'wrap', padding: 20, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12 }, label: { display: 'flex', flexDirection: 'column', gap: 7, fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)' }, select: { minWidth: 230, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14 }, notice: { display: 'flex', alignItems: 'center', gap: 9, padding: '12px 15px', borderRadius: 9, background: '#eff6ff', color: '#1d4ed8', fontSize: 13, fontWeight: 600 }, card: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }, cardHeader: { padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, cardTitle: { margin: 0, color: 'var(--text-primary)', fontSize: 17 }, small: { margin: '5px 0 0', color: 'var(--text-tertiary)', fontSize: 12 }, tableWrap: { overflowX: 'auto' }, table: { width: '100%', borderCollapse: 'collapse', minWidth: 620 }, subject: { fontWeight: 700, color: 'var(--text-primary)' }, total: { fontWeight: 800, color: 'var(--text-primary)' }, grade: { display: 'inline-block', minWidth: 34, padding: '4px 8px', borderRadius: 12, fontWeight: 800, textAlign: 'center' }, empty: { minHeight: 155, display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 8, color: 'var(--text-tertiary)', textAlign: 'center', padding: 20 }, help: { display: 'flex', alignItems: 'center', gap: 9, color: 'var(--text-secondary)', fontSize: 13, padding: 4 } };
