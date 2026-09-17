import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Monitor, Plus, Search, ArrowLeftRight, CheckCircle, X, Calendar, ShieldAlert } from 'lucide-react';

const CATEGORIES = ['computer','laptop','tablet','furniture','lab-equipment','sports','audio-visual','vehicle','other'];

export default function AssetRegistry() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterOut, setFilterOut] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showCheckout, setShowCheckout] = useState(null);
  const [form, setForm] = useState({ 
    name: '', 
    category: 'computer', 
    assetTag: '', 
    serialNumber: '', 
    brand: '', 
    condition: 'good', 
    location: '', 
    purchaseValue: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    expectedLifespanMonths: 36
  });
  const [checkoutForm, setCheckoutForm] = useState({ borrowerId: '', borrowerType: 'student', borrowerName: '', dueDate: '' });
  const [processing, setProcessing] = useState(null);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCat) params.append('category', filterCat);
      if (filterOut !== '') params.append('isCheckedOut', filterOut);
      if (search) params.append('search', search);
      const data = await api.get(`/inventory/assets?${params}`);
      setAssets(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAssets(); }, [filterCat, filterOut]);
  useEffect(() => {
    const t = setTimeout(fetchAssets, 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/assets', { 
        ...form, 
        purchaseValue: parseFloat(form.purchaseValue) || 0,
        expectedLifespanMonths: parseInt(form.expectedLifespanMonths) || 36
      });
      alert('✅ Asset added');
      setShowAdd(false);
      setForm({ 
        name: '', 
        category: 'computer', 
        assetTag: '', 
        serialNumber: '', 
        brand: '', 
        condition: 'good', 
        location: '', 
        purchaseValue: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        expectedLifespanMonths: 36
      });
      fetchAssets();
    } catch (err) { alert(`❌ ${err.message}`); }
  };

  const handleCheckout = async () => {
    if (!checkoutForm.borrowerId || !checkoutForm.borrowerName || !checkoutForm.dueDate) return alert('Fill all checkout fields');
    setProcessing('checkout');
    try {
      await api.post(`/inventory/assets/${showCheckout._id}/checkout`, checkoutForm);
      alert('✅ Asset checked out');
      setShowCheckout(null);
      fetchAssets();
    } catch (err) { alert(`❌ ${err.message}`); }
    finally { setProcessing(null); }
  };

  const handleCheckin = async (asset) => {
    if (!window.confirm(`Check in "${asset.name}" from ${asset.assignedToName}?`)) return;
    try {
      await api.post(`/inventory/assets/${asset._id}/checkin`, { returnCondition: 'good' });
      alert('✅ Asset checked in');
      fetchAssets();
    } catch (err) { alert(`❌ ${err.message}`); }
  };

  // Helper to calculate replacement window
  const getReplacementStatus = (asset) => {
    if (!asset.purchaseDate || !asset.expectedLifespanMonths) return { text: 'N/A', alert: false };
    const pDate = new Date(asset.purchaseDate);
    const lifesp = parseInt(asset.expectedLifespanMonths) || 0;
    const replacementDate = new Date(pDate.setMonth(pDate.getMonth() + lifesp));
    const now = new Date();
    
    const diffMonths = (replacementDate.getFullYear() - now.getFullYear()) * 12 + (replacementDate.getMonth() - now.getMonth());
    
    if (diffMonths < 0) return { text: `Expired (Replace Now)`, alert: true, date: replacementDate.toLocaleDateString() };
    if (diffMonths <= 6) return { text: `Due in ${diffMonths} mo`, alert: true, date: replacementDate.toLocaleDateString() };
    return { text: `Ok (${diffMonths} mo left)`, alert: false, date: replacementDate.toLocaleDateString() };
  };

  const conditionColor = { new: '#10b981', good: '#4f46e5', fair: '#f59e0b', poor: '#ef4444', damaged: '#dc2626', 'written-off': '#9ca3af' };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>Asset Registry <span style={s.count}>({assets.length})</span></h2>
        <button style={s.primaryBtn} onClick={() => setShowAdd(true)}><Plus size={16} /> Add Asset</button>
      </div>

      <div style={s.filterBar}>
        <div style={s.searchWrap}>
          <Search size={15} style={s.searchIcon} />
          <input style={s.searchInput} placeholder="Search name, tag, serial…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={s.select} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/-/g,' ').replace(/\b\w/g, x => x.toUpperCase())}</option>)}
        </select>
        <select style={s.select} value={filterOut} onChange={e => setFilterOut(e.target.value)}>
          <option value="">All Status</option>
          <option value="false">Available</option>
          <option value="true">On Loan</option>
        </select>
      </div>

      <div style={s.tableWrap}>
        {loading ? <div style={s.empty}>Loading assets…</div> : assets.length === 0 ? (
          <div style={s.empty}>No assets found. Add your first asset above.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {['Tag','Name','Category','Condition','Location','Lifespan / Replacement','Status','Action'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.map(a => {
                const rep = getReplacementStatus(a);
                return (
                  <tr key={a._id} style={s.tr}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>{a.assetTag}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{a.name}{a.brand ? ` (${a.brand})` : ''}</td>
                    <td style={s.td}><span style={s.catChip}>{a.category.replace(/-/g,' ')}</span></td>
                    <td style={s.td}>
                      <span style={{ ...s.condChip, color: conditionColor[a.condition] || '#94a3b8', backgroundColor: conditionColor[a.condition] + '20' }}>
                        {a.condition}
                      </span>
                    </td>
                    <td style={s.td}>{a.location || '—'}</td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {rep.alert ? <ShieldAlert size={14} color="#ef4444" /> : <Calendar size={14} color="var(--text-secondary)" />}
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: rep.alert ? '#ef4444' : 'var(--text-primary)' }}>{rep.text}</p>
                          <p style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Due: {rep.date}</p>
                        </div>
                      </div>
                    </td>
                    <td style={s.td}>
                      {a.isCheckedOut ? (
                        <div>
                          <span style={s.loanBadge}>On Loan</span>
                          <p style={s.loanTo}>→ {a.assignedToName}</p>
                        </div>
                      ) : (
                        <span style={s.availBadge}>Available</span>
                      )}
                    </td>
                    <td style={s.td}>
                      {a.isCheckedOut ? (
                        <button style={s.checkinBtn} onClick={() => handleCheckin(a)}>Check In</button>
                      ) : (
                        <button style={s.checkoutBtn} onClick={() => setShowCheckout(a)}>Check Out</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Asset Modal */}
      {showAdd && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.mHead}><h3 style={s.mTitle}>Add New Asset</h3><button style={s.closeBtn} onClick={() => setShowAdd(false)}><X size={18}/></button></div>
            <form onSubmit={handleAdd} style={s.form}>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Asset Tag *</label><input required style={s.input} placeholder="NDUGU-COMP-001" value={form.assetTag} onChange={e=>setForm({...form,assetTag:e.target.value})}/></div>
                <div style={s.field}><label style={s.label}>Category *</label><select style={s.input} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.map(c=><option key={c} value={c}>{c.replace(/-/g,' ').replace(/\b\w/g,x=>x.toUpperCase())}</option>)}</select></div>
              </div>
              <div style={s.field}><label style={s.label}>Asset Name *</label><input required style={s.input} placeholder="e.g. Dell Latitude Laptop" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Brand</label><input style={s.input} value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></div>
                <div style={s.field}><label style={s.label}>Serial Number</label><input style={s.input} value={form.serialNumber} onChange={e=>setForm({...form,serialNumber:e.target.value})}/></div>
              </div>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Condition</label><select style={s.input} value={form.condition} onChange={e=>setForm({...form,condition:e.target.value})}>{['new','good','fair','poor','damaged'].map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                <div style={s.field}><label style={s.label}>Location</label><input style={s.input} placeholder="Computer Lab A" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></div>
              </div>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Purchase Date</label><input type="date" style={s.input} value={form.purchaseDate} onChange={e=>setForm({...form,purchaseDate:e.target.value})}/></div>
                <div style={s.field}><label style={s.label}>Expected Lifespan (Months)</label><input type="number" style={s.input} placeholder="36" value={form.expectedLifespanMonths} onChange={e=>setForm({...form,expectedLifespanMonths:e.target.value})}/></div>
              </div>
              <div style={s.field}><label style={s.label}>Purchase Value (UGX)</label><input type="number" style={s.input} value={form.purchaseValue} onChange={e=>setForm({...form,purchaseValue:e.target.value})}/></div>
              <button type="submit" style={s.primaryBtn}>Save Asset</button>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.mHead}><h3 style={s.mTitle}>Check Out: {showCheckout.name}</h3><button style={s.closeBtn} onClick={() => setShowCheckout(null)}><X size={18}/></button></div>
            <div style={s.form}>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Borrower ID (Student/Staff ID)</label><input style={s.input} placeholder="e.g. STU-2024-001" value={checkoutForm.borrowerId} onChange={e=>setCheckoutForm({...checkoutForm,borrowerId:e.target.value})}/></div>
                <div style={s.field}><label style={s.label}>Type</label><select style={s.input} value={checkoutForm.borrowerType} onChange={e=>setCheckoutForm({...checkoutForm,borrowerType:e.target.value})}><option value="student">Student</option><option value="staff">Staff</option></select></div>
              </div>
              <div style={s.field}><label style={s.label}>Borrower Full Name</label><input style={s.input} value={checkoutForm.borrowerName} onChange={e=>setCheckoutForm({...checkoutForm,borrowerName:e.target.value})}/></div>
              <div style={s.field}><label style={s.label}>Return Due Date</label><input type="date" style={s.input} value={checkoutForm.dueDate} onChange={e=>setCheckoutForm({...checkoutForm,dueDate:e.target.value})}/></div>
              <button style={s.primaryBtn} onClick={handleCheckout} disabled={processing === 'checkout'}>
                {processing === 'checkout' ? 'Processing…' : 'Confirm Checkout'}
              </button>
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
  count:{fontSize:16,color:'var(--text-tertiary)',fontWeight:500},
  primaryBtn:{display:'flex',alignItems:'center',gap:8,backgroundColor:'var(--primary)',color:'#fff',border:'none',padding:'10px 20px',borderRadius:'var(--radius-sm)',cursor:'pointer',fontWeight:700,fontSize:14},
  filterBar:{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'},
  searchWrap:{position:'relative',flex:1,minWidth:200},
  searchIcon:{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-tertiary)'},
  searchInput:{width:'100%',padding:'10px 12px 10px 36px',backgroundColor:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text-primary)',outline:'none',fontSize:13},
  select:{padding:'10px 14px',backgroundColor:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text-primary)',outline:'none',fontSize:13},
  tableWrap:{backgroundColor:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',overflow:'auto',boxShadow:'var(--shadow-sm)'},
  table:{width:'100%',borderCollapse:'collapse',minWidth:880},
  thead:{backgroundColor:'var(--bg-tertiary)',borderBottom:'2px solid var(--border)'},
  th:{padding:'12px 16px',fontSize:11,fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',textAlign:'left'},
  tr:{borderBottom:'1px solid var(--border)'},
  td:{padding:'13px 16px',fontSize:13,color:'var(--text-primary)'},
  catChip:{backgroundColor:'var(--bg-tertiary)',color:'var(--text-secondary)',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,textTransform:'capitalize'},
  condChip:{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,textTransform:'capitalize'},
  loanBadge:{backgroundColor:'#fef3c7',color:'#f59e0b',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700},
  loanTo:{fontSize:11,color:'var(--text-tertiary)',marginTop:3},
  availBadge:{backgroundColor:'#d1fae5',color:'#10b981',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700},
  checkoutBtn:{backgroundColor:'var(--primary-light)',color:'var(--primary)',border:'none',padding:'6px 14px',borderRadius:6,cursor:'pointer',fontWeight:700,fontSize:12},
  checkinBtn:{backgroundColor:'#d1fae5',color:'#10b981',border:'none',padding:'6px 14px',borderRadius:6,cursor:'pointer',fontWeight:700,fontSize:12},
  empty:{padding:'60px 20px',textAlign:'center',color:'var(--text-tertiary)',fontSize:13},
  overlay:{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20},
  modal:{backgroundColor:'var(--bg-secondary)',borderRadius:'var(--radius-lg)',padding:28,width:'100%',maxWidth:500,maxHeight:'90vh',overflowY:'auto',boxShadow:'var(--shadow-lg)'},
  mHead:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20},
  mTitle:{fontSize:18,fontWeight:700,color:'var(--text-primary)'},
  closeBtn:{background:'none',border:'none',cursor:'pointer',color:'var(--text-tertiary)',display:'flex'},
  form:{display:'flex',flexDirection:'column',gap:14},
  row:{display:'flex',gap:12},
  field:{flex:1,display:'flex',flexDirection:'column',gap:6},
  label:{fontSize:12,fontWeight:600,color:'var(--text-secondary)'},
  input:{padding:'10px 14px',backgroundColor:'var(--bg-primary)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text-primary)',outline:'none',fontSize:13,width:'100%'},
};
