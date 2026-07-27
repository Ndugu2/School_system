import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { BookOpen, User, Calendar, ChevronRight } from 'lucide-react';

export default function CourseList({ onSelectCourse }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch courses available for the logged-in user (student's class or teacher's assignments)
    api.get('/lms/courses')
      .then(setCourses)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>E-Learning Hub</h2>
          <p style={s.subtitle}>Access your holiday modules, assignments, and quizzes.</p>
        </div>
      </div>

      {loading ? (
        <div style={s.empty}>Loading courses…</div>
      ) : courses.length === 0 ? (
        <div style={s.empty}>No courses available right now.</div>
      ) : (
        <div style={s.grid}>
          {courses.map(course => (
            <div key={course._id} style={s.card} onClick={() => onSelectCourse(course)}>
              <div style={s.cardBanner}>
                <span style={s.gradeBadge}>{course.gradeLevel}</span>
                {course.isHolidayCourse && <span style={s.holidayBadge}>Holiday Pack</span>}
              </div>
              <div style={s.cardBody}>
                <h3 style={s.courseTitle}>{course.title}</h3>
                <p style={s.courseDesc}>{course.description || 'No description provided.'}</p>
                
                <div style={s.metaWrap}>
                  <div style={s.metaItem}><User size={14} /> {course.teacherName || 'TBD'}</div>
                  <div style={s.metaItem}><Calendar size={14} /> {course.term} {course.academicYear}</div>
                </div>

                <button style={s.enterBtn}>
                  Open Course <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 24 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' },
  subtitle: { fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 },
  card: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'pointer', transition: 'var(--transition)', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column' },
  cardBanner: { height: 100, background: 'linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%)', padding: 16, display: 'flex', gap: 8, alignItems: 'flex-start' },
  gradeBadge: { backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 },
  holidayBadge: { backgroundColor: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 },
  cardBody: { padding: 20, display: 'flex', flexDirection: 'column', flex: 1 },
  courseTitle: { fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 },
  courseDesc: { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1, marginBottom: 16 },
  metaWrap: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20, backgroundColor: 'var(--bg-tertiary)', padding: 12, borderRadius: 8 },
  metaItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 },
  enterBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 12, backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.2s' },
  empty: { padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 15 },
};
