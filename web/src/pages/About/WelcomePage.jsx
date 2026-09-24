import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  School, Award, BookOpen, Users, CheckCircle, ShieldCheck, 
  MapPin, Calendar, HeartHandshake, Sparkles, ArrowRight 
} from 'lucide-react';
import SchoolHeader from '../../components/SchoolNav/SchoolHeader';
import SchoolFooter from '../../components/SchoolNav/SchoolFooter';
import InquiryModal from '../../components/SchoolNav/InquiryModal';
import '../LandingPage/LandingPage.css';

export default function WelcomePage({ isAuthenticated }) {
  const navigate = useNavigate();
  const [showInquiry, setShowInquiry] = useState(false);

  return (
    <div className="ug-school-root">
      <SchoolHeader isAuthenticated={isAuthenticated} onOpenInquiry={() => setShowInquiry(true)} />

      {/* Page Header Banner */}
      <section className="ug-hero" style={{ padding: '70px 48px 60px' }}>
        <div className="ug-hero-inner" style={{ gridTemplateColumns: '1fr', maxWidth: '1100px' }}>
          <div>
            <div className="ug-hero-tag">
              <Sparkles size={14} color="#c59b27" />
              <span>About Ndugu Academy &bull; Est. 1994 &bull; Wakiso District</span>
            </div>
            <h1 className="ug-hero-title" style={{ fontSize: '48px', marginBottom: '18px' }}>
              Welcome to <span>Ndugu Academy</span>
            </h1>
            <p className="ug-hero-desc" style={{ fontSize: '19px', maxWidth: '850px' }}>
              For over three decades, Ndugu Academy has stood as a beacon of academic eminence, 
              Christian moral character, and holistic development in Uganda, transforming eager youths 
              into principled global leaders.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 32px' }}>
        
        {/* Headteacher's Comprehensive Welcome */}
        <div className="ug-welcome-box" style={{ marginBottom: '60px' }}>
          <div className="ug-principal-avatar">
            <School size={60} color="#c59b27" />
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <div style={{ fontWeight: 800, fontSize: '18px', color: '#fff' }}>Principal's Office</div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>Mr. E. Ssebaggala</div>
            </div>
          </div>

          <div>
            <span className="ug-sec-tag">Official Address</span>
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', marginBottom: '20px' }}>
              "Nurturing the Mind, Disciplining the Heart, Inspiring the Nation"
            </h2>
            <p className="ug-quote" style={{ fontSize: '16.5px', lineHeight: 1.8 }}>
              "Welcome to Ndugu Academy. Choosing the right secondary school for your child is one of the most critical decisions a parent can make. At Ndugu Academy, we provide more than academic instruction; we provide a nurturing sanctuary where discipline is cultivated, spiritual values are grounded, and every student's innate potential is unlocked.
            </p>
            <p style={{ color: '#cbd5e1', fontSize: '15.5px', lineHeight: 1.8, marginBottom: '24px' }}>
              Under the New Lower Secondary Curriculum (CBC), our dedicated teachers ignite critical thinking, teamwork, and innovation through hands-on science and technology projects. As you browse our portal and campus life, we warmly invite you to join our family of excellence."
            </p>
            <div className="ug-principal-sig">
              <h4>Mr. Emmanuel Ssebaggala, M.Ed (Mak), B.Sc Ed (Hons)</h4>
              <p>Headteacher &bull; Ndugu Academy Secondary School</p>
            </div>
          </div>
        </div>

        {/* Vision, Mission, & Core Values */}
        <section style={{ marginBottom: '70px' }}>
          <div className="ug-section-head" style={{ textAlign: 'left', marginBottom: '32px' }}>
            <span className="ug-sec-tag">Foundational Principles</span>
            <h2 className="ug-sec-title">Vision, Mission &amp; Core Pillars</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <div style={{ backgroundColor: '#0d1527', padding: '36px', borderRadius: '16px' }}>
              <Award size={32} color="#c59b27" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Our Vision</h3>
              <p style={{ color: '#cbd5e1', fontSize: '15.5px', lineHeight: 1.7 }}>
                To be the model secondary institution in East Africa recognized for moral integrity, 
                superlative academic standards, and transformative community leadership.
              </p>
            </div>

            <div style={{ backgroundColor: '#0d1527', padding: '36px', borderRadius: '16px' }}>
              <BookOpen size={32} color="#c59b27" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Our Mission</h3>
              <p style={{ color: '#cbd5e1', fontSize: '15.5px', lineHeight: 1.7 }}>
                To deliver holistic, learner-centered education that empowers young men and women to 
                thrive spiritually, academically, technologically, and socially.
              </p>
            </div>

            <div style={{ backgroundColor: '#0d1527', padding: '36px', borderRadius: '16px' }}>
              <HeartHandshake size={32} color="#c59b27" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Core Pillars</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '15px' }}>
                  <CheckCircle size={16} color="#c59b27" />
                  <strong>Diligence:</strong> Unyielding commitment to hard work.
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '15px' }}>
                  <CheckCircle size={16} color="#c59b27" />
                  <strong>Integrity:</strong> Honesty in examinations and conduct.
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '15px' }}>
                  <CheckCircle size={16} color="#c59b27" />
                  <strong>Godliness:</strong> Deep reverence for God in daily living.
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '15px' }}>
                  <CheckCircle size={16} color="#c59b27" />
                  <strong>Excellence:</strong> Refusing mediocrity in every endeavor.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* School Leadership & Board of Governors */}
        <section style={{ marginBottom: '70px' }}>
          <div className="ug-section-head" style={{ textAlign: 'left', marginBottom: '32px' }}>
            <span className="ug-sec-tag">Governance &amp; Direction</span>
            <h2 className="ug-sec-title">School Administration &amp; Leadership</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {[
              { name: 'Dr. Patrick Byaruhanga', role: 'Chairperson, Board of Governors', qual: 'Ph.D. Education Administration' },
              { name: 'Mr. Emmanuel Ssebaggala', role: 'Headteacher & Secretary to BOG', qual: 'M.Ed (Makerere), B.Sc Ed' },
              { name: 'Mrs. Florence Nabukalu', role: 'Deputy Headteacher (Academics)', qual: 'B.Ed, Post-Grad Dip Ed Mgt' },
              { name: 'Rev. Fr. Peter Kigozi', role: 'Deputy Headteacher (Administration)', qual: 'B.A Philosophy, M.A Theo' },
              { name: 'Mr. David Mugisha', role: 'Director of Studies (DOS)', qual: 'B.Sc Mathematics / Physics' },
              { name: 'Mrs. Sarah Namutebi', role: 'Dean of Students & Welfare', qual: 'B.A Social Works & Admin' },
              { name: 'Mr. Robert Kato', role: 'Senior Bursar & Finance Manager', qual: 'B.Com (Acc), CPA Uganda' },
              { name: 'Sr. Mary Goretti', role: 'Head of Guidance & Counseling', qual: 'M.Sc Counseling Psychology' },
            ].map(leader => (
              <div key={leader.name} style={{ backgroundColor: '#0d1527', padding: '24px', borderRadius: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#131f37', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Users size={20} color="#c59b27" />
                </div>
                <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', margin: '0 0 6px 0' }}>{leader.name}</h4>
                <div style={{ fontSize: '13.5px', color: '#d8b257', fontWeight: 700, marginBottom: '6px' }}>{leader.role}</div>
                <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>{leader.qual}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Accreditation & Stats */}
        <section style={{ backgroundColor: '#0d1527', padding: '44px 36px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '30px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <ShieldCheck size={24} color="#c59b27" />
              <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: 0 }}>Registered &amp; Accredited</h3>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '15px', margin: 0, maxWidth: '580px' }}>
              Ministry of Education &amp; Sports Registration No: <strong>PSS/N/412</strong> &bull; Uganda National Examinations Board (UNEB) Examination Centre No: <strong>U3824</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button onClick={() => navigate('/admissions')} className="btn-hero-ug-gold">
              <span>View Admissions</span>
              <ArrowRight size={16} />
            </button>
            <button onClick={() => navigate('/academics')} className="btn-hero-ug-outline">
              <span>Curriculum Details</span>
            </button>
          </div>
        </section>
      </main>

      <SchoolFooter isAuthenticated={isAuthenticated} onOpenInquiry={() => setShowInquiry(true)} />
      <InquiryModal isOpen={showInquiry} onClose={() => setShowInquiry(false)} />
    </div>
  );
}
