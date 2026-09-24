import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { School, MapPin, Phone, Mail, ShieldCheck, Lock, ArrowRight } from 'lucide-react';

export default function SchoolFooter({ isAuthenticated, onOpenInquiry }) {
  const navigate = useNavigate();

  return (
    <footer className="ug-footer">
      <div className="ug-footer-inner">
        {/* Column 1: School Identity */}
        <div className="ug-footer-col">
          <div className="ug-footer-brand">
            <div className="ug-crest">
              <School size={22} color="#c59b27" />
            </div>
            <div>
              <h3>NDUGU ACADEMY</h3>
              <p>Senior Secondary Boarding &amp; Day School</p>
            </div>
          </div>
          <p className="ug-footer-desc">
            A premier Ugandan educational institution committed to academic rigor, spiritual groundedness, 
            and technological competence under the UNEB examination curriculum and New Lower Secondary CBC.
          </p>
          <div className="ug-footer-contact">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={17} color="#c59b27" />
              <span>Plot 14-18, Ndugu Hill Road, Wakiso District, Uganda</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Phone size={17} color="#c59b27" />
              <span>+256 414 789 000 / +256 772 123 456</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Mail size={17} color="#c59b27" />
              <span>admissions@ndugu.ac.ug / info@ndugu.ac.ug</span>
            </div>
          </div>
        </div>

        {/* Column 2: Academic Links */}
        <div className="ug-footer-col">
          <h4>Academic Portals</h4>
          <ul>
            <li><Link to="/academics">Lower Secondary CBC</Link></li>
            <li><Link to="/academics">A-Level Science Combos</Link></li>
            <li><Link to="/academics">A-Level Arts Combos</Link></li>
            <li><Link to="/welcome">UNEB Examination Center</Link></li>
            <li><Link to="/admissions">Fee Structure Guide</Link></li>
          </ul>
        </div>

        {/* Column 3: School Information */}
        <div className="ug-footer-col">
          <h4>Campus &amp; Life</h4>
          <ul>
            <li><Link to="/student-life">The Four Houses</Link></li>
            <li><Link to="/student-life">Hostels &amp; Boarding</Link></li>
            <li><Link to="/academics">Science &amp; ICT Labs</Link></li>
            <li><Link to="/student-life">Sports &amp; Athletics</Link></li>
            <li><Link to="/admissions">Term Dates Calendar</Link></li>
          </ul>
        </div>

        {/* Column 4: CRITICAL PORTAL LOGIN ACCESS IN FOOTER — NO BORDER */}
        <div className="ug-footer-col" id="footer-portal">
          <div className="ug-portal-box">
            <h4>
              <ShieldCheck size={22} color="#c59b27" />
              <span>Staff &amp; Admin System Access</span>
            </h4>
            <p style={{ fontSize: '14px', lineHeight: 1.6 }}>
              Authorized gateway for School Administrators, Teachers, Directors of Studies, and Bursars 
              to record marks, manage classes, and access student transcripts.
            </p>

            <button 
              onClick={() => navigate(isAuthenticated ? '/admin' : '/login')} 
              className="btn-footer-portal-login"
              id="btn-footer-portal-login"
              style={{ fontSize: '15px', padding: '14px 22px' }}
            >
              <Lock size={16} />
              <span>{isAuthenticated ? 'Enter Admin Dashboard' : 'Sign In to Portal'}</span>
              <ArrowRight size={16} />
            </button>

            <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
              Official school management network &bull; Secure Access
            </div>
          </div>
        </div>
      </div>

      {/* Footer Copyright */}
      <div className="ug-footer-bottom">
        <div>
          &copy; {new Date().getFullYear()} Ndugu Academy Secondary School Uganda. All rights reserved. MoES Reg: PSS/N/412 &bull; UNEB Centre: U3824.
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span style={{ cursor: 'pointer', color: '#d8b257' }} onClick={() => navigate(isAuthenticated ? '/admin' : '/login')}>
            Staff Login
          </span>
          <Link to="/welcome" style={{ color: 'inherit', textDecoration: 'none' }}>About School</Link>
          <Link to="/admissions" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Admission</Link>
        </div>
      </div>
    </footer>
  );
}
