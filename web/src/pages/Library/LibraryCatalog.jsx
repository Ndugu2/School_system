import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Book, Search, Plus, BookOpen, Layers, CheckCircle2, AlertCircle, X, Save } from 'lucide-react';

const CATEGORIES = ['Sciences', 'Mathematics', 'Humanities', 'Literature & Languages', 'Technical & ICT', 'Revision & UNEB Past Papers', 'General Reference'];

const MOCK_BOOKS = [
  { _id: '1', title: 'Comprehensive Secondary Chemistry (S1 - S4)', author: 'Dr. J. Byamukama', isbn: '978-9970-01-201', category: 'Sciences', level: 'O-Level', totalCopies: 45, availableCopies: 28, shelfLocation: 'Section B, Shelf 3' },
  { _id: '2', title: 'Pure Mathematics for A-Level (Vol 1)', author: 'Backhouse & Houldsworth', isbn: '978-0582-35386', category: 'Mathematics', level: 'A-Level', totalCopies: 30, availableCopies: 12, shelfLocation: 'Section A, Shelf 1' },
  { _id: '3', title: 'Song of Lawino & Song of Ocol', author: 'Okot p’Bitek', isbn: '978-0435-90149', category: 'Literature & Languages', level: 'O-Level', totalCopies: 50, availableCopies: 34, shelfLocation: 'Section D, Shelf 2' },
  { _id: '4', title: 'East African History (1000 - Present)', author: 'Prof. B.A. Ogot', isbn: '978-9970-02-114', category: 'Humanities', level: 'O-Level', totalCopies: 25, availableCopies: 19, shelfLocation: 'Section C, Shelf 4' },
  { _id: '5', title: 'Understanding Biology for Advanced Level', author: 'Glenn & Susan Toole', isbn: '978-0748-73957', category: 'Sciences', level: 'A-Level', totalCopies: 35, availableCopies: 8, shelfLocation: 'Section B, Shelf 1' },
  { _id: '6', title: 'Subsidiary ICT Practical Guide (Senior 5 & 6)', author: 'Kato Emmanuel', isbn: '978-9970-09-543', category: 'Technical & ICT', level: 'A-Level', totalCopies: 40, availableCopies: 31, shelfLocation: 'Section E, Shelf 1' }
];

const emptyBook = { title: '', author: '', isbn: '', category: 'Sciences', level: 'O-Level', totalCopies: 10, shelfLocation: '' };

export default function LibraryCatalog() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyBook);

  useEffect(() => {
    api.get('/library/books').then(data => setBooks(data?.length ? data : MOCK_BOOKS)).catch(() => setBooks(MOCK_BOOKS)).finally(() => setLoading(false));
  }, []);

  const filtered = books.filter(b => {
    const q = search.toLowerCase();
    const matchQ = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn.toLowerCase().includes(q);
    const matchCat = !categoryFilter || b.category === categoryFilter;
    return matchQ && matchCat;
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.title || !form.author) return;
    const newBook = {
      _id: Date.now().toString(),
      ...form,
      totalCopies: parseInt(form.totalCopies) || 1,
      availableCopies: parseInt(form.totalCopies) || 1
    };
    setBooks(prev => [newBook, ...prev]);
    setShowModal(false);
    setForm(emptyBook);
  };

  if (loading) return <div style={s.loading}>Loading library catalog...</div>;

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.filters}>
          <div style={s.searchBox}>
            <Search size={16} color="var(--text-tertiary)" />
            <input style={s.searchInput} placeholder="Search title, author, or ISBN..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={s.select} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button style={s.addBtn} onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add New Textbook
        </button>
      </div>

      {/* Stats */}
      <div style={s.statRow}>
        <div style={s.statCard}>
          <span style={s.statVal}>{books.length}</span>
          <span style={s.statLbl}>Unique Titles</span>
        </div>
        <div style={s.statCard}>
          <span style={{ ...s.statVal, color: '#4f46e5' }}>{books.reduce((acc, b) => acc + (b.totalCopies || 0), 0)}</span>
          <span style={s.statLbl}>Total Holdings</span>
        </div>
        <div style={s.statCard}>
          <span style={{ ...s.statVal, color: '#10b981' }}>{books.reduce((acc, b) => acc + (b.availableCopies || 0), 0)}</span>
          <span style={s.statLbl}>Available on Shelves</span>
        </div>
        <div style={s.statCard}>
          <span style={{ ...s.statVal, color: '#f59e0b' }}>
            {books.reduce((acc, b) => acc + ((b.totalCopies || 0) - (b.availableCopies || 0)), 0)}
          </span>
          <span style={s.statLbl}>Currently Borrowed</span>
        </div>
      </div>

      {/* Book Grid */}
      <div style={s.grid}>
        {filtered.map(b => (
          <div key={b._id} style={s.card}>
            <div style={s.cardHead}>
              <div style={s.iconWrap}><Book size={20} color="var(--primary)" /></div>
              <div style={s.badgeWrap}>
                <span style={{ ...s.levelBadge, backgroundColor: b.level === 'A-Level' ? '#ede9fe' : '#e0e7ff', color: b.level === 'A-Level' ? '#6d28d9' : '#3730a3' }}>{b.level}</span>
                <span style={s.catBadge}>{b.category}</span>
              </div>
            </div>
            <h3 style={s.bookTitle}>{b.title}</h3>
            <p style={s.bookAuthor}>by {b.author}</p>
            <div style={s.metaList}>
              <div style={s.metaItem}>
                <span style={s.metaLabel}>ISBN:</span>
                <span style={s.metaVal}>{b.isbn || 'N/A'}</span>
              </div>
              <div style={s.metaItem}>
                <span style={s.metaLabel}>Shelf:</span>
                <span style={s.metaVal}>{b.shelfLocation}</span>
              </div>
            </div>
            <div style={s.cardFoot}>
              <div style={s.copyBar}>
                <div style={{ ...s.copyFill, width: `${((b.availableCopies || 0) / (b.totalCopies || 1)) * 100}%` }} />
              </div>
              <div style={s.copyStats}>
                <span style={{ color: b.availableCopies > 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>{b.availableCopies} available</span>
                <span style={{ color: 'var(--text-tertiary)' }}>{b.totalCopies} total</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={s.modal}>
            <div style={s.modalHead}>
              <h3 style={s.modalTitle}>Add Book to Library Registry</h3>
              <button style={s.closeBtn} onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} style={s.form}>
              <div style={s.fGroup}>
                <label style={s.label}>Book Title *</label>
                <input style={s.input} required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Uganda Certificate of Education Physics" />
              </div>
              <div style={s.fRow}>
                <div style={s.fGroup}>
                  <label style={s.label}>Author *</label>
                  <input style={s.input} required value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} placeholder="e.g. P. Okumu" />
                </div>
                <div style={s.fGroup}>
                  <label style={s.label}>ISBN / Identifier</label>
                  <input style={s.input} value={form.isbn} onChange={e => setForm(p => ({ ...p, isbn: e.target.value }))} placeholder="e.g. 978-9970-01-9" />
                </div>
              </div>
              <div style={s.fRow}>
                <div style={s.fGroup}>
                  <label style={s.label}>Curriculum Level</label>
                  <select style={s.input} value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}>
                    <option value="O-Level">O-Level (S1 - S4)</option>
                    <option value="A-Level">A-Level (S5 - S6)</option>
                    <option value="General">General Reference</option>
                  </select>
                </div>
                <div style={s.fGroup}>
                  <label style={s.label}>Category</label>
                  <select style={s.input} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.fRow}>
                <div style={s.fGroup}>
                  <label style={s.label}>Total Quantity / Copies</label>
                  <input style={s.input} type="number" min="1" required value={form.totalCopies} onChange={e => setForm(p => ({ ...p, totalCopies: e.target.value }))} />
                </div>
                <div style={s.fGroup}>
                  <label style={s.label}>Shelf Location</label>
                  <input style={s.input} value={form.shelfLocation} onChange={e => setForm(p => ({ ...p, shelfLocation: e.target.value }))} placeholder="e.g. Section B, Shelf 2" />
                </div>
              </div>
              <div style={s.modalFoot}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" style={s.submitBtn}><Save size={15} /> Save Textbook</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  loading: { padding: 40, textAlign: 'center', color: 'var(--text-secondary)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  filters: { display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', flex: 1, minWidth: 240 },
  searchInput: { border: 'none', background: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', flex: 1 },
  select: { border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' },
  addBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 },
  statCard: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: 'var(--shadow-sm)' },
  statVal: { fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' },
  statLbl: { fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  card: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 18, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: 'var(--shadow-sm)' },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  iconWrap: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  badgeWrap: { display: 'flex', gap: 6 },
  levelBadge: { padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 },
  catBadge: { backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 6, fontSize: 11, color: 'var(--text-secondary)' },
  bookTitle: { margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 },
  bookAuthor: { margin: 0, fontSize: 12, color: 'var(--text-secondary)' },
  metaList: { display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' },
  metaItem: { display: 'flex', justifyContent: 'space-between', fontSize: 12 },
  metaLabel: { color: 'var(--text-tertiary)', fontWeight: 600 },
  metaVal: { color: 'var(--text-secondary)', fontWeight: 600 },
  cardFoot: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' },
  copyBar: { height: 6, width: '100%', backgroundColor: 'var(--border)', borderRadius: 3, overflow: 'hidden' },
  copyFill: { height: '100%', backgroundColor: 'var(--primary)', borderRadius: 3 },
  copyStats: { display: 'flex', justifyContent: 'space-between', fontSize: 12 },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 540, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' },
  modalTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' },
  form: { padding: 20, display: 'flex', flexDirection: 'column', gap: 14 },
  fGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  fRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label: { fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' },
  input: { border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', backgroundColor: 'var(--bg-primary)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' },
  modalFoot: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13 },
  submitBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }
};
