import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  ShieldCheck, AlertCircle, CheckCircle, RefreshCw, Printer, 
  Utensils, Award, CreditCard, Search, Calendar, Check, X,
  Clock, Sparkles
} from 'lucide-react';

export default function LicokaGatekeeper({ readOnly }) {
  const [activeSubTab, setActiveSubTab] = useState('passes'); // 'passes' | 'meals'
  const [term, setTerm] = useState('Term 1');
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [passes, setPasses] = useState([]);
  const [mealCards, setMealCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  // Print Modals
  const [activePrintPass, setActivePrintPass] = useState(null);
  const [activePrintMealCard, setActivePrintMealCard] = useState(null);

  // Logging meal day state
  const [dayToLog, setDayToLog] = useState(new Date().getDate());
  const [loggingDayCardId, setLoggingDayCardId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [passesData, mealsData] = await Promise.all([
        api.get(`/fees/student-passes?term=${encodeURIComponent(term)}&academicYear=${academicYear}`),
        api.get(`/fees/meal-cards?term=${encodeURIComponent(term)}&academicYear=${academicYear}`)
      ]);
      setPasses(passesData || []);
      setMealCards(mealsData || []);
    } catch (err) {
      console.error('Error fetching Licoka gatekeeper data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [term, academicYear]);

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await api.post('/fees/passes/sync-all', { term, academicYear });
      setSyncMsg(res.message);
      await fetchData();
    } catch (err) {
      setSyncMsg('Sync error: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleLogMealDay = async (cardId) => {
    try {
      await api.post(`/fees/meal-cards/${cardId}/log-day`, { dayNumber: dayToLog });
      await fetchData();
      setLoggingDayCardId(null);
    } catch (err) {
      alert(err.message || 'Error logging meal day');
    }
  };

  // Filtered lists
  const filteredPasses = passes.filter(p => {
    const name = p.student?.user?.name || '';
    const sid = p.student?.studentId || '';
    const adm = p.student?.admissionNumber || '';
    const num = p.passNumber || '';
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || sid.toLowerCase().includes(q) || adm.toLowerCase().includes(q) || num.toLowerCase().includes(q);
  });

  const filteredMealCards = mealCards.filter(m => {
    const name = m.student?.user?.name || '';
    const sid = m.student?.studentId || '';
    const num = m.cardNumber || '';
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || sid.toLowerCase().includes(q) || num.toLowerCase().includes(q);
  });

  return (
    <div style={styles.container}>
      {/* Header Banner */}
      <div style={styles.banner}>
        <div style={styles.bannerContent}>
          <div style={styles.iconCircle}>
            <ShieldCheck size={28} color="#3b82f6" />
          </div>
          <div>
            <h2 style={styles.bannerTitle}>Licoka Institutional Gatekeeper</h2>
            <p style={styles.bannerSubtitle}>
              Automated 40% Fee Clearance Threshold • Student Examination Passes • 31-Day Dining Hall Meal Cards
            </p>
          </div>
        </div>
        {!readOnly && (
          <button 
            style={styles.syncBtn} 
            onClick={handleSyncAll} 
            disabled={syncing}
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Evaluating Students...' : 'Evaluate & Sync All Passes'}
          </button>
        )}
      </div>

      {syncMsg && (
        <div style={styles.alertSuccess}>
          <Sparkles size={18} color="#10b981" />
          <span>{syncMsg}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Active Student Passes</div>
          <div style={{ ...styles.statValue, color: '#2563eb' }}>{passes.length}</div>
          <div style={styles.statHint}>Issued to students with ≥ 40% term fee payment</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Dining Meal Cards</div>
          <div style={{ ...styles.statValue, color: '#059669' }}>{mealCards.length}</div>
          <div style={styles.statHint}>Active dining hall authorization with 31-day punch tracking</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>100% Cleared Students</div>
          <div style={{ ...styles.statValue, color: '#7c3aed' }}>
            {passes.filter(p => p.percentageCleared >= 100).length}
          </div>
          <div style={styles.statHint}>Fully unencumbered financial clearance</div>
        </div>
      </div>

      {/* Control Bar */}
      <div style={styles.controlBar}>
        {/* Sub-tabs */}
        <div style={styles.pillTabs}>
          <button
            style={{ ...styles.pillBtn, ...(activeSubTab === 'passes' ? styles.pillBtnActive : {}) }}
            onClick={() => setActiveSubTab('passes')}
          >
            <CreditCard size={15} />
            Student Exam Passes ({passes.length})
          </button>
          <button
            style={{ ...styles.pillBtn, ...(activeSubTab === 'meals' ? styles.pillBtnActive : {}) }}
            onClick={() => setActiveSubTab('meals')}
          >
            <Utensils size={15} />
            Dining Meal Cards ({mealCards.length})
          </button>
        </div>

        {/* Filter controls */}
        <div style={styles.filtersRow}>
          <div style={styles.searchBox}>
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by student name, admission #, pass #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <select 
            value={term} 
            onChange={(e) => setTerm(e.target.value)} 
            style={styles.select}
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
          <input
            type="number"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            style={{ ...styles.select, width: 90 }}
          />
        </div>
      </div>

      {/* Subtab 1: Student Passes */}
      {activeSubTab === 'passes' && (
        <div style={styles.cardWrapper}>
          {loading ? (
            <div style={styles.emptyState}>Loading student passes...</div>
          ) : filteredPasses.length === 0 ? (
            <div style={styles.emptyState}>
              <AlertCircle size={36} color="#94a3b8" />
              <p>No student passes found for {term} {academicYear}. Click "Evaluate & Sync All Passes" to generate passes for students meeting the 40% threshold.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Pass #</th>
                    <th style={styles.th}>Student Name</th>
                    <th style={styles.th}>Admission / Reg #</th>
                    <th style={styles.th}>Class & Stream</th>
                    <th style={styles.th}>% Cleared</th>
                    <th style={styles.th}>Exam Status</th>
                    <th style={styles.th}>Issued Date</th>
                    <th style={styles.thRight}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPasses.map((p) => {
                    const studentName = p.student?.user?.name || 'Unknown Student';
                    const admNo = p.student?.admissionNumber || p.student?.studentId || 'N/A';
                    const classLevel = p.student?.currentClassLevel || p.student?.currentClass?.level || 'S1';
                    const stream = p.student?.currentStream || 'Green';
                    const pct = p.percentageCleared || 0;

                    return (
                      <tr key={p._id} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: 700, color: '#1e3a8a' }}>
                          {p.passNumber}
                        </td>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{studentName}</td>
                        <td style={styles.td}>
                          <span style={styles.codeBadge}>{admNo}</span>
                        </td>
                        <td style={styles.td}>
                          {classLevel} <span style={styles.streamBadge}>{stream}</span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.progressContainer}>
                            <div style={styles.progressBarBg}>
                              <div 
                                style={{ 
                                  ...styles.progressBarFill, 
                                  width: `${Math.min(100, pct)}%`,
                                  backgroundColor: pct >= 100 ? '#10b981' : pct >= 40 ? '#3b82f6' : '#ef4444'
                                }} 
                              />
                            </div>
                            <span style={styles.pctText}>{pct}%</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          {p.isValid && p.examPermitted ? (
                            <span style={styles.badgeSuccess}>
                              <CheckCircle size={13} /> EXAM PERMITTED
                            </span>
                          ) : (
                            <span style={styles.badgeWarning}>WITHHELD</span>
                          )}
                        </td>
                        <td style={{ ...styles.td, color: '#64748b', fontSize: 13 }}>
                          {new Date(p.issuedDate).toLocaleDateString()}
                        </td>
                        <td style={styles.tdRight}>
                          <button
                            style={styles.printBtn}
                            onClick={() => setActivePrintPass({ ...p, studentName, admNo, classLevel, stream })}
                          >
                            <Printer size={14} />
                            Print Pass
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Subtab 2: Meal Cards */}
      {activeSubTab === 'meals' && (
        <div style={styles.cardWrapper}>
          {loading ? (
            <div style={styles.emptyState}>Loading dining meal cards...</div>
          ) : filteredMealCards.length === 0 ? (
            <div style={styles.emptyState}>
              <Utensils size={36} color="#94a3b8" />
              <p>No dining meal cards found for {term} {academicYear}. Click "Evaluate & Sync All Passes" to issue meal cards.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Card #</th>
                    <th style={styles.th}>Student Name</th>
                    <th style={styles.th}>Admission #</th>
                    <th style={styles.th}>Class</th>
                    <th style={styles.th}>Meals Punched</th>
                    <th style={styles.th}>Card Status</th>
                    <th style={styles.th}>Issued Date</th>
                    <th style={styles.thRight}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMealCards.map((m) => {
                    const studentName = m.student?.user?.name || 'Unknown';
                    const admNo = m.student?.admissionNumber || m.student?.studentId || 'N/A';
                    const classLevel = m.student?.currentClassLevel || m.student?.currentClass?.level || 'S1';
                    const punchedCount = m.mealDaysLogged?.length || 0;

                    return (
                      <tr key={m._id} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: 700, color: '#059669' }}>
                          {m.cardNumber}
                        </td>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{studentName}</td>
                        <td style={styles.td}>
                          <span style={styles.codeBadge}>{admNo}</span>
                        </td>
                        <td style={styles.td}>{classLevel}</td>
                        <td style={styles.td}>
                          <span style={styles.punchCountBadge}>
                            {punchedCount} / 31 Days
                          </span>
                        </td>
                        <td style={styles.td}>
                          {m.isValid ? (
                            <span style={styles.badgeSuccess}>VALID DINING</span>
                          ) : (
                            <span style={styles.badgeWarning}>INACTIVE</span>
                          )}
                        </td>
                        <td style={{ ...styles.td, color: '#64748b', fontSize: 13 }}>
                          {new Date(m.issuedDate).toLocaleDateString()}
                        </td>
                        <td style={styles.tdRight}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {!readOnly && (
                              <button
                                style={styles.logBtn}
                                onClick={() => setLoggingDayCardId(m._id)}
                              >
                                <Check size={13} /> Punch Day
                              </button>
                            )}
                            <button
                              style={styles.printBtn}
                              onClick={() => setActivePrintMealCard({ ...m, studentName, admNo, classLevel })}
                            >
                              <Printer size={14} /> Print Card
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PUNCH DAY MODAL */}
      {loggingDayCardId && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBoxSmall}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Log Dining Meal Day</h3>
              <button style={styles.closeBtn} onClick={() => setLoggingDayCardId(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '16px 0' }}>
              <label style={styles.formLabel}>Select Day of Month (1 - 31):</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayToLog}
                onChange={(e) => setDayToLog(parseInt(e.target.value) || 1)}
                style={styles.inputModal}
              />
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => setLoggingDayCardId(null)}>Cancel</button>
              <button style={styles.confirmBtn} onClick={() => handleLogMealDay(loggingDayCardId)}>Confirm Punch</button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT STUDENT EXAM PASS MODAL */}
      {activePrintPass && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBoxPrint}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Print Student Examination Pass</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={styles.printActionBtn} onClick={() => window.print()}>
                  <Printer size={15} /> Print Now
                </button>
                <button style={styles.closeBtn} onClick={() => setActivePrintPass(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Pass Slip */}
            <div id="printable-pass" style={styles.passSlip}>
              <div style={styles.slipHeader}>
                <div style={styles.slipSchoolTitle}>LIGHT COLLEGE KATIKAMU (LICOKA)</div>
                <div style={styles.slipSchoolSubtitle}>Secondary School Management • P.O. Box 7149 Kampala, Uganda</div>
                <div style={styles.slipBadge}>OFFICIAL STUDENT EXAMINATION ENTRY PASS</div>
              </div>

              <div style={styles.slipBody}>
                <div style={styles.slipGrid}>
                  <div>
                    <span style={styles.slipFieldLabel}>Student Name:</span>
                    <span style={styles.slipFieldValue}>{activePrintPass.studentName}</span>
                  </div>
                  <div>
                    <span style={styles.slipFieldLabel}>Pass Number:</span>
                    <span style={{ ...styles.slipFieldValue, color: '#1e3a8a', fontFamily: 'monospace' }}>
                      {activePrintPass.passNumber}
                    </span>
                  </div>
                  <div>
                    <span style={styles.slipFieldLabel}>Admission Number:</span>
                    <span style={styles.slipFieldValue}>{activePrintPass.admNo}</span>
                  </div>
                  <div>
                    <span style={styles.slipFieldLabel}>Class & Stream:</span>
                    <span style={styles.slipFieldValue}>
                      {activePrintPass.classLevel} - {activePrintPass.stream || 'Green'}
                    </span>
                  </div>
                  <div>
                    <span style={styles.slipFieldLabel}>Term / Academic Year:</span>
                    <span style={styles.slipFieldValue}>{activePrintPass.term} {activePrintPass.academicYear}</span>
                  </div>
                  <div>
                    <span style={styles.slipFieldLabel}>Fee Clearance Status:</span>
                    <span style={{ ...styles.slipFieldValue, color: '#059669', fontWeight: 800 }}>
                      {activePrintPass.percentageCleared}% PAID (≥ 40% THRESHOLD MET)
                    </span>
                  </div>
                </div>

                <div style={styles.slipNotice}>
                  <p style={{ margin: 0, fontSize: 12 }}>
                    <strong>EXAMINATION HALL AUTHORIZATION:</strong> The bearer of this pass has met the statutory institutional financial clearance requirement and is authorized to sit for all scheduled mid-term and end-of-term examinations for {activePrintPass.term}.
                  </p>
                </div>

                <div style={styles.signatureRow}>
                  <div style={styles.sigBox}>
                    <div style={styles.sigLine} />
                    <span style={styles.sigLabel}>Chief Bursar / Accounts</span>
                  </div>
                  <div style={styles.stampBox}>
                    <div style={styles.officialStampCircle}>
                      <span>LICOKA</span>
                      <span>BURSAR</span>
                      <span>CLEARED</span>
                    </div>
                  </div>
                  <div style={styles.sigBox}>
                    <div style={styles.sigLine} />
                    <span style={styles.sigLabel}>Director of Studies (DOS)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT 31-DAY MEAL CARD MODAL */}
      {activePrintMealCard && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBoxPrint}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Print 31-Day Dining Meal Card</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={styles.printActionBtn} onClick={() => window.print()}>
                  <Printer size={15} /> Print Card
                </button>
                <button style={styles.closeBtn} onClick={() => setActivePrintMealCard(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Meal Card */}
            <div id="printable-meal-card" style={styles.mealCardSlip}>
              <div style={styles.mealHeader}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>LIGHT COLLEGE KATIKAMU</div>
                <div style={{ fontSize: 12, color: '#475569' }}>DINING HALL MEAL TRACKING CARD</div>
                <div style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>
                  CARD NO: {activePrintMealCard.cardNumber} • {activePrintMealCard.term} {activePrintMealCard.academicYear}
                </div>
              </div>

              <div style={styles.mealMeta}>
                <div><strong>Student:</strong> {activePrintMealCard.studentName}</div>
                <div><strong>Admission #:</strong> {activePrintMealCard.admNo}</div>
                <div><strong>Class:</strong> {activePrintMealCard.classLevel}</div>
              </div>

              {/* 31-Day Punch Grid (Breakfast / Lunch / Dinner) */}
              <div style={styles.gridContainer}>
                <div style={styles.gridTitle}>31-DAY ATTENDANCE PUNCH GRID</div>
                <div style={styles.daysGrid}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                    const isPunched = (activePrintMealCard.mealDaysLogged || []).some(m => m.dayNumber === day);
                    return (
                      <div 
                        key={day} 
                        style={{ 
                          ...styles.dayCell, 
                          backgroundColor: isPunched ? '#dcfce7' : '#fff',
                          borderColor: isPunched ? '#10b981' : '#cbd5e1'
                        }}
                      >
                        <span style={styles.dayNum}>{day}</span>
                        {isPunched && <Check size={14} color="#10b981" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={styles.mealFooter}>
                <span>Issued by Catering Department • Card must be presented at dining entrance</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  banner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    flexWrap: 'wrap',
    gap: 16
  },
  bannerContent: { display: 'flex', alignItems: 'center', gap: 16 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  bannerTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' },
  bannerSubtitle: { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  syncBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    borderRadius: 8,
    backgroundColor: '#1e3a8a',
    color: '#fff',
    border: 'none',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  alertSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    fontSize: 13,
    fontWeight: 600
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16
  },
  statCard: {
    padding: 18,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  statLabel: { fontSize: 13, fontWeight: 600, color: '#64748b' },
  statValue: { fontSize: 28, fontWeight: 800, margin: '6px 0 2px' },
  statHint: { fontSize: 12, color: '#94a3b8' },
  controlBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12
  },
  pillTabs: {
    display: 'flex',
    gap: 8,
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 10
  },
  pillBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#64748b',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer'
  },
  pillBtnActive: {
    backgroundColor: '#ffffff',
    color: '#1e3a8a',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  filtersRow: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '6px 12px',
    minWidth: 260
  },
  searchInput: { border: 'none', outline: 'none', fontSize: 13, width: '100%' },
  select: {
    padding: '7px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    color: '#334155'
  },
  cardWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    overflow: 'hidden'
  },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  th: { padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' },
  thRight: { padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#475569', textAlign: 'right' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '14px 16px', fontSize: 14, color: '#1e293b' },
  tdRight: { padding: '14px 16px', textAlign: 'right' },
  codeBadge: {
    padding: '2px 8px',
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    fontSize: 12,
    fontWeight: 600,
    color: '#475569'
  },
  streamBadge: {
    padding: '2px 6px',
    borderRadius: 4,
    backgroundColor: '#dcfce7',
    color: '#15803d',
    fontSize: 11,
    fontWeight: 700,
    marginLeft: 4
  },
  progressContainer: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 },
  progressBarBg: { flex: 1, height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4, transition: 'width 0.3s' },
  pctText: { fontSize: 12, fontWeight: 700, color: '#334155', minWidth: 32 },
  badgeSuccess: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 6,
    backgroundColor: '#dcfce7',
    color: '#166534',
    fontSize: 11,
    fontWeight: 700
  },
  badgeWarning: {
    padding: '3px 8px',
    borderRadius: 6,
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    fontSize: 11,
    fontWeight: 700
  },
  punchCountBadge: {
    padding: '3px 8px',
    borderRadius: 6,
    backgroundColor: '#ecfdf5',
    color: '#047857',
    fontWeight: 700,
    fontSize: 12
  },
  printBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    color: '#1e293b',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer'
  },
  logBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    borderRadius: 6,
    backgroundColor: '#059669',
    border: 'none',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer'
  },
  emptyState: { padding: '48px 24px', textAlign: 'center', color: '#94a3b8' },

  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16
  },
  modalBoxSmall: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  modalBoxPrint: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    width: '100%',
    maxWidth: 680,
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 14 },
  closeBtn: { border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' },
  printActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 8,
    backgroundColor: '#1e3a8a',
    color: '#fff',
    border: 'none',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer'
  },
  formLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 },
  inputModal: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 15 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  cancelBtn: { padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' },
  confirmBtn: { padding: '8px 14px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontWeight: 600, cursor: 'pointer' },

  // Printable Pass Slip Styles
  passSlip: {
    marginTop: 20,
    padding: 24,
    border: '2px solid #1e3a8a',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    color: '#0f172a'
  },
  slipHeader: { textAlign: 'center', borderBottom: '2px solid #cbd5e1', paddingBottom: 12, marginBottom: 16 },
  slipSchoolTitle: { fontSize: 18, fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.05em' },
  slipSchoolSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  slipBadge: {
    display: 'inline-block',
    marginTop: 8,
    padding: '4px 14px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 800,
    borderRadius: 4,
    letterSpacing: '0.08em'
  },
  slipBody: { display: 'flex', flexDirection: 'column', gap: 14 },
  slipGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 8,
    border: '1px solid #e2e8f0'
  },
  slipFieldLabel: { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' },
  slipFieldValue: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
  slipNotice: {
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1e3a8a'
  },
  signatureRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 20,
    paddingTop: 12
  },
  sigBox: { textAlign: 'center', width: 180 },
  sigLine: { height: 1, backgroundColor: '#475569', marginBottom: 4 },
  sigLabel: { fontSize: 11, color: '#64748b', fontWeight: 600 },
  stampBox: { textAlign: 'center' },
  officialStampCircle: {
    width: 74,
    height: 74,
    borderRadius: '50%',
    border: '2px dashed #dc2626',
    color: '#dc2626',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 9,
    fontWeight: 800,
    transform: 'rotate(-10deg)'
  },

  // Printable Meal Card Styles
  mealCardSlip: {
    marginTop: 20,
    padding: 20,
    border: '2px dashed #059669',
    borderRadius: 10,
    backgroundColor: '#ffffff'
  },
  mealHeader: { textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 10, marginBottom: 12 },
  mealMeta: { display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 16, backgroundColor: '#f8fafc', padding: 8, borderRadius: 6 },
  gridContainer: { border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 },
  gridTitle: { fontSize: 11, fontWeight: 800, color: '#475569', textAlign: 'center', marginBottom: 10, letterSpacing: '0.05em' },
  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 6
  },
  dayCell: {
    height: 44,
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700
  },
  dayNum: { fontSize: 10, color: '#64748b' },
  mealFooter: { marginTop: 14, textAlign: 'center', fontSize: 10, color: '#94a3b8' }
};
