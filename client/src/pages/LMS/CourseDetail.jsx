import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ArrowLeft, FileText, CheckSquare, MessageSquare, Download, Upload, PlayCircle, Plus, X, Flame, Award, Bot, Sparkles, Send } from 'lucide-react';

export default function CourseDetail({ course, onBack }) {
  const [activeTab, setActiveTab] = useState('modules');
  const [modules, setModules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);

  // States for quiz attempt
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});

  // Gamification & AI Tutor States
  const [gamification, setGamification] = useState({ points: 0, streak: 0, badges: [] });
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', text: "Hello! I'm your Homework Buddy. Ask me any hints or help you need with this course's topics!" }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/lms/courses/${course._id}/modules`),
      api.get(`/lms/courses/${course._id}/assignments`),
      api.get(`/lms/courses/${course._id}/quizzes`),
      api.get(`/lms/courses/${course._id}/discussion`),
      api.get('/lms/gamification-progress').catch(() => ({ points: 0, streak: 0, badges: [] })),
    ]).then(([modRes, assRes, qzRes, discRes, gamRes]) => {
      setModules(modRes);
      setAssignments(assRes);
      setQuizzes(qzRes);
      setDiscussions(discRes);
      setGamification(gamRes);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [course]);

  const submitQuiz = async () => {
    if (!activeQuiz) return;
    try {
      const answersArr = Object.entries(quizAnswers).map(([qId, ans]) => ({ questionId: qId, answer: ans }));
      const res = await api.post(`/lms/quizzes/${activeQuiz._id}/attempt`, { answers: answersArr });
      alert(`Quiz submitted! You scored ${res.score}/${res.totalMarks} (${res.percentage}%)`);
      if (res.gamification) {
        setGamification(res.gamification);
      }
      setActiveQuiz(null);
      setQuizAnswers({});
    } catch (err) { alert(err.message); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput;
    setAiMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiInput('');
    setAiLoading(true);

    try {
      const res = await api.post('/lms/ai-tutor/hint', {
        questionText: userMsg,
        subjectName: course.subjectName || course.title
      });
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        text: res.hint,
        encouragement: res.encouragement
      }]);
    } catch (err) {
      setAiMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I'm having trouble thinking right now. Please try again!" }]);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <div style={s.loading}>Loading course content…</div>;

  return (
    <div style={s.container}>
      <button style={s.backBtn} onClick={onBack}><ArrowLeft size={16} /> Back to Courses</button>

      {/* Gamification Bar */}
      <div style={s.gamificationBar}>
        <div style={s.gamificationStat}>
          <Flame size={20} color="#f59e0b" fill="#f59e0b" />
          <span style={{ fontWeight: 800 }}>{gamification.streak} Day Streak</span>
        </div>
        <div style={s.gamificationStat}>
          <Sparkles size={20} color="#8b5cf6" fill="#8b5cf6" />
          <span style={{ fontWeight: 800 }}>{gamification.points} Points</span>
        </div>
        {gamification.badges?.length > 0 && (
          <div style={s.badgeList}>
            {gamification.badges.map((b, idx) => (
              <span key={idx} style={s.badgeBadge} title={b.description}>
                <Award size={14} style={{ marginRight: 4 }} /> {b.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={s.header}>
        <h2 style={s.title}>{course.title}</h2>
        <p style={s.subtitle}>{course.description}</p>
      </div>

      <div style={s.tabs}>
        {[
          { id: 'modules', label: 'Content Modules', icon: PlayCircle },
          { id: 'assignments', label: 'Assignments', icon: FileText },
          { id: 'quizzes', label: 'Quizzes', icon: CheckSquare },
          { id: 'discussion', label: 'Discussion Board', icon: MessageSquare },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} style={{ ...s.tabBtn, ...(active ? s.tabActive : {}) }} onClick={() => setActiveTab(tab.id)}>
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      <div style={s.contentArea}>
        {/* Modules Tab */}
        {activeTab === 'modules' && (
          <div style={s.list}>
            {modules.length === 0 ? <p style={s.empty}>No content uploaded yet.</p> : modules.map(m => (
              <div key={m._id} style={s.itemCard}>
                <h4 style={s.itemTitle}>Week {m.week}: {m.title}</h4>
                <p style={s.itemDesc}>{m.content}</p>
                {m.resourceUrls?.length > 0 && (
                  <div style={s.resourceList}>
                    {m.resourceUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" style={s.resourceLink}><Download size={14}/> Resource {i+1}</a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div style={s.list}>
            {assignments.length === 0 ? <p style={s.empty}>No active assignments.</p> : assignments.map(a => (
              <div key={a._id} style={s.itemCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h4 style={s.itemTitle}>{a.title}</h4>
                  <span style={s.dueBadge}>Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                </div>
                <p style={s.itemDesc}>{a.description}</p>
                <button style={s.actionBtn}><Upload size={14}/> Submit Assignment</button>
              </div>
            ))}
          </div>
        )}

        {/* Quizzes Tab */}
        {activeTab === 'quizzes' && (
          <div style={s.list}>
            {quizzes.length === 0 ? <p style={s.empty}>No quizzes available.</p> : quizzes.map(q => (
              <div key={q._id} style={s.itemCard}>
                <h4 style={s.itemTitle}>{q.title}</h4>
                <p style={s.itemDesc}>Total Marks: {q.totalMarks} | Time Limit: {q.timeLimitMinutes ? `${q.timeLimitMinutes} mins` : 'None'}</p>
                <button style={s.actionBtn} onClick={() => setActiveQuiz(q)}>Attempt Quiz</button>
              </div>
            ))}
          </div>
        )}

        {/* Discussions Tab */}
        {activeTab === 'discussion' && (
          <div style={s.list}>
            {discussions.length === 0 ? <p style={s.empty}>No discussions yet.</p> : discussions.map(d => (
              <div key={d._id} style={s.itemCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h4 style={s.itemTitle}>{d.title || 'Discussion Thread'}</h4>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{new Date(d.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={s.itemDesc}>{d.content}</p>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                  Posted by: {d.authorName} | {d.replyCount} replies
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Tutor Chat Widget */}
      <div style={s.aiWidgetContainer}>
        {aiOpen ? (
          <div style={s.aiChatWindow}>
            <div style={s.aiChatHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bot size={18} color="#fff" />
                <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>Homework Buddy</span>
              </div>
              <button style={s.aiCloseBtn} onClick={() => setAiOpen(false)}><X size={16} color="#fff" /></button>
            </div>
            <div style={s.aiChatMessages}>
              {aiMessages.map((msg, idx) => (
                <div key={idx} style={{ ...s.aiMsgBubble, ...(msg.role === 'user' ? s.aiMsgUser : s.aiMsgAssistant) }}>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4 }}>{msg.text}</p>
                  {msg.encouragement && (
                    <p style={{ margin: '6px 0 0 0', fontSize: 11, fontStyle: 'italic', opacity: 0.8 }}>🌟 {msg.encouragement}</p>
                  )}
                </div>
              ))}
              {aiLoading && <div style={{ ...s.aiMsgBubble, ...s.aiMsgAssistant, fontStyle: 'italic' }}>Thinking...</div>}
            </div>
            <form onSubmit={handleSendMessage} style={s.aiChatForm}>
              <input style={s.aiChatInput} value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder="Ask a question or request a hint..." />
              <button type="submit" style={s.aiChatSendBtn}><Send size={14} color="#fff" /></button>
            </form>
          </div>
        ) : (
          <button style={s.aiLaunchBtn} onClick={() => setAiOpen(true)}>
            <Sparkles size={18} style={{ marginRight: 6 }} /> Ask Buddy
          </button>
        )}
      </div>

      {/* Quiz Modal */}
      {activeQuiz && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.mHead}>
              <h3 style={s.mTitle}>{activeQuiz.title}</h3>
              <button style={s.closeBtn} onClick={() => setActiveQuiz(null)}><X size={18}/></button>
            </div>
            <div style={s.quizScroll}>
              {activeQuiz.questions.map((q, idx) => (
                <div key={q._id} style={s.qCard}>
                  <p style={s.qText}><strong>Q{idx + 1}:</strong> {q.questionText} <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>({q.marks} marks)</span></p>
                  {q.type === 'multiple-choice' && q.options?.map((opt, i) => (
                    <label key={i} style={s.optLabel}>
                      <input type="radio" name={q._id} value={opt} checked={quizAnswers[q._id] === opt} onChange={() => setQuizAnswers({...quizAnswers, [q._id]: opt})} />
                      {opt}
                    </label>
                  ))}
                  {q.type === 'true-false' && ['True', 'False'].map((opt, i) => (
                    <label key={i} style={s.optLabel}>
                      <input type="radio" name={q._id} value={opt} checked={quizAnswers[q._id] === opt} onChange={() => setQuizAnswers({...quizAnswers, [q._id]: opt})} />
                      {opt}
                    </label>
                  ))}
                  {q.type === 'short-answer' && (
                    <input style={s.input} value={quizAnswers[q._id] || ''} onChange={e => setQuizAnswers({...quizAnswers, [q._id]: e.target.value})} placeholder="Type answer here..." />
                  )}
                </div>
              ))}
            </div>
            <button style={s.submitBtn} onClick={submitQuiz}>Submit Answers</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' },
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 14, alignSelf: 'flex-start', padding: '6px 0' },
  header: { borderBottom: '1px solid var(--border)', paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'var(--text-secondary)' },
  tabs: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 },
  tabBtn: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 'var(--radius-sm)', transition: 'var(--transition)', whiteSpace: 'nowrap' },
  tabActive: { backgroundColor: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' },
  contentArea: { backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', minHeight: 400, border: '1px solid var(--border)' },
  list: { display: 'flex', flexDirection: 'column', padding: 20, gap: 16 },
  itemCard: { padding: 20, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)' },
  itemTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 },
  itemDesc: { fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 },
  dueBadge: { fontSize: 12, fontWeight: 700, color: '#ef4444', backgroundColor: '#fee2e2', padding: '4px 10px', borderRadius: 20 },
  resourceList: { display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  resourceLink: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '6px 12px', borderRadius: 6, fontWeight: 600 },
  actionBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, padding: '8px 16px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  empty: { textAlign: 'center', color: 'var(--text-tertiary)', padding: 40, fontSize: 14 },
  loading: { textAlign: 'center', color: 'var(--text-tertiary)', padding: 40 },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' },
  mHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  mTitle: { fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' },
  quizScroll: { overflowY: 'auto', flex: 1, paddingRight: 10, display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 },
  qCard: { padding: 16, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8 },
  qText: { fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' },
  optLabel: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8, cursor: 'pointer' },
  input: { width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 6, fontSize: 14 },
  submitBtn: { width: '100%', padding: 14, backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 15, cursor: 'pointer' },

  // Gamification Styles
  gamificationBar: { display: 'flex', alignItems: 'center', gap: 16, backgroundColor: 'var(--bg-secondary)', padding: '12px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flexWrap: 'wrap' },
  gamificationStat: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--text-primary)' },
  badgeList: { display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' },
  badgeBadge: { display: 'inline-flex', alignItems: 'center', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 },

  // AI Widget Styles
  aiWidgetContainer: { position: 'fixed', bottom: 24, right: 24, zIndex: 1000 },
  aiLaunchBtn: { display: 'inline-flex', alignItems: 'center', padding: '12px 20px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 24, fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-lg)', fontSize: 14 },
  aiChatWindow: { width: 320, height: 420, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  aiChatHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--primary)', padding: '12px 16px' },
  aiCloseBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  aiChatMessages: { flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 },
  aiMsgBubble: { padding: 10, borderRadius: 12, maxWidth: '85%' },
  aiMsgUser: { alignSelf: 'flex-end', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' },
  aiMsgAssistant: { alignSelf: 'flex-start', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' },
  aiChatForm: { display: 'flex', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)' },
  aiChatInput: { flex: 1, padding: 12, border: 'none', outline: 'none', fontSize: 13, backgroundColor: 'transparent', color: 'var(--text-primary)' },
  aiChatSendBtn: { backgroundColor: 'var(--primary)', border: 'none', width: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
};

