import React, { useState } from 'react';
import InventoryDashboard from './InventoryDashboard';
import AssetRegistry from './AssetRegistry';
import ConsumableStock from './ConsumableStock';
import { Monitor, Package, BarChart2, ArrowLeftRight } from 'lucide-react';

const tabs = [
  { id: 'dashboard',   label: 'Dashboard',  icon: BarChart2      },
  { id: 'assets',      label: 'Assets',     icon: Monitor        },
  { id: 'consumables', label: 'Consumables',icon: Package        },
];

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':   return <InventoryDashboard setActiveTab={setActiveTab} />;
      case 'assets':      return <AssetRegistry />;
      case 'consumables': return <ConsumableStock />;
      default:            return <InventoryDashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div style={s.wrapper}>
      <div style={s.subNav}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} style={{ ...s.tabBtn, ...(active ? s.tabActive : {}) }} onClick={() => setActiveTab(tab.id)}>
              <Icon size={15} />{tab.label}
            </button>
          );
        })}
      </div>
      <div className="animate-fade-in">{renderTab()}</div>
    </div>
  );
}

const s = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 24 },
  subNav: { display: 'flex', gap: 6, flexWrap: 'wrap', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 6, boxShadow: 'var(--shadow-sm)' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', backgroundColor: 'transparent', transition: 'var(--transition)' },
  tabActive: { backgroundColor: 'var(--primary)', color: '#fff', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' },
};
