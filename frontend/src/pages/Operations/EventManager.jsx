import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Calendar, Plus, MapPin, Users, ChevronRight, X, CheckCircle, Clock } from 'lucide-react';

const EVENT_TYPES = ['trip','sports','pta','exam','graduation','fundraiser','workshop','holiday','other'];
const typeColors = { trip:'#4f46e5', sports:'#10b981', pta:'#f59e0b', exam:'#ef4444', graduation:'#8b5cf6', fundraiser:'#06b6d4', workshop:'#ec4899', holiday:'#84cc16', other:'#94a3b8' };

export default function EventManager() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: '', type: 'trip', description: '', startDate: '', endDate: '', location: '', targetAudience: 'all', requiresPermissionSlip: false, cost: 0, term: 'Term 1' });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (showUpcoming) params.append('upcoming', 'true');
      const data = await api.get(`/operations/events?${params}`);
      setEvents(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, [filterType, showUpcoming]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/operations/events', form);
      alert('✅ Event created');
      setShowModal(false);
      fetchEvents();
    } catch (err) { alert(`❌ ${err.message}`); }
  };

  const handlePublish = async (ev) => {
    try {
      await api.put(`/operations/events/${ev._id}`, { status: ev.status === 'published' ? 'draft' : 'published' });
      fetchEvents();
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>Event Management</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...s.toggleBtn, ...(showUpcoming ? s.toggleActive : {}) }} onClick={() => setShowUpcoming(!showUpcoming)}>
            {showUpcoming ? '📅 Upcoming' : '📋 All Events'}
          </button>
          <button style={s.primaryBtn} onClick={() => setShowModal(true)}><Plus size={16}/> Create Event</button>
        </div>
      </div>

      <div style={s.filterBar}>
        <select style={s.select} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      {loading ? <div style={s.empty}>Loading events…</div> : (
        <div style={s.grid}>
          {events.length === 0 ? (
            <div style={{ ...s.empty, gridColumn: '1/-1' }}>No events found. Create your first event!</div>
          ) : events.map(ev => {
            const color = typeColors[ev.type] || '#94a3b8';
            const signed = ev.permissionSlips?.filter(p => p.status === 'signed').length || 0;
            const total = ev.permissionSlips?.length || 0;
            return (
              <div key={ev._id} style={{ ...s.card, borderTop: `3px solid ${color}` }}>
                <div style={s.cardTop}>
                  <span style={{ ...s.typeChip, color, backgroundColor: color + '18' }}>{ev.type}</span>
                  <span style={{ ...s.statusDot, backgroundColor: ev.status === 'published' ? '#10b981' : '#94a3b8' }}>
                    {ev.status}
                  </span>
                </div>
                <h3 style={s.cardTitle}>{ev.title}</h3>
                <p style={s.cardDesc}>{ev.description || 'No description'}</p>
                <div style={s.cardMeta}>
                  <span style={s.metaRow}><Calendar size={12}/> {new Date(ev.startDate).toLocaleDateString()} → {new Date(ev.endDate).toLocaleDateString()}</span>
                  {ev.location && <span style={s.metaRow}><MapPin size={12}/> {ev.location}</span>}
                  <span style={s.metaRow}><Users size={12}/> {ev.targetAudience}</span>
                </div>
                {ev.requiresPermissionSlip && (
                  <div style={s.slipBar}>
                    <span style={s.slipLabel}>Permission Slips</span>
                    <span style={s.slipCount}>{signed}/{total} signed</span>
                  </div>
                )}
                <div style={s.cardActions}>
                  <button style={s.detailBtn} onClick={() => setSelected(ev)}><ChevronRight size={14}/> Details</button>
                  <button style={{ ...s.publishBtn, color: ev.status === 'published' ? '#ef4444' : '#10b981' }} onClick={() => handlePublish(ev)}>
                    {ev.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={s.mHead}><h3 style={s.mTitle}>Create Event</h3><button style={s.closeBtn} onClick={() => setShowModal(false)}><X size={18}/></button></div>
            <form onSubmit={handleCreate} style={s.form}>
              <div style={s.field}><label style={s.label}>Event Title *</label><input required style={s.input} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Annual Sports Day 2026"/></div>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Type</label><select style={s.input} value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{EVENT_TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}</select></div>
                <div style={s.field}><label style={s.label}>Target Audience</label><select style={s.input} value={form.targetAudience} onChange={e=>setForm({...form,targetAudience:e.target.value})}>{['all','students','teachers','parents','specific-class'].map(a=><option key={a} value={a}>{a}</option>)}</select></div>
              </div>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Start Date *</label><input type="datetime-local" required style={s.input} value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></div>
                <div style={s.field}><label style={s.label}>End Date *</label><input type="datetime-local" required style={s.input} value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></div>
              </div>
              <div style={s.field}><label style={s.label}>Location</label><input style={s.input} placeholder="School Grounds / Kololo Stadium" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></div>
              <div style={s.field}><label style={s.label}>Description</label><textarea style={{ ...s.input, minHeight: 80, resize: 'vertical' }} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Cost per Student (UGX)</label><input type="number" style={s.input} value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/></div>
                <div style={s.field}><label style={s.label}>Term</label><select style={s.input} value={form.term} onChange={e=>setForm({...form,term:e.target.value})}><option value="Term 1">Term 1</option><option value="Term 2">Term 2</option><option value="Term 3">Term 3</option></select></div>
              </div>
              <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.requiresPermissionSlip} onChange={e=>setForm({...form,requiresPermissionSlip:e.target.checked})} style={{ width: 16, height: 16 }}/>
                Requires Parent Permission Slip
              </label>
              <button type="submit" style={s.primaryBtn}>Create Event</button>
            </form>
          </div>
        </div>
      )}

      {/* Detail View */}
      {selected && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={s.mHead}><h3 style={s.mTitle}>{selected.title}</h3><button style={s.closeBtn} onClick={() => setSelected(null)}><X size={18}/></button></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selected.description}</p>
              {[
                ['Type', selected.type], ['Status', selected.status],
                ['Start', new Date(selected.startDate).toLocaleString()],
                ['End', new Date(selected.endDate).toLocaleString()],
                ['Location', selected.location || 'TBD'],
                ['Audience', selected.targetAudience],
                ['Cost', `UGX ${selected.cost?.toLocaleString() || 0}`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{v}</span>
                </div>
              ))}
              {selected.requiresPermissionSlip && (
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Permission Slips ({selected.permissionSlips?.length || 0})</h4>
                  {(selected.permissionSlips || []).map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 13 }}>{p.studentName}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: p.status === 'signed' ? '#10b981' : '#f59e0b' }}>{p.status}</span>
                    </div>
                  ))}
                  {(selected.permissionSlips || []).length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No slips submitted yet</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container:{display:'flex',flexDirection:'column',gap:20},
  header:{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12},
  title:{fontSize:22,fontWeight:800,color:'var(--text-primary)'},
  primaryBtn:{display:'flex',alignItems:'center',gap:8,backgroundColor:'var(--primary)',color:'#fff',border:'none',padding:'10px 20px',borderRadius:'var(--radius-sm)',cursor:'pointer',fontWeight:700,fontSize:14},
  toggleBtn:{backgroundColor:'var(--bg-secondary)',border:'1px solid var(--border)',color:'var(--text-secondary)',padding:'9px 16px',borderRadius:'var(--radius-sm)',cursor:'pointer',fontWeight:600,fontSize:13},
  toggleActive:{backgroundColor:'var(--primary-light)',color:'var(--primary)',borderColor:'var(--primary)'},
  filterBar:{display:'flex',gap:12},
  select:{padding:'10px 14px',backgroundColor:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text-primary)',outline:'none',fontSize:13},
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))',gap:16},
  card:{backgroundColor:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'18px 20px',display:'flex',flexDirection:'column',gap:10,boxShadow:'var(--shadow-sm)'},
  cardTop:{display:'flex',justifyContent:'space-between',alignItems:'center'},
  typeChip:{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,textTransform:'capitalize'},
  statusDot:{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,color:'#fff',textTransform:'capitalize'},
  cardTitle:{fontSize:15,fontWeight:800,color:'var(--text-primary)'},
  cardDesc:{fontSize:12,color:'var(--text-tertiary)',lineHeight:1.5},
  cardMeta:{display:'flex',flexDirection:'column',gap:5},
  metaRow:{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text-secondary)'},
  slipBar:{display:'flex',justifyContent:'space-between',backgroundColor:'var(--bg-tertiary)',borderRadius:8,padding:'8px 12px'},
  slipLabel:{fontSize:12,color:'var(--text-secondary)',fontWeight:600},
  slipCount:{fontSize:12,fontWeight:700,color:'var(--primary)'},
  cardActions:{display:'flex',gap:8,marginTop:4},
  detailBtn:{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:'var(--bg-tertiary)',color:'var(--text-secondary)',border:'none',padding:8,borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:12},
  publishBtn:{flex:1,backgroundColor:'transparent',border:'1px solid var(--border)',padding:8,borderRadius:8,cursor:'pointer',fontWeight:700,fontSize:12},
  empty:{padding:'60px 20px',textAlign:'center',color:'var(--text-tertiary)',fontSize:13},
  overlay:{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20},
  modal:{backgroundColor:'var(--bg-secondary)',borderRadius:'var(--radius-lg)',padding:28,width:'100%',boxShadow:'var(--shadow-lg)'},
  mHead:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20},
  mTitle:{fontSize:18,fontWeight:700,color:'var(--text-primary)'},
  closeBtn:{background:'none',border:'none',cursor:'pointer',color:'var(--text-tertiary)',display:'flex'},
  form:{display:'flex',flexDirection:'column',gap:14},
  row:{display:'flex',gap:12},
  field:{flex:1,display:'flex',flexDirection:'column',gap:6},
  label:{fontSize:12,fontWeight:600,color:'var(--text-secondary)'},
  input:{padding:'10px 14px',backgroundColor:'var(--bg-primary)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text-primary)',outline:'none',fontSize:13,width:'100%'},
};
