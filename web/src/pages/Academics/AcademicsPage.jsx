import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Award, Sparkles, CheckCircle, Laptop, 
  FlaskConical, Compass, Library, ArrowRight, FileCheck 
} from 'lucide-react';
import SchoolHeader from '../../components/SchoolNav/SchoolHeader';
import SchoolFooter from '../../components/SchoolNav/SchoolFooter';
import InquiryModal from '../../components/SchoolNav/InquiryModal';
import '../LandingPage/LandingPage.css';

export default function AcademicsPage({ isAuthenticated }) {
  const navigate = useNavigate();
  const [showInquiry, setShowInquiry] = useState(false);
  const [activeTab, setActiveTab] = useState('lower'); // 'lower' | 'upper' | 'facilities'

  return (
    <div className="ug-school-root">
      <SchoolHeader isAuthenticated={isAuthenticated} onOpenInquiry={() => setShowInquiry(true)} />

      {/* Hero Showcase */}
      <section className="ug-hero" style={{ padding: '70px 48px 60px' }}>
        <div className="ug-hero-inner" style={{ gridTemplateColumns: '1fr', maxWidth: '1100px' }}>
          <div>
            <div className="ug-hero-tag">
              <Sparkles size={14} color="#c59b27" />
              <span>Ugandan National Curriculum &bull; UNEB Examination Centre U3824</span>
            </div>
            <h1 className="ug-hero-title" style={{ fontSize: '48px', marginBottom: '18px' }}>
              Academic Excellence &amp; <span>The New CBC Curriculum</span>
            </h1>
            <p className="ug-hero-desc" style={{ fontSize: '19px', maxWidth: '850px' }}>
              From hands-on competency-based learning at O-Level to rigorous preparation for university 
              in our premier A-Level combinations, Ndugu Academy consistently records outstanding UNEB results.
            </p>

            <div style={{ display: 'flex', gap: '14px', marginTop: '24px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setActiveTab('lower')} 
                style={{ 
                  backgroundColor: activeTab === 'lower' ? '#c59b27' : '#0d1527', 
                  color: activeTab === 'lower' ? '#080e1a' : '#fff',
                  border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '15px' 
                }}
              >
                O-Level (CBC S1 - S4)
              </button>
              <button 
                onClick={() => setActiveTab('upper')} 
                style={{ 
                  backgroundColor: activeTab === 'upper' ? '#c59b27' : '#0d1527', 
                  color: activeTab === 'upper' ? '#080e1a' : '#fff',
                  border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '15px' 
                }}
              >
                A-Level Combinations (S5 - S6)
              </button>
              <button 
                onClick={() => setActiveTab('facilities')} 
                style={{ 
                  backgroundColor: activeTab === 'facilities' ? '#c59b27' : '#0d1527', 
                  color: activeTab === 'facilities' ? '#080e1a' : '#fff',
                  border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '15px' 
                }}
              >
                Labs &amp; Academic Facilities
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Tabbed Content Area */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 32px' }}>
        
        {/* Tab 1: Lower Secondary CBC */}
        {activeTab === 'lower' && (
          <div>
            <div className="ug-section-head" style={{ textAlign: 'left', marginBottom: '32px' }}>
              <span className="ug-sec-tag">Senior 1 to Senior 4</span>
              <h2 className="ug-sec-title">New Lower Secondary Competency-Based Curriculum (CBC)</h2>
              <p className="ug-sec-sub" style={{ margin: '8px 0 0' }}>
                Rolled out by NCDC and examined by UNEB, the curriculum shifts education from rote memorization to real-world skill mastery, project delivery, and 20% continuous assessment.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '50px' }}>
              <div style={{ backgroundColor: '#0d1527', padding: '32px', borderRadius: '16px' }}>
                <FileCheck size={28} color="#c59b27" style={{ marginBottom: '16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>Continuous Assessment (20%)</h3>
                <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7 }}>
                  Learners undergo regular Activities of Integration (AoI) in each subject. Marks are captured across terms and submitted electronically to UNEB before final S.4 papers.
                </p>
              </div>

              <div style={{ backgroundColor: '#0d1527', padding: '32px', borderRadius: '16px' }}>
                <Laptop size={28} color="#c59b27" style={{ marginBottom: '16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>ICT &amp; Vocational Skills</h3>
                <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7 }}>
                  Every student develops computer literacy, coding basics, and vocational entrepreneurship, preparing them for self-reliance and technological fluency.
                </p>
              </div>

              <div style={{ backgroundColor: '#0d1527', padding: '32px', borderRadius: '16px' }}>
                <FlaskConical size={28} color="#c59b27" style={{ marginBottom: '16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>Practical Science Projects</h3>
                <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7 }}>
                  Physics, Chemistry, and Biology emphasize experimentation, local raw material processing, environmental conservation, and scientific inquiry.
                </p>
              </div>
            </div>

            <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '18px' }}>
              O-Level Subjects Offered
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '60px' }}>
              {[
                'English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
                'Geography', 'History & Political Ed', 'Christian Religious Ed (CRE)', 
                'Islamic Religious Ed (IRE)', 'Kiswahili', 'Information & Comm. Tech (ICT)',
                'Agriculture', 'Entrepreneurship', 'Fine Art', 'Literature in English', 'French Language'
              ].map(sub => (
                <div key={sub} style={{ backgroundColor: '#0d1527', padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CheckCircle size={17} color="#c59b27" />
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>{sub}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Upper Secondary A-Level Combinations */}
        {activeTab === 'upper' && (
          <div>
            <div className="ug-section-head" style={{ textAlign: 'left', marginBottom: '32px' }}>
              <span className="ug-sec-tag">Senior 5 to Senior 6</span>
              <h2 className="ug-sec-title">Uganda Advanced Certificate of Education (UACE)</h2>
              <p className="ug-sec-sub" style={{ margin: '8px 0 0' }}>
                We offer competitive science and arts combinations with proven tracks for direct university entry on national government merit and international admissions.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '50px' }}>
              {[
                {
                  code: 'PCM / ICT',
                  name: 'Physics, Chemistry, Mathematics + ICT + GP',
                  careers: 'Civil / Electrical Engineering, Architecture, Computer Science, Aviation',
                  badge: 'Science Track'
                },
                {
                  code: 'BCM / Sub-Math',
                  name: 'Biology, Chemistry, Mathematics + Sub-Math + GP',
                  careers: 'Medicine, Pharmacy, Nursing, Biochemistry, Biomedical Sciences',
                  badge: 'Medical Sciences'
                },
                {
                  code: 'PCB / Sub-Math',
                  name: 'Physics, Chemistry, Biology + Sub-Math + GP',
                  careers: 'Dentistry, Veterinary Medicine, Agricultural Sciences, Biotechnology',
                  badge: 'Science Track'
                },
                {
                  code: 'HEL / Div',
                  name: 'History, Economics, Literature in English + Divinity + GP',
                  careers: 'Law, International Relations, Mass Media, Diplomacy, Public Policy',
                  badge: 'Arts & Humanities'
                },
                {
                  code: 'MEG / Sub-Math',
                  name: 'Mathematics, Economics, Geography + Sub-Math + GP',
                  careers: 'Actuarial Science, Banking, Data Analytics, Quantitative Economics',
                  badge: 'Business & Quant'
                },
                {
                  code: 'HEG / Sub-Math',
                  name: 'History, Economics, Geography + Sub-Math + GP',
                  careers: 'Urban Planning, Environmental Governance, Business Administration',
                  badge: 'Social Sciences'
                },
                {
                  code: 'DEG / Sub-Math',
                  name: 'Divinity, Economics, Geography + Sub-Math + GP',
                  careers: 'Social Work, Development Studies, Theology, Human Resources',
                  badge: 'Humanities'
                },
                {
                  code: 'PEM / ICT',
                  name: 'Physics, Economics, Mathematics + ICT + GP',
                  careers: 'Financial Engineering, Software Engineering, Telecommunications',
                  badge: 'Tech & Math'
                }
              ].map(combo => (
                <div key={combo.code} style={{ backgroundColor: '#0d1527', padding: '28px', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#d8b257', margin: 0 }}>{combo.code}</h3>
                    <span style={{ backgroundColor: '#131f37', color: '#c59b27', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700 }}>
                      {combo.badge}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>{combo.name}</h4>
                  <div style={{ fontSize: '13.5px', color: '#94a3b8', lineHeight: 1.6 }}>
                    <strong style={{ color: '#cbd5e1' }}>Direct University Pathways: </strong>
                    {combo.careers}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Facilities */}
        {activeTab === 'facilities' && (
          <div>
            <div className="ug-section-head" style={{ textAlign: 'left', marginBottom: '32px' }}>
              <span className="ug-sec-tag">Learning Infrastructure</span>
              <h2 className="ug-sec-title">Laboratories, Libraries &amp; Modern Wings</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '60px' }}>
              <div style={{ backgroundColor: '#0d1527', padding: '32px', borderRadius: '16px' }}>
                <FlaskConical size={32} color="#c59b27" style={{ marginBottom: '16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Modern Science Laboratories</h3>
                <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7 }}>
                  Three separate dedicated laboratories for Physics, Chemistry, and Biology fully equipped with gas burners, digital spectrometers, microscopes, and safety showers meeting UNEB practical inspection standards.
                </p>
              </div>

              <div style={{ backgroundColor: '#0d1527', padding: '32px', borderRadius: '16px' }}>
                <Laptop size={32} color="#c59b27" style={{ marginBottom: '16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>100-Seat ICT Centre</h3>
                <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7 }}>
                  Equipped with modern desktop computers, dedicated high-speed fiber internet, projector presentation suites, and offline educational repositories for digital research.
                </p>
              </div>

              <div style={{ backgroundColor: '#0d1527', padding: '32px', borderRadius: '16px' }}>
                <Library size={32} color="#c59b27" style={{ marginBottom: '16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>St. Augustine Memorial Library</h3>
                <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7 }}>
                  Housing over 15,000 reference volumes, past UNEB examination papers with mark schemes, daily national newspapers, and a peaceful air-conditioned study hall for personal prep.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* UNEB Track Record & Call to Action */}
        <section style={{ backgroundColor: '#0d1527', padding: '44px 36px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '30px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Award size={24} color="#c59b27" />
              <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: 0 }}>Enrolling for 2026 Academic Year</h3>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '15px', margin: 0, maxWidth: '600px' }}>
              Secure a spot in Senior 1 or Senior 5. Interviews and intake placements are underway at our Admissions Desk.
            </p>
          </div>

          <button onClick={() => navigate('/admissions')} className="btn-hero-ug-gold">
            <span>Proceed to Admissions</span>
            <ArrowRight size={16} />
          </button>
        </section>
      </main>

      <SchoolFooter isAuthenticated={isAuthenticated} onOpenInquiry={() => setShowInquiry(true)} />
      <InquiryModal isOpen={showInquiry} onClose={() => setShowInquiry(false)} />
    </div>
  );
}
