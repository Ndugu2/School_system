import React, { useState } from 'react';
import HostelDashboard from './HostelDashboard';
import RoomAssignment from './RoomAssignment';
import ExeatManager from './ExeatManager';
import { Home, Bed, ShieldCheck } from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Dormitories & Welfare', icon: Home },
  { id: 'rooms', label: 'Room & Bed Allocations', icon: Bed },
  { id: 'exeats', label: 'Digital Gate Passes (Exeat)', icon: ShieldCheck },
];

export default function Hostel() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div style={s.wrapper}>
      {/* Sub-nav */}
      <div style={s.subNav}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              style={{ ...s.tabBtn, ...(active ? s.tabActive : {}) }}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="animate-fade-in">
        {activeTab === 'overview' && <HostelDashboard setActiveTab={setActiveTab} />}
        {activeTab === 'rooms' && <RoomAssignment />}
        {activeTab === 'exeats' && <ExeatManager />}
      </div>
    </div>
  );
}

const s = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 24 },
  subNav: {
    display: 'flex', gap: 6, flexWrap: 'wrap',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: 6,
    boxShadow: 'var(--shadow-sm)',
  },
  tabBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 18px', borderRadius: 8, border: 'none',
    cursor: 'pointer', fontWeight: 600, fontSize: 13,
    color: 'var(--text-secondary)', backgroundColor: 'transparent',
    transition: 'var(--transition)',
  },
  tabActive: {
    backgroundColor: 'var(--primary)',
    color: '#fff',
    boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
  },
};
