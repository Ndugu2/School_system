import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send, Search, UserRound } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Messages() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const currentUserId = user?._id || user?.id;

  const load = async () => {
    try {
      const [contactData, messageData] = await Promise.all([api.get('/messaging/contacts'), api.get('/messaging/conversations')]);
      setContacts(contactData);
      setMessages(messageData);
      setSelectedId(current => current || contactData[0]?._id || '');
    } catch (err) { setError(err.message); }
  };
  useEffect(() => { load(); }, []);

  const visibleContacts = useMemo(() => contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase())), [contacts, search]);
  const selected = contacts.find(c => c._id === selectedId);
  const thread = useMemo(() => messages.filter(m => m.sender?._id === selectedId || m.recipient?._id === selectedId), [messages, selectedId]);

  useEffect(() => {
    const unread = thread.filter(m => m.recipient?._id === currentUserId && !m.isRead);
    unread.forEach(m => api.put(`/messaging/conversations/${m._id}/read`, {}).catch(() => {}));
    if (unread.length) setMessages(current => current.map(m => unread.some(u => u._id === m._id) ? { ...m, isRead: true } : m));
  }, [selectedId, messages.length, currentUserId]);

  const send = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !selectedId || sending) return;
    setSending(true); setError('');
    try {
      const message = await api.post('/messaging/conversations', { recipientId: selectedId, content: draft });
      setMessages(current => [...current, message]);
      setDraft('');
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  };

  return <div style={s.page}>
    <div style={s.heading}><div><h2 style={s.title}>School Messages</h2><p style={s.subtitle}>Private conversations between parents and authorised school staff.</p></div></div>
    {error && <div style={s.error}>{error}</div>}
    <div style={s.shell}>
      <aside style={s.contacts}>
        <div style={s.search}><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a contact" style={s.searchInput}/></div>
        {visibleContacts.map(contact => {
          const unread = messages.filter(m => m.sender?._id === contact._id && m.recipient?._id === currentUserId && !m.isRead).length;
          return <button key={contact._id} onClick={() => setSelectedId(contact._id)} style={{...s.contact, ...(selectedId === contact._id ? s.contactActive : {})}}>
            <div style={s.avatar}>{contact.name.charAt(0)}</div><div style={s.contactInfo}><strong>{contact.name}</strong><span>{contact.role.replace('-', ' ')}</span></div>{unread > 0 && <b style={s.badge}>{unread}</b>}
          </button>;
        })}
        {!visibleContacts.length && <p style={s.empty}>No contacts available.</p>}
      </aside>
      <section style={s.threadPanel}>
        {selected ? <><header style={s.threadHeader}><div style={s.avatar}>{selected.name.charAt(0)}</div><div><strong>{selected.name}</strong><div style={s.role}>{selected.role.replace('-', ' ')}</div></div></header>
          <div style={s.thread}>{thread.length ? thread.map(message => {
            const mine = message.sender?._id === currentUserId;
            return <div key={message._id} style={{...s.row, justifyContent: mine ? 'flex-end' : 'flex-start'}}><div style={{...s.bubble, ...(mine ? s.mine : s.theirs)}}><div>{message.content}</div><small style={s.time}>{new Date(message.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</small></div></div>;
          }) : <div style={s.emptyThread}><MessageCircle size={34}/><p>Start a conversation with {selected.name}.</p></div>}</div>
          <form onSubmit={send} style={s.composer}><input value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} placeholder="Write a message…" style={s.composeInput}/><button disabled={!draft.trim() || sending} style={s.send}><Send size={17}/>{sending ? 'Sending' : 'Send'}</button></form>
        </> : <div style={s.emptyThread}><UserRound size={34}/><p>Select a contact to start messaging.</p></div>}
      </section>
    </div>
  </div>;
}

const s = {
  page: { display: 'flex', flexDirection: 'column', gap: 18 }, heading: { display: 'flex', justifyContent: 'space-between' }, title: { margin: 0, fontSize: 24, color: 'var(--text-primary)' }, subtitle: { margin: '5px 0 0', color: 'var(--text-secondary)', fontSize: 14 }, error: { padding: 12, borderRadius: 8, color: '#991b1b', background: '#fee2e2' }, shell: { display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', minHeight: 560, border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: 'var(--bg-secondary)' }, contacts: { borderRight: '1px solid var(--border)', overflowY: 'auto' }, search: { display: 'flex', gap: 8, alignItems: 'center', margin: 14, padding: '9px 10px', borderRadius: 8, background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }, searchInput: { background: 'transparent', border: 0, outline: 0, width: '100%', color: 'var(--text-primary)' }, contact: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: 0, background: 'transparent', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer' }, contactActive: { background: 'var(--primary-light)' }, avatar: { width: 36, height: 36, flex: '0 0 36px', borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff', background: 'var(--primary)', fontWeight: 700 }, contactInfo: { display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 2, flex: 1 }, badge: { minWidth: 20, height: 20, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--primary)', color: '#fff', fontSize: 11 }, threadPanel: { display: 'flex', flexDirection: 'column', minWidth: 0 }, threadHeader: { display: 'flex', gap: 10, alignItems: 'center', padding: 14, borderBottom: '1px solid var(--border)' }, role: { color: 'var(--text-tertiary)', fontSize: 12, marginTop: 2, textTransform: 'capitalize' }, thread: { flex: 1, padding: 18, overflowY: 'auto', background: 'var(--bg-primary)' }, row: { display: 'flex', marginBottom: 12 }, bubble: { maxWidth: '75%', padding: '10px 12px', borderRadius: 12, lineHeight: 1.4, fontSize: 14 }, mine: { background: 'var(--primary)', color: '#fff', borderBottomRightRadius: 3 }, theirs: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderBottomLeftRadius: 3 }, time: { display: 'block', marginTop: 5, opacity: .7, fontSize: 10 }, composer: { display: 'flex', gap: 10, padding: 14, borderTop: '1px solid var(--border)' }, composeInput: { flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 0 }, send: { display: 'flex', gap: 6, alignItems: 'center', border: 0, borderRadius: 8, padding: '0 14px', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 700 }, empty: { padding: 16, color: 'var(--text-tertiary)', textAlign: 'center', fontSize: 13 }, emptyThread: { flex: 1, display: 'grid', placeContent: 'center', justifyItems: 'center', color: 'var(--text-tertiary)', textAlign: 'center' }
};
