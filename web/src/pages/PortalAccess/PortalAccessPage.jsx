import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Lock, Users, BookOpen, CreditCard, 
  Sparkles, CheckCircle, ArrowRight, Laptop, KeyRound 
} from 'lucide-react';
import SchoolHeader from '../../components/SchoolNav/SchoolHeader';
import SchoolFooter from '../../components/SchoolNav/SchoolFooter';
import '../LandingPage/LandingPage.css';

export default function PortalAccessPage({ isAuthenticated }) {
  const navigate = useNavigate();

  return (
    <div className="ug-school-root">
      <SchoolHeader isAuthenticated={isAuthenticated} onOpenInquiry={() => {}} />

      {/* Hero Banner */}
      <section className="ug-hero" style={{ padding: '70px 48px 60px' }}>
        <div className="ug-hero-inner" style={{ gridTemplateColumns: '1fr', maxWidth: '1100px' }}>
          <div>
            <div className="ug-hero-tag">
              <Sparkles size={14} color="#c59b27" />
              <span>Ndugu Academy Management Information System (MIS)</span>
            </div>
            <h1 className="ug-hero-title" style={{ fontSize: '48px', marginBottom: '18px' }}>
              Official <span>School Portal Gateway</span>
            </h1>
            <p className="ug-hero-desc" style={{ fontSize: '19px', maxWidth: '850px' }}>
              The central operational nerve center of Ndugu Academy. Securely managing student admissions, 
              CBC assessment portfolios, UNEB exam marks, term report cards, fee invoicing, and staff records.
            </p>

            <div style={{ marginTop: '24px' }}>
              <button 
                onClick={() => navigate(isAuthenticated ? '/admin' : '/login')} 
                className="btn-hero-ug-gold"
                style={{ fontSize: '17px', padding: '16px 36px' }}
              >
                <Lock size={18} />
                <span>{isAuthenticated ? 'Enter Admin Dashboard' : 'Sign In to Portal Now'}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 32px' }}>
        
        {/* System Roles & Modules */}
        <section style={{ marginBottom: '70px' }}>
          <div className="ug-section-head" style={{ textAlign: 'left', marginBottom: '32px' }}>
            <span className="ug-sec-tag">Role-Based Access</span>
            <h2 className="ug-sec-title">Authorized Portals &amp; System Capabilities</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            
            {/* Administrators */}
            <div style={{ backgroundColor: '#0d1527', padding: '32px', borderRadius: '16px' }}>
              <ShieldCheck size={32} color="#c59b27" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>Headteacher &amp; Administration</h3>
              <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7, marginBottom: '16px' }}>
                Complete oversight over school metrics: enrollment counts, staff attendance, disciplinary logs, clearance verifications, and board reporting.
              </p>
              <div style={{ fontSize: '13px', color: '#d8b257', fontWeight: 700 }}>
                Includes: System User Logs &bull; Database Audits &bull; Term Clearances
              </div>
            </div>

            {/* Teachers & DOS */}
            <div style={{ backgroundColor: '#0d1527', padding: '32px', borderRadius: '16px' }}>
              <BookOpen size={32} color="#c59b27" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>Teachers &amp; Director of Studies</h3>
              <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7, marginBottom: '16px' }}>
                Digitally records student competency scores, AoI projects, terminal examination marks, automated report card remarks, and class registers.
              </p>
              <div style={{ fontSize: '13px', color: '#d8b257', fontWeight: 700 }}>
                Includes: Continuous Assessment &bull; UNEB Marksheets &bull; Class Logs
              </div>
            </div>

            {/* Bursar & Finance */}
            <div style={{ backgroundColor: '#0d1527', padding: '32px', borderRadius: '16px' }}>
              <CreditCard size={32} color="#c59b27" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>Bursary &amp; Accounts Department</h3>
              <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7, marginBottom: '16px' }}>
                Manages term fee ledger, SchoolPay reconciliations, bank deposit verification, automated receipt generation, and fee balance alerts.
              </p>
              <div style={{ fontSize: '13px', color: '#d8b257', fontWeight: 700 }}>
                Includes: Fee Clearances &bull; Expense Tracking &bull; Invoice Generation
              </div>
            </div>
          </div>
        </section>

        {/* Security & System Info */}
        <section style={{ backgroundColor: '#0d1527', padding: '40px 36px', borderRadius: '18px', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '40px', alignItems: 'center', marginBottom: '60px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <KeyRound size={24} color="#c59b27" />
              <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: 0 }}>Security &amp; Encryption</h3>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '15.5px', lineHeight: 1.7, marginBottom: '16px' }}>
              Ndugu Academy MIS uses enterprise-grade role-based access control, cryptographic password hashing (bcrypt), and TLS-encrypted communication. All staff activities and mark changes are permanently logged to maintain absolute integrity of academic records.
            </p>
            <div style={{ display: 'flex', gap: '20px', color: '#94a3b8', fontSize: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={16} color="#c59b27" /> 256-bit SSL</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={16} color="#c59b27" /> Audit Logging</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={16} color="#c59b27" /> Automated Backups</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#131f37', padding: '30px', borderRadius: '14px', textAlign: 'center' }}>
            <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>Authorized Staff Member?</h4>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
              Log in with your official staff username or email and password.
            </p>
            <button 
              onClick={() => navigate('/login')} 
              className="btn-hero-ug-gold"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Lock size={16} />
              <span>Go to Login Screen</span>
            </button>
          </div>
        </section>
      </main>

      <SchoolFooter isAuthenticated={isAuthenticated} onOpenInquiry={() => {}} />
    </div>
  );
}
