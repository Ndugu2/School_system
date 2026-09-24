import React, { useState } from 'react';
import FinanceDashboard from './FinanceDashboard';
import InvoiceManager from './InvoiceManager';
import PayrollManager from './PayrollManager';
import ExpenseTracker from './ExpenseTracker';
import LicokaGatekeeper from './LicokaGatekeeper';
import ChartOfAccountsTab from './ChartOfAccountsTab';
import QuotationsTab from './QuotationsTab';
import PaymentsTab from './PaymentsTab';
import FeeStructureTab from './FeeStructureTab';
import StudentStatementTab from './StudentStatementTab';
import BursariesTab from './BursariesTab';
import PayBillsTab from './PayBillsTab';
import AccountingCenter from './AccountingCenter';
import {
  BarChart2, FileText, Landmark, Users, Receipt, ShieldCheck,
  Layers, FileSpreadsheet, CreditCard, SlidersHorizontal, BookOpen,
  Award, Wallet
} from 'lucide-react';

const tabs = [
  { id: 'overview',   label: 'Financial Overview',         icon: BarChart2 },
  { id: 'coa',        label: 'Chart of Accounts',          icon: Layers },
  { id: 'invoices',   label: 'Invoices & Receivables',     icon: FileText },
  { id: 'statements', label: 'Statements of Account',      icon: BookOpen },
  { id: 'payments',   label: 'Receive Payments',           icon: CreditCard },
  { id: 'bursaries',  label: 'Bursaries & Aid',            icon: Award },
  { id: 'paybills',   label: 'Pay Bills (A/P)',            icon: Wallet },
  { id: 'quotations', label: 'Estimates & Quotes',         icon: FileSpreadsheet },
  { id: 'fees',       label: 'Tuition & Tours Matrix',     icon: SlidersHorizontal },
  { id: 'accounting', label: 'General Ledger & Reports',   icon: Landmark },
  { id: 'gatekeeper', label: 'Passes & Meal Cards',        icon: ShieldCheck },
  { id: 'payroll',    label: 'Payroll Ledger',             icon: Users },
  { id: 'expenses',   label: 'Expense Claims',             icon: Receipt },
];

export default function Finance({ readOnly = false }) {
  const [activeTab, setActiveTab] = useState('overview');

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':   return <FinanceDashboard setActiveFinanceTab={setActiveTab} readOnly={readOnly} />;
      case 'coa':        return <ChartOfAccountsTab readOnly={readOnly} />;
      case 'invoices':   return <InvoiceManager readOnly={readOnly} onReceivePayment={() => setActiveTab('payments')} onOpenStatement={() => setActiveTab('statements')} />;
      case 'statements': return <StudentStatementTab readOnly={readOnly} />;
      case 'payments':   return <PaymentsTab readOnly={readOnly} onOpenStatement={() => setActiveTab('statements')} />;
      case 'bursaries':  return <BursariesTab readOnly={readOnly} />;
      case 'paybills':   return <PayBillsTab readOnly={readOnly} />;
      case 'quotations': return <QuotationsTab readOnly={readOnly} onInvoiceCreated={() => setActiveTab('invoices')} />;
      case 'fees':       return <FeeStructureTab readOnly={readOnly} />;
      case 'accounting': return <AccountingCenter readOnly={readOnly} />;
      case 'gatekeeper': return <LicokaGatekeeper readOnly={readOnly} />;
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
};
