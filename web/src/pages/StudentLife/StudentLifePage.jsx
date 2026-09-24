import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Home, Users, Sparkles, Shield, HeartHandshake, 
  Calendar, Music, Activity, Clock, CheckCircle, ArrowRight 
} from 'lucide-react';
import SchoolHeader from '../../components/SchoolNav/SchoolHeader';
import SchoolFooter from '../../components/SchoolNav/SchoolFooter';
import InquiryModal from '../../components/SchoolNav/InquiryModal';
import '../LandingPage/LandingPage.css';

export default function StudentLifePage({ isAuthenticated }) {
  const navigate = useNavigate();
  const [showInquiry, setShowInquiry] = useState(false);

  const houses = [
    {
      name: 'Kabikere House',
      colorName: 'Royal Crimson (Red)',
      colorCode: '#ef4444',
      motto: '"Fortis et Fidelis" (Brave and Faithful)',
      master: 'Mr. Julius Mukasa (Physics)',
      prefect: 'Jonathan Okello (S.6 PCM)',
      points: '480 Pts',
      rank: '1st in Standings',
      strengths: 'Reigning Champions in Debate, Cross-Country Athletics, and Public Speaking.'
    },
    {
      name: 'Lumumba House',
      colorName: 'Emerald Green',
      colorCode: '#10b981',
      motto: '"Unity in Purpose and Action"',
      master: 'Mrs. Rebecca Nabatanzi (Biology)',
      prefect: 'Esther Nakato (S.6 BCM)',
      points: '465 Pts',
      rank: '2nd in Standings',
      strengths: 'Champions of the Annual Inter-House Football Cup and Environmental Tree Planting.'
    },
    {
      name: 'Victoria House',
      colorName: 'Sapphire Navy (Blue)',
      colorCode: '#3b82f6',
      motto: '"Truth Conquers All Obstacles"',
      master: 'Mr. Stephen Otim (Economics)',
      prefect: 'Samuel Mugume (S.6 HEL)',
      points: '440 Pts',
      rank: '3rd in Standings',
      strengths: 'Gold Medalists in Music, Dance & Drama (MDD) Festival and Basketball.'
    },
    {
      name: 'Speke House',
      colorName: 'Imperial Gold (Yellow)',
      colorCode: '#f59e0b',
      motto: '"Rise, Strive and Shine"',
      master: 'Mr. Patrick Balinda (Chemistry)',
      prefect: 'Patricia Namubiru (S.6 PCB)',
      points: '425 Pts',
      rank: '4th in Standings',
      strengths: 'Winners of the National Science Robotics Fair and Inter-House Rugby Sevens.'
    },
  ];

  return (
    <div className="ug-school-root">
      <SchoolHeader isAuthenticated={isAuthenticated} onOpenInquiry={() => setShowInquiry(true)} />

      {/* Hero Banner */}
      <section className="ug-hero" style={{ padding: '70px 48px 60px' }}>
        <div className="ug-hero-inner" style={{ gridTemplateColumns: '1fr', maxWidth: '1100px' }}>
          <div>
            <div className="ug-hero-tag">
              <Sparkles size={14} color="#c59b27" />
              <span>Tradition &bull; Brotherhood &bull; Character &bull; Healthy Competition</span>
            </div>
            <h1 className="ug-hero-title" style={{ fontSize: '48px', marginBottom: '18px' }}>
              Student Life &amp; <span>The Four School Houses</span>
            </h1>
            <p className="ug-hero-desc" style={{ fontSize: '19px', maxWidth: '850px' }}>
              Life at Ndugu Academy extends far beyond the chalkboard. Through our traditional four houses, 
              rich boarding community, and diverse sports and clubs, students forge lifelong friendships, 
              discipline, and leadership qualities.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 32px' }}>
        
        {/* The Four Houses Section */}
        <section style={{ marginBottom: '70px' }}>
          <div className="ug-section-head" style={{ textAlign: 'left', marginBottom: '32px' }}>
            <span className="ug-sec-tag">House System &bull; Inter-House Shield</span>
            <h2 className="ug-sec-title">The Four Houses of Ndugu Academy</h2>
            <p className="ug-sec-sub" style={{ margin: '8px 0 0' }}>
              Every scholar is assigned to a house upon entry. Houses compete annually for the coveted Headteacher's Academic and Sports Championship Shield.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '24px' }}>
            {houses.map(house => (
              <div key={house.name} style={{ backgroundColor: '#0d1527', padding: '32px 28px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: house.colorCode }} />
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0 }}>{house.name}</h3>
                  </div>
                  <span style={{ backgroundColor: '#131f37', color: '#c59b27', padding: '3px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700 }}>
                    {house.rank}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: '#d8b257', fontStyle: 'italic', marginBottom: '16px' }}>
                  {house.motto}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#cbd5e1', marginBottom: '18px' }}>
                  <div><strong style={{ color: '#fff' }}>House Master:</strong> {house.master}</div>
                  <div><strong style={{ color: '#fff' }}>House Captain:</strong> {house.prefect}</div>
                  <div><strong style={{ color: '#fff' }}>Current Term Points:</strong> <span style={{ color: '#d8b257', fontWeight: 700 }}>{house.points}</span></div>
                </div>

                <p style={{ fontSize: '13.5px', color: '#94a3b8', lineHeight: 1.6, margin: 0, borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '14px' }}>
                  {house.strengths}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Boarding Life & Facilities */}
        <section style={{ marginBottom: '70px' }}>
          <div className="ug-section-head" style={{ textAlign: 'left', marginBottom: '32px' }}>
            <span className="ug-sec-tag">Residential Community</span>
            <h2 className="ug-sec-title">Boarding Facilities &amp; Student Welfare</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            <div style={{ backgroundColor: '#0d1527', padding: '32px', borderRadius: '16px' }}>
              <Home size={30} color="#c59b27" style={{ marginBottom: '14px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>Secure Dormitories &amp; Hostels</h3>
              <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7 }}>
                Spacious, well-ventilated dormitories separated by gender, with 24/7 security patrols, resident house matrons, CCTV coverage in common corridors, and clean solar water heating.
              </p>
            </div>

            <div style={{ backgroundColor: '#0d1527', padding: '32px', borderRadius: '16px' }}>
              <HeartHandshake size={30} color="#c59b27" style={{ marginBottom: '14px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>Sanatorium &amp; Medical Care</h3>
              <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7 }}>
                A modern on-campus health dispensary staffed 24 hours a day by registered clinical nurses and a visiting school physician, ensuring prompt treatment and parental notifications.
              </p>
            </div>

            <div style={{ backgroundColor: '#0d1527', padding: '32px', borderRadius: '16px' }}>
              <Clock size={30} color="#c59b27" style={{ marginBottom: '14px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>Disciplined Daily Routine</h3>
              <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7 }}>
                Structured schedules balance intense academics, morning &amp; evening preps, sporting activities, dining nutrition (posho, beans, rice, beef, chicken, fruits), and restful sleep.
              </p>
            </div>
          </div>
        </section>

        {/* Sports, MDD & Co-curricular */}
        <section style={{ marginBottom: '70px' }}>
          <div className="ug-section-head" style={{ textAlign: 'left', marginBottom: '32px' }}>
            <span className="ug-sec-tag">Co-Curriculars</span>
            <h2 className="ug-sec-title">Sports, Music, Dance &amp; Drama (MDD)</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {[
              { icon: Activity, title: 'Football & Athletics', desc: 'Active participants in the Wakiso USSSA District Championship with standard football pitch and running tracks.' },
              { icon: Music, title: 'Music, Dance & Drama', desc: 'Annual MDD festival featuring traditional Kiganda, Acholi, and Runyege dances, choral singing, and plays.' },
              { icon: Users, title: 'Debate & Public Speaking', desc: 'Uganda National Debate Champions, mastering parliamentary style debating and youth governance.' },
              { icon: Trophy, title: 'Basketball & Netball', desc: 'Floodlit hard-courts hosting weekend league matches and friendly tournaments with neighboring academies.' }
            ].map(act => (
              <div key={act.title} style={{ backgroundColor: '#0d1527', padding: '26px', borderRadius: '14px' }}>
                <act.icon size={26} color="#c59b27" style={{ marginBottom: '12px' }} />
                <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>{act.title}</h4>
                <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{act.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Action Card */}
        <section style={{ backgroundColor: '#0d1527', padding: '44px 36px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '30px' }}>
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: '0 0 8px 0' }}>Join Our Vibrant Community</h3>
            <p style={{ color: '#94a3b8', fontSize: '15px', margin: 0 }}>
              Discover how your child can grow in intellect, character, and fellowship at Ndugu Academy.
            </p>
          </div>

          <button onClick={() => navigate('/admissions')} className="btn-hero-ug-gold">
            <span>Apply for Admission</span>
            <ArrowRight size={16} />
          </button>
        </section>
      </main>

      <SchoolFooter isAuthenticated={isAuthenticated} onOpenInquiry={() => setShowInquiry(true)} />
      <InquiryModal isOpen={showInquiry} onClose={() => setShowInquiry(false)} />
    </div>
  );
}
