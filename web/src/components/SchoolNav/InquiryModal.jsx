import React, { useState } from 'react';
import { School, X, CheckCircle, Send } from 'lucide-react';

export default function InquiryModal({ isOpen, onClose }) {
  const [inquiryForm, setInquiryForm] = useState({
    parentName: '',
    phone: '',
    studentName: '',
    classLevel: 'S1',
    streamPreference: 'Boarding'
  });
  const [inquirySubmitted, setInquirySubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setInquirySubmitted(true);
    setTimeout(() => {
      setInquirySubmitted(false);
      onClose();
    }, 3500);
  };

  return (
    <div className="ug-modal-overlay" onClick={onClose}>
      <div className="ug-modal" onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <School size={22} color="#c59b27" />
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0 }}>Admissions Desk &bull; 2026 Intake</h3>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {inquirySubmitted ? (
          <div style={{ padding: '48px 28px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <CheckCircle size={52} color="#c59b27" />
            <h4 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>Application Received!</h4>
            <p style={{ fontSize: '15px', color: '#94a3b8', maxWidth: '420px', margin: 0, lineHeight: 1.6 }}>
              Thank you for applying to Ndugu Academy. Our admissions registrar will contact you via phone within 24 hours with interview details.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <label style={{ fontSize: '13.5px', fontWeight: 600, color: '#cbd5e1' }}>Parent / Guardian Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Arthur Mwesigwa"
                  value={inquiryForm.parentName}
                  onChange={e => setInquiryForm({ ...inquiryForm, parentName: e.target.value })}
                  style={{ backgroundColor: '#0b1222', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '14.5px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <label style={{ fontSize: '13.5px', fontWeight: 600, color: '#cbd5e1' }}>Phone Contact (Uganda +256)</label>
                <input
                  type="tel"
                  required
                  placeholder="+256 700 123456"
                  value={inquiryForm.phone}
                  onChange={e => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                  style={{ backgroundColor: '#0b1222', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '14.5px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <label style={{ fontSize: '13.5px', fontWeight: 600, color: '#cbd5e1' }}>Student Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Derrick Mwesigwa"
                  value={inquiryForm.studentName}
                  onChange={e => setInquiryForm({ ...inquiryForm, studentName: e.target.value })}
                  style={{ backgroundColor: '#0b1222', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '14.5px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label style={{ fontSize: '13.5px', fontWeight: 600, color: '#cbd5e1' }}>Class Seeking</label>
                  <select
                    value={inquiryForm.classLevel}
                    onChange={e => setInquiryForm({ ...inquiryForm, classLevel: e.target.value })}
                    style={{ backgroundColor: '#0b1222', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '14.5px' }}
                  >
                    <option value="S1">Senior 1 (S1)</option>
                    <option value="S2">Senior 2 (S2)</option>
                    <option value="S3">Senior 3 (S3)</option>
                    <option value="S4">Senior 4 (S4)</option>
                    <option value="S5">Senior 5 (S5)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label style={{ fontSize: '13.5px', fontWeight: 600, color: '#cbd5e1' }}>Boarding / Day</label>
                  <select
                    value={inquiryForm.streamPreference}
                    onChange={e => setInquiryForm({ ...inquiryForm, streamPreference: e.target.value })}
                    style={{ backgroundColor: '#0b1222', border: 'none', borderRadius: '10px', padding: '13px 16px', color: '#fff', fontSize: '14.5px' }}
                  >
                    <option value="Boarding">Boarding Section</option>
                    <option value="Day">Day Scholar</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ padding: '18px 28px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button" 
                onClick={onClose}
                style={{ backgroundColor: '#0b1222', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '14.5px' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-hero-ug-gold"
                style={{ padding: '12px 24px', fontSize: '14.5px' }}
              >
                <Send size={16} />
                <span>Submit Inquiry</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
