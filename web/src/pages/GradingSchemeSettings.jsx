import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const thisYear = new Date().getFullYear();

export default function GradingSchemeSettings() {
  const [classLevel, setClassLevel] = useState('S1');
  const [academicYear, setAcademicYear] = useState(thisYear);
  const [assessmentWeights, setAssessmentWeights] = useState({ BOT: 15, MOT: 15, EOT: 70 });
  const [gradeBands, setGradeBands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get(`/grading-schemes?classLevel=${classLevel}&academicYear=${academicYear}`)
      .then(scheme => {
        if (!active) return;
        setAssessmentWeights(scheme.assessmentWeights);
        setGradeBands(scheme.gradeBands);
      })
      .catch(err => { if (active) setError(err.message || 'Could not load grading scheme'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classLevel, academicYear]);

  const updateBand = (index, key, value) => {
    setGradeBands(current => current.map((band, bandIndex) =>
      bandIndex === index ? { ...band, [key]: key === 'grade' ? value : Number(value) } : band
    ));
  };

  const saveScheme = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.put('/grading-schemes', { classLevel, academicYear: Number(academicYear), assessmentWeights, gradeBands });
      setMessage(`Grading scheme saved for ${classLevel}, ${academicYear}.`);
    } catch (err) {
      setError(err.message || 'Could not save grading scheme');
    } finally {
      setSaving(false);
    }
  };

  const loadDefaults = async () => {
    setError('');
    try {
      const defaults = await api.get(`/grading-schemes/defaults?classLevel=${classLevel}`);
      setAssessmentWeights(defaults.assessmentWeights);
      setGradeBands(defaults.gradeBands);
      setMessage('Default scheme loaded. Save to apply it to this year and class.');
    } catch (err) {
      setError(err.message || 'Could not load default grading scheme');
    }
  };

  const weightTotal = Object.values(assessmentWeights).reduce((sum, value) => sum + Number(value || 0), 0);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <h2 style={{ margin: '0 0 8px' }}>Grading &amp; Assessment Rules</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Configure assessment weights and grade thresholds for each class and academic year.</p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <label style={fieldStyle}>Class level
          <select style={inputStyle} value={classLevel} onChange={event => setClassLevel(event.target.value)}>
            {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map(level => <option key={level}>{level}</option>)}
          </select>
        </label>
        <label style={fieldStyle}>Academic year
          <input style={inputStyle} type="number" min="2000" value={academicYear} onChange={event => setAcademicYear(event.target.value)} />
        </label>
      </div>
      {loading ? <p>Loading grading rules…</p> : (
        <>
          <section style={panelStyle}>
            <h3>Assessment weights (%)</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {['BOT', 'MOT', 'EOT'].map(key => (
                <label key={key} style={fieldStyle}>{key}
                  <input style={inputStyle} type="number" min="0" max="100" value={assessmentWeights[key] ?? 0}
                    onChange={event => setAssessmentWeights(current => ({ ...current, [key]: Number(event.target.value) }))} />
                </label>
              ))}
              <strong style={{ alignSelf: 'end', paddingBottom: 10 }}>Total: {weightTotal}%</strong>
            </div>
          </section>
          <section style={panelStyle}>
            <h3>Grade thresholds</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {gradeBands.map((band, index) => (
                <div key={`${index}-${band.grade}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8 }}>
                  <input aria-label={`Grade ${index + 1}`} style={inputStyle} value={band.grade} onChange={event => updateBand(index, 'grade', event.target.value)} />
                  <input aria-label={`Minimum percentage ${index + 1}`} style={inputStyle} type="number" min="0" max="100" value={band.minPercentage} onChange={event => updateBand(index, 'minPercentage', event.target.value)} />
                  <input aria-label={`Points ${index + 1}`} style={inputStyle} type="number" min="0" value={band.points} onChange={event => updateBand(index, 'points', event.target.value)} />
                  <button type="button" onClick={() => setGradeBands(current => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
                <span>Grade</span><span>Minimum (%)</span><span>Points</span><span />
              </div>
              <button type="button" onClick={() => setGradeBands(current => [...current, { grade: '', minPercentage: 0, points: 0 }])}>Add grade band</button>
            </div>
          </section>
        </>
      )}
      {error && <p role="alert" style={{ color: '#dc2626' }}>{error}</p>}
      {message && <p role="status" style={{ color: '#059669' }}>{message}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={loadDefaults} disabled={loading || saving}>Load level defaults</button>
        <button type="button" onClick={saveScheme} disabled={loading || saving || weightTotal !== 100 || gradeBands.length === 0}>
          {saving ? 'Saving…' : 'Save grading scheme'}
        </button>
      </div>
    </div>
  );
}

const fieldStyle = { display: 'grid', gap: 6, minWidth: 150, fontWeight: 600 };
const inputStyle = { padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)' };
const panelStyle = { padding: 20, border: '1px solid var(--border)', borderRadius: 12 };
