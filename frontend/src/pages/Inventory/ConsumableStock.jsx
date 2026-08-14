import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Package, Plus, AlertTriangle, X, TrendingUp, TrendingDown } from 'lucide-react';

const CATEGORIES = ['textbook','stationery','cleaning','lab-supplies','food','medical','printing','other'];

export default function ConsumableStock() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showRestock, setShowRestock] = useState(null);
  const [showUse, setShowUse] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'stationery', unit: 'piece', quantity: '', reorderLevel: 5, unitCost: '', location: '', supplier: '' });
  const [restockQty, setRestockQty] = useState('');
  const [useQty, setUseQty] = useState('1');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = filterCat ? `?category=${filterCat}` : '';
      const data = await api.get(`/inventory/consumables${params}`);
      setItems(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [filterCat]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/consumables', { ...form, quantity: parseInt(form.quantity), reorderLevel: parseInt(form.reorderLevel), unitCost: parseFloat(form.unitCost) || 0 });
      alert('✅ Item added');
      setShowAdd(false);
      fetchItems();
    } catch (err) { alert(`❌ ${err.message}`); }
  };

  const handleRestock = async () => {
    if (!restockQty || parseInt(restockQty) <= 0) return;
    try {
      await api.put(`/inventory/consumables/${showRestock._id}/restock`, { quantity: parseInt(restockQty) });
      alert('✅ Stock updated');
      setShowRestock(null);
      setRestockQty('');
      fetchItems();
    } catch (err) { alert(`❌ ${err.message}`); }
  };

  const handleUse = async () => {
    if (!useQty || parseInt(useQty) <= 0) return;
    try {
      await api.put(`/inventory/consumables/${showUse._id}/use`, { quantity: parseInt(useQty) });
      setShowUse(null);
      setUseQty('1');
      fetchItems();
    } catch (err) { alert(`❌ ${err.message}`); }
  };

  const totalValue = items.reduce((s, i) => s + (i.quantity * i.unitCost), 0);
  const lowCount = items.filter(i => i.quantity <= i.reorderLevel).length;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Consumable Stock</h2>
          <div style={s.pills}>
            <span style={{ ...s.pill, color: '#8b5cf6', backgroundColor: '#ede9fe' }}>{items.length} Items</span>
            {lowCount > 0 && <span style={{ ...s.pill, color: '#ef4444', backgroundColor: '#fee2e2' }}><AlertTriangle size={11}/> {lowCount} Low Stock</span>}
            <span style={{ ...s.pill, color: '#10b981', backgroundColor: '#d1fae5' }}>Value: UGX {totalValue.toLocaleString()}</span>
          </div>
        </div>
        <button style={s.primaryBtn} onClick={() => setShowAdd(true)}><Plus size={16}/> Add Item</button>
      </div>

      <div style={s.filterBar}>
        <select style={s.select} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/-/g,' ').replace(/\b\w/g, x => x.toUpperCase())}</option>)}
        </select>
      </div>

      <div style={s.grid}>
        {loading ? (
          <div style={s.empty}>Loading stock…</div>
        ) : items.length === 0 ? (
          <div style={s.empty}>No consumables added yet.</div>
        ) : (
          items.map(item => {
            const pct = Math.min(100, Math.round((item.quantity / Math.max(item.reorderLevel * 3, 1)) * 100));
            const isLow = item.quantity <= item.reorderLevel;
            return (
              <div key={item._id} style={{ ...s.card, borderLeft: `3px solid ${isLow ? '#ef4444' : '#10b981'}` }}>
                <div style={s.cardTop}>
                  <div>
                    <p style={s.itemName}>{item.name}</p>
                    <p style={s.itemMeta}>{item.category.replace(/-/g,' ')} · {item.location || 'Store'}</p>
                  </div>
                  {isLow && <span style={s.lowBadge}><AlertTriangle size={11}/> Low</span>}
                </div>

                <div style={s.stockRow}>
                  <span style={{ ...s.qty, color: isLow ? '#ef4444' : '#10b981' }}>{item.quantity}</span>
                  <span style={s.unit}>{item.unit}s in stock</span>
                  <span style={s.reorder}>min: {item.reorderLevel}</span>
                </div>

                {/* Stock bar */}
                <div style={s.barBg}>
                  <div style={{ ...s.barFill, width: `${pct}%`, backgroundColor: isLow ? '#ef4444' : '#10b981' }} />
                </div>

                {item.unitCost > 0 && (
                  <p style={s.valueLine}>Value: UGX {(item.quantity * item.unitCost).toLocaleString()}</p>
                )}

                <div style={s.cardActions}>
                  <button style={s.restockBtn} onClick={() => setShowRestock(item)}>
                    <TrendingUp size={12}/> Restock
                  </button>
                  <button style={s.useBtn} onClick={() => setShowUse(item)}>
                    <TrendingDown size={12}/> Use
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.mHead}><h3 style={s.mTitle}>Add Consumable Item</h3><button style={s.closeBtn} onClick={() => setShowAdd(false)}><X size={18}/></button></div>
            <form onSubmit={handleAdd} style={s.form}>
              <div style={s.field}><label style={s.label}>Item Name *</label><input required style={s.input} placeholder="e.g. A4 Printing Paper" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Category</label><select style={s.input} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.map(c=><option key={c} value={c}>{c.replace(/-/g,' ').replace(/\b\w/g,x=>x.toUpperCase())}</option>)}</select></div>
                <div style={s.field}><label style={s.label}>Unit</label><input style={s.input} placeholder="piece, ream, litre" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></div>
              </div>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Opening Quantity</label><input type="number" required style={s.input} value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></div>
                <div style={s.field}><label style={s.label}>Reorder Level</label><input type="number" style={s.input} value={form.reorderLevel} onChange={e=>setForm({...form,reorderLevel:e.target.value})}/></div>
              </div>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Unit Cost (UGX)</label><input type="number" style={s.input} value={form.unitCost} onChange={e=>setForm({...form,unitCost:e.target.value})}/></div>
                <div style={s.field}><label style={s.label}>Location</label><input style={s.input} placeholder="Storeroom" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></div>
              </div>
              <button type="submit" style={s.primaryBtn}>Add to Inventory</button>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestock && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 380 }}>
            <div style={s.mHead}><h3 style={s.mTitle}>Restock: {showRestock.name}</h3><button style={s.closeBtn} onClick={() => setShowRestock(null)}><X size={18}/></button></div>
            <div style={s.form}>
              <p style={s.currentStock}>Current stock: <strong style={{ color: '#f59e0b' }}>{showRestock.quantity} {showRestock.unit}s</strong></p>
              <div style={s.field}><label style={s.label}>Quantity to Add</label><input type="number" min="1" style={s.input} value={restockQty} onChange={e => setRestockQty(e.target.value)}/></div>
              <button style={s.primaryBtn} onClick={handleRestock}>Confirm Restock</button>
            </div>
          </div>
        </div>
      )}

      {/* Use Modal */}
      {showUse && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 380 }}>
            <div style={s.mHead}><h3 style={s.mTitle}>Record Usage: {showUse.name}</h3><button style={s.closeBtn} onClick={() => setShowUse(null)}><X size={18}/></button></div>
            <div style={s.form}>
              <p style={s.currentStock}>Available: <strong style={{ color: '#10b981' }}>{showUse.quantity} {showUse.unit}s</strong></p>
              <div style={s.field}><label style={s.label}>Quantity Used</label><input type="number" min="1" max={showUse.quantity} style={s.input} value={useQty} onChange={e => setUseQty(e.target.value)}/></div>
              <button style={{ ...s.primaryBtn, backgroundColor: '#ef4444' }} onClick={handleUse}>Record Usage</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container:{display:'flex',flexDirection:'column',gap:20},
  header:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12},
  title:{fontSize:22,fontWeight:800,color:'var(--text-primary)',marginBottom:8},
  pills:{display:'flex',gap:8,flexWrap:'wrap'},
  pill:{display:'inline-flex',alignItems:'center',gap:5,fontSize:12,fontWeight:700,padding:'4px 12px',borderRadius:20},
  primaryBtn:{display:'flex',alignItems:'center',gap:8,backgroundColor:'var(--primary)',color:'#fff',border:'none',padding:'10px 20px',borderRadius:'var(--radius-sm)',cursor:'pointer',fontWeight:700,fontSize:14},
  filterBar:{display:'flex',gap:12},
  select:{padding:'10px 14px',backgroundColor:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text-primary)',outline:'none',fontSize:13},
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',gap:16},
  card:{backgroundColor:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'18px 20px',display:'flex',flexDirection:'column',gap:12,boxShadow:'var(--shadow-sm)'},
  cardTop:{display:'flex',justifyContent:'space-between',alignItems:'flex-start'},
  itemName:{fontSize:14,fontWeight:700,color:'var(--text-primary)'},
  itemMeta:{fontSize:11,color:'var(--text-tertiary)',textTransform:'capitalize',marginTop:3},
  lowBadge:{display:'inline-flex',alignItems:'center',gap:4,backgroundColor:'#fee2e2',color:'#ef4444',fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,flexShrink:0},
  stockRow:{display:'flex',alignItems:'baseline',gap:6},
  qty:{fontSize:24,fontWeight:900},
  unit:{fontSize:12,color:'var(--text-secondary)'},
  reorder:{fontSize:11,color:'var(--text-tertiary)',marginLeft:'auto'},
  barBg:{backgroundColor:'var(--bg-tertiary)',borderRadius:4,height:6,overflow:'hidden'},
  barFill:{height:'100%',borderRadius:4,transition:'width 0.4s ease'},
  valueLine:{fontSize:11,color:'var(--text-tertiary)'},
  cardActions:{display:'flex',gap:8,marginTop:4},
  restockBtn:{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:'var(--primary-light)',color:'var(--primary)',border:'none',padding:'8px',borderRadius:8,cursor:'pointer',fontWeight:700,fontSize:12},
  useBtn:{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:'#fee2e2',color:'#ef4444',border:'none',padding:'8px',borderRadius:8,cursor:'pointer',fontWeight:700,fontSize:12},
  empty:{gridColumn:'1/-1',padding:'60px 20px',textAlign:'center',color:'var(--text-tertiary)',fontSize:13},
  overlay:{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20},
  modal:{backgroundColor:'var(--bg-secondary)',borderRadius:'var(--radius-lg)',padding:28,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto',boxShadow:'var(--shadow-lg)'},
  mHead:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20},
  mTitle:{fontSize:18,fontWeight:700,color:'var(--text-primary)'},
  closeBtn:{background:'none',border:'none',cursor:'pointer',color:'var(--text-tertiary)',display:'flex'},
  form:{display:'flex',flexDirection:'column',gap:14},
  row:{display:'flex',gap:12},
  field:{flex:1,display:'flex',flexDirection:'column',gap:6},
  label:{fontSize:12,fontWeight:600,color:'var(--text-secondary)'},
  input:{padding:'10px 14px',backgroundColor:'var(--bg-primary)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text-primary)',outline:'none',fontSize:13,width:'100%'},
  currentStock:{fontSize:13,color:'var(--text-secondary)',backgroundColor:'var(--bg-tertiary)',padding:'10px 14px',borderRadius:8},
};
