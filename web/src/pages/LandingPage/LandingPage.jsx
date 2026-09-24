import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  School, 
  ArrowRight, 
  Sparkles, 
  BookOpen, 
  Award, 
  Laptop, 
  Calendar
} from 'lucide-react';
import SchoolHeader from '../../components/SchoolNav/SchoolHeader';
import SchoolFooter from '../../components/SchoolNav/SchoolFooter';
import InquiryModal from '../../components/SchoolNav/InquiryModal';
import './LandingPage.css';

export default function LandingPage({ isAuthenticated }) {
  const navigate = useNavigate();
  const [showInquiryModal, setShowInquiryModal] = useState(false);

  // 3 high school student life background images
  const heroImages = [
    {
      url: '/images/hero-students-1.jpg',
      caption: 'Uganda Scholars in Science Practical Lab'
    },
    {
      url: '/images/hero-students-2.jpg',
      caption: 'Interactive Classroom Learning & Discussion'
    },
    {
      url: '/images/hero-students-3.jpg',
      caption: 'Vibrant Campus Grounds & Student Community'
    }
  ];

  const [activeHeroBg, setActiveHeroBg] = useState(0);

  // Auto-rotate hero background images every 6.5s
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveHeroBg((prev) => (prev + 1) % heroImages.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  return (
    <div className="ug-school-root">
      {/* ── 1. MAIN NAVIGATION BAR WITH DEDICATED ROUTE BUTTONS ─ */}
      <SchoolHeader isAuthenticated={isAuthenticated} onOpenInquiry={() => setShowInquiryModal(true)} />

      {/* ── 2. HERO SHOWCASE WITH BRIGHT HIGH SCHOOL LIFE BACKGROUND ── */}
      <section className="ug-hero">
        {/* Atmospheric Student Life Background */}
        <div className="ug-hero-bg-wrap">
          {heroImages.map((img, idx) => (
            <div
              key={img.url}
              className={`ug-hero-bg-slide ${idx === activeHeroBg ? 'active' : ''}`}
              style={{ backgroundImage: `url(${img.url})` }}
            />
          ))}
          {/* Solid Dark Blue Tint Overlay (No Gradients) */}
          <div className="ug-hero-bg-overlay" />
        </div>

        {/* Interactive Slide Indicators in bottom right */}
        <div className="ug-hero-indicators">
          {heroImages.map((img, idx) => (
            <button
              key={img.url}
              type="button"
              className={`ug-hero-dot ${idx === activeHeroBg ? 'active' : ''}`}
              onClick={() => setActiveHeroBg(idx)}
              title={img.caption}
            />
          ))}
          <span className="ug-hero-caption">{heroImages[activeHeroBg].caption}</span>
        </div>

        <div className="ug-hero-inner">
          <div>
            <div className="ug-hero-tag">
              <Sparkles size={14} color="#c59b27" />
              <span>Ministry of Education &amp; Sports Registered &bull; PSS/N/412</span>
            </div>

            <h2 className="ug-hero-title">
              Nurturing Leaders of Integrity, Faith &amp; <span>Global Intellect</span>
            </h2>

            <p className="ug-hero-desc">
              Welcome to Ndugu Academy Secondary School — a premier Ugandan boarding &amp; day institution. 
              Delivering the New Lower Secondary Competence-Based Curriculum (CBC) and top-tier UNEB A-Level combinations.
            </p>

            <div className="ug-hero-actions">
              <button onClick={() => navigate('/admissions')} className="btn-hero-ug-gold">
                <span>Apply for 2026 Intake</span>
                <ArrowRight size={16} />
              </button>
              <button onClick={() => navigate('/academics')} className="btn-hero-ug-outline">
                <BookOpen size={16} color="#c59b27" />
                <span>Explore Combinations</span>
              </button>
            </div>
          </div>

          {/* Quick Academic Highlights Card — NO BORDERS */}
          <div className="ug-hero-card">
            <span className="ug-card-badge">Academic Highlights</span>
            <h3>
              <Award size={20} color="#c59b27" />
              <span>UNEB Performance Record</span>
            </h3>

            <div className="ug-stat-row">
              <div className="ug-stat-item">
                <div className="ug-stat-num">98.6%</div>
                <div className="ug-stat-desc">Division 1 in UCE</div>
              </div>
              <div className="ug-stat-item">
                <div className="ug-stat-num">20 Pts</div>
                <div className="ug-stat-desc">UACE Peak Score</div>
              </div>
              <div className="ug-stat-item">
                <div className="ug-stat-num">1,250+</div>
                <div className="ug-stat-desc">Scholars Enrolled</div>
              </div>
              <div className="ug-stat-item">
                <div className="ug-stat-num">1:18</div>
                <div className="ug-stat-desc">Teacher to Student Ratio</div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#0d1527',
              borderRadius: '10px',
              padding: '14px',
              fontSize: '12px',
              color: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>Next Term Commencement:</span>
              <strong style={{ color: '#d8b257' }}>24th May, 2026</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. HEADTEACHER'S WELCOME SUMMARY ───────────────── */}
      <section className="ug-section">
        <div className="ug-welcome-box">
          <div className="ug-principal-avatar">
            <School size={52} color="#c59b27" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '17px', color: '#fff' }}>Principal's Office</div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>Ndugu Academy</div>
            </div>
          </div>

          <div>
            <span className="ug-sec-tag">Message from the Headteacher</span>
            <h3 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '18px' }}>
              "Empowering Every Child to Reach Their God-Given Potential"
            </h3>
            <p className="ug-quote">
              "At Ndugu Academy, we believe education goes beyond passing national exams. We cultivate 
              character, spiritual uprightness, critical thinking, and technological readiness. 
              Our state-of-the-art physics, chemistry, biology, and ICT laboratories provide scholars 
              with practical hands-on experience under the New Lower Secondary Curriculum, setting 
              them up for leadership at university and in the global economy."
            </p>
            <div className="ug-principal-sig" style={{ marginBottom: '20px' }}>
              <h4>Mr. Emmanuel Ssebaggala, M.Ed (Mak)</h4>
              <p>Headteacher &bull; Ndugu Academy Secondary School</p>
            </div>

            <button onClick={() => navigate('/welcome')} className="btn-hero-ug-outline">
              <span>Read Full Headteacher Address &amp; Leadership</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── 4. CURRICULUM & COMBINATIONS PREVIEW ───────────── */}
      <section className="ug-section">
        <div className="ug-section-head">
          <span className="ug-sec-tag">National Curriculum Breakdown</span>
          <h2 className="ug-sec-title">Academic Tracks &amp; Subject Combinations</h2>
          <p className="ug-sec-sub">
            Accredited by the Ministry of Education &amp; Sports and UNEB for both O-Level (UCE) and A-Level (UACE).
          </p>
        </div>

        <div className="ug-curriculum-grid">
          {/* Lower Secondary */}
          <div className="ug-curr-card">
            <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#0d1527', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c59b27' }}>
              <BookOpen size={20} />
            </div>
            <h3>Lower Secondary (S1 - S4)</h3>
            <p>
              Fully aligned with the NCDC Competency-Based Curriculum. Emphasizes Continuous Assessment (20%), 
              learner-centered projects, digital research, and national UNEB summative examinations.
            </p>
            <div className="ug-curr-tags">
              <span className="ug-pill">General Sciences</span>
              <span className="ug-pill">Mathematics</span>
              <span className="ug-pill">ICT &amp; Computer Studies</span>
              <span className="ug-pill">Luganda &amp; French</span>
              <span className="ug-pill">Entrepreneurship</span>
              <span className="ug-pill">Agriculture</span>
            </div>
          </div>

          {/* Upper Secondary Sciences */}
          <div className="ug-curr-card">
            <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#0d1527', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c59b27' }}>
              <Laptop size={20} />
            </div>
            <h3>A-Level Sciences (S5 - S6)</h3>
            <p>
              Prestigious combinations preparing students for Medicine, Engineering, Architecture, 
              Pharmacy, and Computer Science degrees in leading African and international universities.
            </p>
            <div className="ug-curr-tags">
              <span className="ug-pill">PCM / ICT</span>
              <span className="ug-pill">PCB / Sub-Math</span>
              <span className="ug-pill">BCM / ICT</span>
              <span className="ug-pill">PEM / Sub-Math</span>
              <span className="ug-pill">MEG / ICT</span>
            </div>
          </div>

          {/* Upper Secondary Arts */}
          <div className="ug-curr-card">
            <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#0d1527', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c59b27' }}>
              <Award size={20} />
            </div>
            <h3>A-Level Arts &amp; Humanities</h3>
            <p>
              Designed for future advocates, economists, diplomats, and corporate managers with intensive 
              debate, moot court training, and analytical essays.
            </p>
            <div className="ug-curr-tags">
              <span className="ug-pill">HEG / Sub-Math</span>
              <span className="ug-pill">HEL / Divinity</span>
              <span className="ug-pill">DEG / ICT</span>
              <span className="ug-pill">LED / Sub-Math</span>
              <span className="ug-pill">MEA / Fine Art</span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '36px' }}>
          <button onClick={() => navigate('/academics')} className="btn-hero-ug-gold">
            <span>Explore Complete Academics, CBC &amp; Syllabi</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ── 5. HOUSE SYSTEM & CO-CURRICULAR PREVIEW ───────── */}
      <section className="ug-section">
        <div className="ug-section-head">
          <span className="ug-sec-tag">Tradition &amp; Excellence</span>
          <h2 className="ug-sec-title">The Four Houses of Ndugu Academy</h2>
          <p className="ug-sec-sub">
            Every student belongs to a house that fosters teamwork, mentorship, sportsmanship, and inter-house competitions.
          </p>
        </div>

        <div className="ug-house-grid">
          <div className="ug-house-card" onClick={() => navigate('/student-life')} style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: '36px' }}>🦁</div>
            <div className="ug-house-name">Lumumba House</div>
            <div className="ug-house-motto">"Wisdom &amp; Valor"</div>
            <p style={{ fontSize: '13.5px', color: '#94a3b8' }}>Focus: Academic Mastery, Science Fair &amp; Debate</p>
          </div>

          <div className="ug-house-card" onClick={() => navigate('/student-life')} style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: '36px' }}>⚔️</div>
            <div className="ug-house-name">Kabalega House</div>
            <div className="ug-house-motto">"Courage Under Fire"</div>
            <p style={{ fontSize: '13.5px', color: '#94a3b8' }}>Focus: Athletics, Football &amp; Leadership</p>
          </div>

          <div className="ug-house-card" onClick={() => navigate('/student-life')} style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: '36px' }}>🛡️</div>
            <div className="ug-house-name">Muteesa House</div>
            <div className="ug-house-motto">"Honor &amp; Service"</div>
            <p style={{ fontSize: '13.5px', color: '#94a3b8' }}>Focus: Scouting, Community Outreach &amp; Integrity</p>
          </div>

          <div className="ug-house-card" onClick={() => navigate('/student-life')} style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: '36px' }}>🦅</div>
            <div className="ug-house-name">Kiwanuka House</div>
            <div className="ug-house-motto">"Excellence Always"</div>
            <p style={{ fontSize: '13.5px', color: '#94a3b8' }}>Focus: Music, Dance &amp; Drama, Culture &amp; Innovation</p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '36px' }}>
          <button onClick={() => navigate('/student-life')} className="btn-hero-ug-outline">
            <span>Explore Student Life &amp; House Standings</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ── 6. ADMISSIONS DESK BANNER ─────────────────────── */}
      <section className="ug-section">
        <div className="ug-admissions-banner">
          <div>
            <span className="ug-sec-tag">Admissions Office</span>
            <h3 style={{ fontSize: '30px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
              Secure Your Child's Place for 2026 Academic Year
            </h3>
            <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '680px', lineHeight: 1.6 }}>
              Interviews for S1, S2, S3, and S5 are conducted every Tuesday and Thursday at the main campus. 
              Review the detailed fee structure and submit an application.
            </p>
          </div>
          <button onClick={() => navigate('/admissions')} className="btn-hero-ug-gold">
            <span>View Fee Structure &amp; Apply</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ── 7. COMPREHENSIVE FOOTER WITH PORTAL LOGINS ───── */}
      <SchoolFooter isAuthenticated={isAuthenticated} onOpenInquiry={() => setShowInquiryModal(true)} />

      {/* ── 8. INTERACTIVE ADMISSIONS INQUIRY MODAL ───────── */}
      <InquiryModal isOpen={showInquiryModal} onClose={() => setShowInquiryModal(false)} />
    </div>
  );
}
