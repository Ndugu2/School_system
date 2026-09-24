import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, FileText, Sparkles, Send, Phone, Mail, 
  MapPin, HelpCircle, ArrowRight, ShieldCheck, Download,
  Clock, AlertCircle, X, Search, School, UserCheck, HeartHandshake,
  BookOpen, Award, Printer
} from 'lucide-react';
import SchoolHeader from '../../components/SchoolNav/SchoolHeader';
import SchoolFooter from '../../components/SchoolNav/SchoolFooter';
import '../LandingPage/LandingPage.css';

export default function AdmissionsPage({ isAuthenticated }) {
  const navigate = useNavigate();

  // Active view: 'apply' | 'track' | 'fees'
  const [activeSection, setActiveSection] = useState('apply');

  // Form State matching User's Django Model Specification
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'M',
    level: 'O',
    class_applying: 'S1',
    former_school: '',
    place_of_residence: '',
    place_of_origin: '',
    district: '',
    county: '',
    sub_county: '',
    village: '',
    chronic_disease: '',
    // Parent Details (ParentDetail model)
    parent_first_name: '',
    parent_last_name: '',
    relation: 'Father',
    contact_number: '',
    occupation: '',
    email: '',
    // Optional Second Parent
    has_second_parent: false,
    second_parent_first_name: '',
    second_parent_last_name: '',
    second_relation: 'Mother',
    second_contact_number: '',
    second_occupation: '',
    second_email: '',
    // Academic Selection
    combination_name: 'PCM / ICT',
    selected_subjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History & Political Education']
  });

  // Dynamic Options from Backend
  const [combinationsList, setCombinationsList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Status Tracker State
  const [trackingQuery, setTrackingQuery] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingError, setTrackingError] = useState(null);
  const [showLetterModal, setShowLetterModal] = useState(false);

  // Fetch combinations and subjects on mount
  useEffect(() => {
    fetch('/api/student-applications/meta/options')
      .then(res => res.json())
      .then(data => {
        if (data.combinations) setCombinationsList(data.combinations);
        if (data.subjects) setSubjectsList(data.subjects);
      })
      .catch(err => console.log('Meta options fetch fallback:', err));
  }, []);

  // Sync level with class_applying
  const handleLevelChange = (newLevel) => {
    const defaultClass = newLevel === 'O' ? 'S1' : 'S5';
    setFormData(prev => ({
      ...prev,
      level: newLevel,
      class_applying: defaultClass
    }));
  };

  const handleClassChange = (newClass) => {
    const derivedLevel = ['S1', 'S2', 'S3', 'S4'].includes(newClass) ? 'O' : 'A';
    setFormData(prev => ({
      ...prev,
      class_applying: newClass,
      level: derivedLevel
    }));
  };

  const toggleSubject = (subjectName) => {
    setFormData(prev => {
      const exists = prev.selected_subjects.includes(subjectName);
      if (exists) {
        return { ...prev, selected_subjects: prev.selected_subjects.filter(s => s !== subjectName) };
      } else {
        return { ...prev, selected_subjects: [...prev.selected_subjects, subjectName] };
      }
    });
  };

  // Submit Application
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    // Build parent_details array
    const parent_details = [
      {
        parent_first_name: formData.parent_first_name.trim(),
        parent_last_name: formData.parent_last_name.trim(),
        relation: formData.relation,
        contact_number: formData.contact_number.trim(),
        occupation: formData.occupation.trim(),
        email: formData.email.trim()
      }
    ];

    if (formData.has_second_parent && formData.second_parent_first_name.trim()) {
      parent_details.push({
        parent_first_name: formData.second_parent_first_name.trim(),
        parent_last_name: formData.second_parent_last_name.trim(),
        relation: formData.second_relation,
        contact_number: formData.second_contact_number.trim(),
        occupation: formData.second_occupation.trim(),
        email: formData.second_email.trim()
      });
    }

    const payload = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      date_of_birth: formData.date_of_birth,
      gender: formData.gender,
      level: formData.level,
      class_applying: formData.class_applying,
      former_school: formData.former_school,
      place_of_residence: formData.place_of_residence,
      place_of_origin: formData.place_of_origin,
      district: formData.district,
      county: formData.county,
      sub_county: formData.sub_county,
      village: formData.village,
      chronic_disease: formData.chronic_disease || 'None',
      parent_details,
      combination_name: formData.level === 'A' ? formData.combination_name : '',
      selected_subjects: formData.level === 'O' ? formData.selected_subjects : []
    };

    try {
      const res = await fetch('/api/student-applications/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to submit application');
      }

      setSubmitSuccess(data);
      // Pre-fill tracking query with the newly generated reference
      setTrackingQuery(data.reference_number);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Track Application Status
  const handleTrackStatus = async (e) => {
    if (e) e.preventDefault();
    if (!trackingQuery.trim()) return;

    setTrackingLoading(true);
    setTrackingError(null);
    setTrackingResult(null);

    try {
      const res = await fetch(`/api/student-applications/track/${encodeURIComponent(trackingQuery.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'No application found with that reference number or phone contact.');
      }

      setTrackingResult(data);
    } catch (err) {
      setTrackingError(err.message);
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="ug-school-root">
      <SchoolHeader isAuthenticated={isAuthenticated} onOpenInquiry={() => setActiveSection('apply')} />

      {/* Hero Banner */}
      <section className="ug-hero" style={{ padding: '70px 48px 60px' }}>
        <div className="ug-hero-inner" style={{ gridTemplateColumns: '1fr', maxWidth: '1100px' }}>
          <div>
            <div className="ug-hero-tag">
              <Sparkles size={14} color="#c59b27" />
              <span>Admissions Office &bull; 2026 Academic Year Intake &bull; S1 to S6</span>
            </div>
            <h1 className="ug-hero-title" style={{ fontSize: '48px', marginBottom: '18px' }}>
              Student Admissions &amp; <span>Application Portal</span>
            </h1>
            <p className="ug-hero-desc" style={{ fontSize: '19px', maxWidth: '850px' }}>
              Welcome to the official Ndugu Academy admissions portal. Complete the verified application 
              form below. Applications are reviewed and approved directly by the Headteacher and Director of Studies (DOS).
            </p>

            {/* Quick Navigation Tabs */}
            <div style={{ display: 'flex', gap: '14px', marginTop: '24px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setActiveSection('apply')}
                style={{ 
                  backgroundColor: activeSection === 'apply' ? '#c59b27' : '#0d1527', 
                  color: activeSection === 'apply' ? '#080e1a' : '#fff',
                  border: 'none', padding: '12px 26px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '15px' 
                }}
              >
                1. Fill Admission Form
              </button>
              <button 
                onClick={() => setActiveSection('track')}
                style={{ 
                  backgroundColor: activeSection === 'track' ? '#c59b27' : '#0d1527', 
                  color: activeSection === 'track' ? '#080e1a' : '#fff',
                  border: 'none', padding: '12px 26px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '15px',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <Search size={16} />
                <span>2. Track Application Status</span>
              </button>
              <button 
                onClick={() => setActiveSection('fees')}
                style={{ 
                  backgroundColor: activeSection === 'fees' ? '#c59b27' : '#0d1527', 
                  color: activeSection === 'fees' ? '#080e1a' : '#fff',
                  border: 'none', padding: '12px 26px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '15px' 
                }}
              >
                3. Fees Structure &amp; Criteria
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 32px' }}>

        {/* ── SECTION 1: FILL ADMISSION FORM ──────────────────────────────── */}
        {activeSection === 'apply' && (
          <div>
            {submitSuccess ? (
              <div style={{ backgroundColor: '#0d1527', padding: '50px 36px', borderRadius: '20px', textAlign: 'center', maxWidth: '780px', margin: '0 auto' }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#131f37', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle size={40} color="#c59b27" />
                </div>
                <h2 style={{ fontSize: '30px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>
                  Admission Application Received!
                </h2>
                <div style={{ backgroundColor: '#131f37', padding: '20px', borderRadius: '12px', display: 'inline-block', marginBottom: '24px' }}>
                  <div style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Official Tracking Reference Number</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#d8b257', fontFamily: 'monospace', marginTop: '6px' }}>
                    {submitSuccess.reference_number}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', backgroundColor: '#182747', padding: '14px 20px', borderRadius: '10px', maxWidth: '580px', margin: '0 auto 24px' }}>
                  <Clock size={20} color="#f59e0b" />
                  <span style={{ fontSize: '15px', color: '#f1f5f9' }}>
                    Current Status: <strong style={{ color: '#f59e0b' }}>Pending Headteacher / DOS Approval</strong>
                  </span>
                </div>

                <p style={{ color: '#cbd5e1', fontSize: '15.5px', lineHeight: 1.7, maxWidth: '620px', margin: '0 auto 30px' }}>
                  Thank you for applying to Ndugu Academy. Your application has been logged into our admissions database. 
                  Once approved by the Headteacher or Director of Studies (DOS), your official 
                  Admission Number (e.g. <strong>LCK-00001</strong>) will be issued.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => {
                      setActiveSection('track');
                      handleTrackStatus();
                    }} 
                    className="btn-hero-ug-gold"
                  >
                    <Search size={16} />
                    <span>Track Approval Status</span>
                  </button>
                  <button 
                    onClick={() => {
                      setSubmitSuccess(null);
                      setFormData({
                        first_name: '', last_name: '', date_of_birth: '', gender: 'M',
                        level: 'O', class_applying: 'S1', former_school: '', place_of_residence: '',
                        place_of_origin: '', district: '', county: '', sub_county: '', village: '',
                        chronic_disease: '', parent_first_name: '', parent_last_name: '',
                        relation: 'Father', contact_number: '', occupation: '', email: '',
                        has_second_parent: false, second_parent_first_name: '', second_parent_last_name: '',
                        second_relation: 'Mother', second_contact_number: '', second_occupation: '', second_email: '',
                        combination_name: 'PCM / ICT',
                        selected_subjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History & Political Education']
                      });
                    }} 
                    className="btn-hero-ug-outline"
                  >
                    <span>Submit Another Application</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ backgroundColor: '#0d1527', padding: '44px 36px', borderRadius: '20px' }}>
                <div className="ug-section-head" style={{ textAlign: 'left', marginBottom: '32px' }}>
                  <span className="ug-sec-tag">Official Student Application Form</span>
                  <h2 className="ug-sec-title">Personal, Academic &amp; Parental Registration</h2>
                  <p className="ug-sec-sub" style={{ margin: '8px 0 0' }}>
                    Please fill out all fields accurately. Applications require verification and formal approval by the Headteacher / DOS before admission is completed.
                  </p>
                </div>

                {submitError && (
                  <div style={{ backgroundColor: '#451a1a', borderLeft: '4px solid #ef4444', padding: '16px 20px', borderRadius: '10px', color: '#fca5a5', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <AlertCircle size={20} color="#ef4444" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* 1. STUDENT BIODATA */}
                <div style={{ marginBottom: '36px' }}>
                  <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#d8b257', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <UserCheck size={18} />
                    <span>1. Applicant Student Biodata</span>
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>First Name *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Samuel" 
                        value={formData.first_name}
                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Last Name / Surname *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Okello" 
                        value={formData.last_name}
                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Date of Birth *</label>
                      <input 
                        type="date" 
                        required 
                        value={formData.date_of_birth}
                        onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Gender *</label>
                      <select 
                        value={formData.gender}
                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      >
                        <option value="M">Male (M)</option>
                        <option value="F">Female (F)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Former School Attended *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Kampala Parents Primary / Jinja College" 
                        value={formData.former_school}
                        onChange={e => setFormData({ ...formData, former_school: e.target.value })}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. ACADEMIC LEVEL & COMBINATION / SUBJECTS */}
                <div style={{ marginBottom: '36px' }}>
                  <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#d8b257', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BookOpen size={18} />
                    <span>2. Academic Placement &amp; Subject Selection</span>
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Curriculum Level *</label>
                      <select 
                        value={formData.level}
                        onChange={e => handleLevelChange(e.target.value)}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      >
                        <option value="O">O-Level (Lower Secondary CBC: S1 - S4)</option>
                        <option value="A">A-Level (Upper Secondary UACE: S5 - S6)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Class Applying For *</label>
                      <select 
                        value={formData.class_applying}
                        onChange={e => handleClassChange(e.target.value)}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      >
                        {formData.level === 'O' ? (
                          <>
                            <option value="S1">Senior 1 (S.1)</option>
                            <option value="S2">Senior 2 (S.2)</option>
                            <option value="S3">Senior 3 (S.3)</option>
                            <option value="S4">Senior 4 (S.4)</option>
                          </>
                        ) : (
                          <>
                            <option value="S5">Senior 5 (S.5)</option>
                            <option value="S6">Senior 6 (S.6)</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* A-Level Combination Picker */}
                  {formData.level === 'A' ? (
                    <div style={{ backgroundColor: '#080e1a', padding: '22px', borderRadius: '12px' }}>
                      <label style={{ fontSize: '14.5px', fontWeight: 700, color: '#d8b257', display: 'block', marginBottom: '8px' }}>
                        Selected A-Level Combination *
                      </label>
                      <select 
                        value={formData.combination_name}
                        onChange={e => setFormData({ ...formData, combination_name: e.target.value })}
                        style={{ width: '100%', backgroundColor: '#131f37', border: 'none', borderRadius: '10px', padding: '14px 16px', color: '#fff', fontSize: '15px', marginBottom: '10px' }}
                      >
                        <option value="PCM / ICT">PCM / ICT — Physics, Chemistry, Mathematics + ICT + General Paper</option>
                        <option value="BCM / Sub-Math">BCM / Sub-Math — Biology, Chemistry, Mathematics + Sub-Math + General Paper</option>
                        <option value="PCB / Sub-Math">PCB / Sub-Math — Physics, Chemistry, Biology + Sub-Math + General Paper</option>
                        <option value="HEL / Divinity">HEL / Divinity — History, Economics, Literature in English + Divinity + General Paper</option>
                        <option value="MEG / Sub-Math">MEG / Sub-Math — Mathematics, Economics, Geography + Sub-Math + General Paper</option>
                        <option value="HEG / Sub-Math">HEG / Sub-Math — History, Economics, Geography + Sub-Math + General Paper</option>
                        <option value="DEG / Sub-Math">DEG / Sub-Math — Divinity, Economics, Geography + Sub-Math + General Paper</option>
                        <option value="PEM / ICT">PEM / ICT — Physics, Economics, Mathematics + ICT + General Paper</option>
                      </select>
                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                        Requires credit passes in respective O-Level subject prerequisites for UNEB registration.
                      </div>
                    </div>
                  ) : (
                    /* O-Level Subject Checkboxes */
                    <div style={{ backgroundColor: '#080e1a', padding: '22px', borderRadius: '12px' }}>
                      <label style={{ fontSize: '14.5px', fontWeight: 700, color: '#d8b257', display: 'block', marginBottom: '12px' }}>
                        O-Level Curriculum Subjects (CBC Competency Learning)
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                        {[
                          'English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
                          'Geography', 'History & Political Education', 'Christian Religious Education',
                          'Islamic Religious Education', 'Information & Comm. Technology', 'Agriculture',
                          'Entrepreneurship', 'Literature in English', 'Kiswahili', 'Fine Art'
                        ].map(sub => {
                          const isChecked = formData.selected_subjects.includes(sub);
                          return (
                            <label key={sub} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#cbd5e1', cursor: 'pointer', padding: '8px 12px', backgroundColor: isChecked ? '#131f37' : 'transparent', borderRadius: '8px' }}>
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={() => toggleSubject(sub)}
                                style={{ accentColor: '#c59b27' }}
                              />
                              <span>{sub}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. RESIDENCE, ORIGIN & GEOGRAPHY */}
                <div style={{ marginBottom: '36px' }}>
                  <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#d8b257', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MapPin size={18} />
                    <span>3. Origin &amp; Residence Details (Uganda Administrative Units)</span>
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Place of Residence (Current Home) *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Kira Municipality, Wakiso" 
                        value={formData.place_of_residence}
                        onChange={e => setFormData({ ...formData, place_of_residence: e.target.value })}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Place of Origin (Ancestral Home) *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Bushenyi / Mukono" 
                        value={formData.place_of_origin}
                        onChange={e => setFormData({ ...formData, place_of_origin: e.target.value })}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>District *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Wakiso / Kampala / Mukono" 
                        value={formData.district}
                        onChange={e => setFormData({ ...formData, district: e.target.value })}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>County *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Kyadondo" 
                        value={formData.county}
                        onChange={e => setFormData({ ...formData, county: e.target.value })}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Sub-County *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Kira Division / Nangabo" 
                        value={formData.sub_county}
                        onChange={e => setFormData({ ...formData, sub_county: e.target.value })}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Village / LC1 Cell *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Kyanja LC1 / Najjera Zone 2" 
                        value={formData.village}
                        onChange={e => setFormData({ ...formData, village: e.target.value })}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. HEALTH & CHRONIC DISEASE */}
                <div style={{ marginBottom: '36px' }}>
                  <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#d8b257', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck size={18} />
                    <span>4. Health Information &amp; Special Needs</span>
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Chronic Disease / Medical Condition / Allergies (leave blank if None)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Asthma, Peanuts allergy, Sickle cell trait (or leave empty if None)" 
                      value={formData.chronic_disease}
                      onChange={e => setFormData({ ...formData, chronic_disease: e.target.value })}
                      style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                    />
                  </div>
                </div>

                {/* 5. PARENT / GUARDIAN DETAILS */}
                <div style={{ marginBottom: '36px' }}>
                  <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#d8b257', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <HeartHandshake size={18} />
                    <span>5. Parent / Guardian Details (Primary Contact)</span>
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Parent First Name *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Arthur" 
                        value={formData.parent_first_name}
                        onChange={e => setFormData({ ...formData, parent_first_name: e.target.value })}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Parent Last Name *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Mwesigwa" 
                        value={formData.parent_last_name}
                        onChange={e => setFormData({ ...formData, parent_last_name: e.target.value })}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Relationship *</label>
                      <select 
                        value={formData.relation}
                        onChange={e => setFormData({ ...formData, relation: e.target.value })}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      >
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Guardian">Guardian</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Contact Number (Uganda +256) *</label>
                      <input 
                        type="tel" 
                        required 
                        placeholder="+256 700 123456" 
                        value={formData.contact_number}
                        onChange={e => setFormData({ ...formData, contact_number: e.target.value })}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Occupation</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Civil Engineer / Accountant" 
                        value={formData.occupation}
                        onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Email Address</label>
                      <input 
                        type="email" 
                        placeholder="parent@example.com" 
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '15px' }}
                      />
                    </div>
                  </div>

                  {/* Add Optional Second Parent Toggle */}
                  {!formData.has_second_parent ? (
                    <button 
                      type="button" 
                      onClick={() => setFormData({ ...formData, has_second_parent: true })}
                      style={{ backgroundColor: 'transparent', border: '1px dashed rgba(255, 255, 255, 0.2)', color: '#d8b257', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 700 }}
                    >
                      + Add Secondary Parent / Guardian Details (Optional)
                    </button>
                  ) : (
                    <div style={{ backgroundColor: '#080e1a', padding: '22px', borderRadius: '12px', marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <strong style={{ color: '#d8b257', fontSize: '15px' }}>Secondary Parent / Guardian</strong>
                        <button 
                          type="button" 
                          onClick={() => setFormData({ ...formData, has_second_parent: false })}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
                        >
                          Remove
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        <input 
                          type="text" 
                          placeholder="First Name" 
                          value={formData.second_parent_first_name}
                          onChange={e => setFormData({ ...formData, second_parent_first_name: e.target.value })}
                          style={{ backgroundColor: '#131f37', border: 'none', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '14px' }}
                        />
                        <input 
                          type="text" 
                          placeholder="Last Name" 
                          value={formData.second_parent_last_name}
                          onChange={e => setFormData({ ...formData, second_parent_last_name: e.target.value })}
                          style={{ backgroundColor: '#131f37', border: 'none', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '14px' }}
                        />
                        <select 
                          value={formData.second_relation}
                          onChange={e => setFormData({ ...formData, second_relation: e.target.value })}
                          style={{ backgroundColor: '#131f37', border: 'none', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '14px' }}
                        >
                          <option value="Mother">Mother</option>
                          <option value="Father">Father</option>
                          <option value="Guardian">Guardian</option>
                        </select>
                        <input 
                          type="tel" 
                          placeholder="Contact Number (+256...)" 
                          value={formData.second_contact_number}
                          onChange={e => setFormData({ ...formData, second_contact_number: e.target.value })}
                          style={{ backgroundColor: '#131f37', border: 'none', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '14px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* SUBMIT BUTTON */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ fontSize: '13.5px', color: '#94a3b8' }}>
                    * By submitting, you confirm that the above details are authentic and subject to school verification.
                  </div>
                  <button 
                    type="submit" 
                    disabled={submitting} 
                    className="btn-hero-ug-gold" 
                    style={{ padding: '16px 36px', fontSize: '16px' }}
                  >
                    <Send size={18} />
                    <span>{submitting ? 'Submitting Application...' : 'Submit Application for Approval'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── SECTION 2: TRACK APPLICATION STATUS ─────────────────────────── */}
        {activeSection === 'track' && (
          <div style={{ maxWidth: '820px', margin: '0 auto' }}>
            <div style={{ backgroundColor: '#0d1527', padding: '40px 36px', borderRadius: '20px', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
                Track Admission Application Status
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '24px' }}>
                Enter your Application Reference Number (e.g. <strong>NDA-2026-0001</strong>), 
                issued Admission Number (e.g. <strong>LCK-00001</strong>), or primary parent phone number.
              </p>

              <form onSubmit={handleTrackStatus} style={{ display: 'flex', gap: '12px' }}>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. NDA-2026-0001 or +256 700 123456" 
                  value={trackingQuery}
                  onChange={e => setTrackingQuery(e.target.value)}
                  style={{ flex: 1, backgroundColor: '#080e1a', border: 'none', borderRadius: '12px', padding: '14px 18px', color: '#fff', fontSize: '16px' }}
                />
                <button 
                  type="submit" 
                  disabled={trackingLoading}
                  className="btn-hero-ug-gold" 
                  style={{ padding: '14px 28px', whiteSpace: 'nowrap' }}
                >
                  <Search size={18} />
                  <span>{trackingLoading ? 'Checking...' : 'Check Status'}</span>
                </button>
              </form>

              {trackingError && (
                <div style={{ backgroundColor: '#451a1a', borderLeft: '4px solid #ef4444', padding: '14px 18px', borderRadius: '10px', color: '#fca5a5', marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertCircle size={18} color="#ef4444" />
                  <span>{trackingError}</span>
                </div>
              )}
            </div>

            {/* Tracking Result Card */}
            {trackingResult && (
              <div style={{ backgroundColor: '#0d1527', padding: '36px', borderRadius: '20px', borderLeft: `6px solid ${trackingResult.status === 'approved' ? '#10b981' : trackingResult.status === 'rejected' ? '#ef4444' : '#f59e0b'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '24px' }}>
                  <div>
                    <span style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Applicant Full Name</span>
                    <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: '4px 0 0 0' }}>{trackingResult.applicant_name}</h3>
                  </div>

                  <span style={{
                    padding: '8px 18px',
                    borderRadius: '9999px',
                    fontSize: '14px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    backgroundColor: trackingResult.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : trackingResult.status === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: trackingResult.status === 'approved' ? '#34d399' : trackingResult.status === 'rejected' ? '#f87171' : '#fbbf24',
                    border: 'none'
                  }}>
                    {trackingResult.status === 'approved' ? '✓ Admission Approved' : trackingResult.status === 'rejected' ? '✗ Application Not Accepted' : '⏳ Pending Headteacher / DOS Approval'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px', backgroundColor: '#080e1a', padding: '22px', borderRadius: '14px', marginBottom: '24px' }}>
                  <div>
                    <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>Tracking Reference</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>{trackingResult.reference_number}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>Class &amp; Level</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>{trackingResult.class_applying} ({trackingResult.level}-Level)</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>Official Admission Number</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: trackingResult.admission_number ? '#d8b257' : '#94a3b8', marginTop: '4px' }}>
                      {trackingResult.admission_number || 'Awaiting Approval'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>Submission Date</div>
                    <div style={{ fontSize: '15px', color: '#cbd5e1', marginTop: '4px' }}>
                      {new Date(trackingResult.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {trackingResult.status === 'approved' && (
                  <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '24px', borderRadius: '14px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <CheckCircle size={22} color="#10b981" />
                      <strong style={{ fontSize: '17px', color: '#34d399' }}>Official Admission Granted!</strong>
                    </div>
                    <p style={{ color: '#cbd5e1', fontSize: '14.5px', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                      Approved by: <strong>{trackingResult.approved_by_name || 'Headteacher / DOS Office'}</strong>. 
                      Your official student record is active with admission number <strong>{trackingResult.admission_number}</strong>. 
                      Please review and download your official Ndugu Academy Admission Letter below.
                    </p>
                    <button 
                      onClick={() => setShowLetterModal(true)} 
                      className="btn-hero-ug-gold"
                      style={{ padding: '12px 24px', fontSize: '14.5px' }}
                    >
                      <Award size={16} />
                      <span>View &amp; Print Admission Letter</span>
                    </button>
                  </div>
                )}

                {trackingResult.status === 'pending' && (
                  <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <Clock size={20} color="#f59e0b" />
                      <strong style={{ fontSize: '16px', color: '#fbbf24' }}>Under Verification</strong>
                    </div>
                    <p style={{ color: '#cbd5e1', fontSize: '14.5px', margin: 0, lineHeight: 1.6 }}>
                      Your application is queued for the admissions board. Headteacher / Director of Studies approvals take place on Tuesdays and Thursdays. Check back or wait for an SMS confirmation.
                    </p>
                  </div>
                )}

                {trackingResult.status === 'rejected' && (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '20px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <AlertCircle size={20} color="#ef4444" />
                      <strong style={{ fontSize: '16px', color: '#f87171' }}>Application Not Accepted</strong>
                    </div>
                    <p style={{ color: '#cbd5e1', fontSize: '14.5px', margin: 0, lineHeight: 1.6 }}>
                      Reason: {trackingResult.rejection_reason || 'Class capacity reached or academic prerequisite criteria not satisfied'}. 
                      For inquiries, contact the Admissions Registrar at <strong>+256 414 789 000</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 3: FEES STRUCTURE & CRITERIA ────────────────────────── */}
        {activeSection === 'fees' && (
          <div>
            <div className="ug-section-head" style={{ textAlign: 'left', marginBottom: '32px' }}>
              <span className="ug-sec-tag">Financial Information</span>
              <h2 className="ug-sec-title">School Fees Structure (2026 Academic Year)</h2>
              <p className="ug-sec-sub" style={{ margin: '8px 0 0' }}>
                All fees are in Uganda Shillings (UGX) per term. Payable via SchoolPay, Bank Draft, or direct bank transfer to our official Stanbic Bank and Centenary Bank accounts.
              </p>
            </div>

            <div style={{ backgroundColor: '#0d1527', borderRadius: '16px', overflow: 'hidden', padding: '10px', marginBottom: '50px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#131f37', color: '#d8b257', fontSize: '14.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '16px 20px' }}>Class / Level</th>
                    <th style={{ padding: '16px 20px' }}>Boarding Section</th>
                    <th style={{ padding: '16px 20px' }}>Day Scholar</th>
                    <th style={{ padding: '16px 20px' }}>What It Covers</th>
                  </tr>
                </thead>
                <tbody style={{ color: '#cbd5e1', fontSize: '15px' }}>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '18px 20px', fontWeight: 700, color: '#fff' }}>Senior 1 &amp; Senior 2 (CBC)</td>
                    <td style={{ padding: '18px 20px', color: '#c59b27', fontWeight: 700 }}>UGX 1,450,000</td>
                    <td style={{ padding: '18px 20px' }}>UGX 780,000</td>
                    <td style={{ padding: '18px 20px', fontSize: '13.5px', color: '#94a3b8' }}>Tuition, Boarding, 3 meals daily, Medical dispensary, Science practical consumables, ICT access</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '18px 20px', fontWeight: 700, color: '#fff' }}>Senior 3 &amp; Senior 4 (Candidate)</td>
                    <td style={{ padding: '18px 20px', color: '#c59b27', fontWeight: 700 }}>UGX 1,550,000</td>
                    <td style={{ padding: '18px 20px' }}>UGX 840,000</td>
                    <td style={{ padding: '18px 20px', fontSize: '13.5px', color: '#94a3b8' }}>Tuition, Boarding, Mock UNEB examinations, Weekend prep tuition, Candidate seminar materials</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '18px 20px', fontWeight: 700, color: '#fff' }}>Senior 5 (A-Level Entry)</td>
                    <td style={{ padding: '18px 20px', color: '#c59b27', fontWeight: 700 }}>UGX 1,650,000</td>
                    <td style={{ padding: '18px 20px' }}>UGX 920,000</td>
                    <td style={{ padding: '18px 20px', fontSize: '13.5px', color: '#94a3b8' }}>Tuition, Boarding, Advanced science laboratories, ICT coding lab, General Paper reference books</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '18px 20px', fontWeight: 700, color: '#fff' }}>Senior 6 (UACE Candidate)</td>
                    <td style={{ padding: '18px 20px', color: '#c59b27', fontWeight: 700 }}>UGX 1,720,000</td>
                    <td style={{ padding: '18px 20px' }}>UGX 960,000</td>
                    <td style={{ padding: '18px 20px', fontSize: '13.5px', color: '#94a3b8' }}>Tuition, Boarding, Intensive UACE revision seminars, Joint mock papers, Career guidance counseling</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setActiveSection('apply')} className="btn-hero-ug-gold">
                <span>Start Online Admission Application Now</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── OFFICIAL ADMISSION LETTER MODAL (Printable) ─────────────── */}
      {showLetterModal && trackingResult && (
        <div className="ug-modal-overlay" onClick={() => setShowLetterModal(false)}>
          <div className="ug-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px', backgroundColor: '#ffffff', color: '#0f172a', padding: '40px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: '#080e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c59b27' }}>
                  <School size={30} />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'Cinzel', fontSize: '22px', fontWeight: 900, margin: 0, color: '#080e1a' }}>NDUGU ACADEMY SECONDARY SCHOOL</h2>
                  <div style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>Diligence &bull; Character &bull; Excellence</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Plot 14-18, Ndugu Hill Road, Wakiso District &bull; UNEB Centre: U3824</div>
                </div>
              </div>
              <button 
                onClick={() => setShowLetterModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', height: 'fit-content' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ backgroundColor: '#f1f5f9', padding: '6px 16px', borderRadius: '9999px', fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em', color: '#0f172a', textTransform: 'uppercase' }}>
                Official Letter of Admission
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f8fafc', padding: '16px 20px', borderRadius: '10px', marginBottom: '24px', fontSize: '14px' }}>
              <div><strong>Student Name:</strong> {trackingResult.applicant_name}</div>
              <div><strong>Admission No:</strong> <span style={{ color: '#b45309', fontWeight: 800 }}>{trackingResult.admission_number}</span></div>
              <div><strong>Class Admitted:</strong> {trackingResult.class_applying} ({trackingResult.level}-Level)</div>
              <div><strong>Academic Year:</strong> 2026 Intake</div>
            </div>

            <div style={{ fontSize: '14.5px', lineHeight: 1.8, color: '#334155', marginBottom: '30px' }}>
              <p>Dear Parent / Guardian,</p>
              <p>
                Following the review of the applicant's credentials and interview records, the Admissions Board of 
                Ndugu Academy is pleased to offer <strong>{trackingResult.applicant_name}</strong> a place in 
                <strong> {trackingResult.class_applying}</strong> for the 2026 Academic Year.
              </p>
              <p>
                This admission is subject to adherence to the school rules, completion of term clearance, 
                and presentation of the original PLE / UCE result slip upon reporting day on <strong>24th May, 2026</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <div>
                <div style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '18px', color: '#1e293b' }}>Emmanuel Ssebaggala</div>
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>Mr. Emmanuel Ssebaggala, M.Ed</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Headteacher &bull; Ndugu Academy</div>
              </div>

              <button 
                onClick={() => window.print()}
                style={{ backgroundColor: '#080e1a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
              >
                <Printer size={16} />
                <span>Print Admission Letter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <SchoolFooter isAuthenticated={isAuthenticated} onOpenInquiry={() => setActiveSection('apply')} />
    </div>
  );
}
