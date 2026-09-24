import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import FinanceDashboard from './FinanceDashboard';
import AccountingCenter from './AccountingCenter';
import InvoiceManager from './InvoiceManager';
import PayrollManager from './PayrollManager';
import ExpenseTracker from './ExpenseTracker';
import LicokaGatekeeper from './LicokaGatekeeper';
import { BarChart2, FileText, Landmark, Users, Receipt, ShieldCheck } from 'lucide-react';

const tabs = [
  { id: 'overview',   label: 'Financial Overview',       icon: BarChart2 },
  { id: 'gatekeeper', label: 'Passes & Meal Cards (40%)', icon: ShieldCheck },
  { id: 'accounting', label: 'Accounting Center',        icon: Landmark },
  { id: 'invoices',   label: 'Receivables Ledger',       icon: FileText  },
  { id: 'payroll',    label: 'Payroll Ledger',            icon: Users     },
  { id: 'expenses',   label: 'Payables Ledger',           icon: Receipt   },
];

export default function Finance() {
  const { user } = useAuth();
  const readOnly = user?.role === 'headteacher';
  const [activeTab, setActiveTab] = useState('overview');

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':   return <FinanceDashboard setActiveFinanceTab={setActiveTab} readOnly={readOnly} />;
      case 'gatekeeper': return <LicokaGatekeeper readOnly={readOnly} />;
      case 'accounting': return <AccountingCenter readOnly={readOnly} />;
      case 'invoices':   return <InvoiceManager readOnly={readOnly} />;
      case 'payroll':    return <PayrollManager readOnly={readOnly} />;
      case 'expenses':   return <ExpenseTracker readOnly={readOnly} />;
      default:           return <FinanceDashboard setActiveFinanceTab={setActiveTab} readOnly={readOnly} />;
    }
  };

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
      {readOnly && <div style={s.readOnlyNotice}>Read-only finance view. Posting, approvals, and edits are restricted to the Finance Manager and administrators.</div>}
      <div className="animate-fade-in">{renderTab()}</div>
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
  readOnlyNotice: {
    padding: '10px 14px',
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: 600,
  },
};
