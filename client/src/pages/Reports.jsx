import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  FileText, BarChart2, TrendingUp, TrendingDown, Users,
  CreditCard, Calendar, Download, Printer, Filter,
  ChevronDown, Award, AlertTriangle, CheckCircle
} from 'lucide-react';

const TERMS = ['Term I 2026', 'Term II 2026', 'Term III 2025', 'Term II 2025', 'Term I 2025'];
const CLASSES = ['All Classes', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'S1', 'S2', 'S3', 'S4'];

export default function Reports() {
  const [activeReport, setActiveReport] = useState('overview');
  const [selectedTerm, setSelectedTerm] = useState('Term II 2026');
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [loading, setLoading] = useState(false);

  // Mock data — would be fetched from API in production
  const overviewData = {
    totalStudents: 124,
    attendance: { rate: 94.2, trend: '+1.8%', up: true },
    feesCollected: { amount: '42,500,000', target: '58,000,000', percent: 73.3 },
    avgGrade: { score: 71.4, trend: '+3.2%', up: true },
    topPerformers: [
      { name: 'Nakato Aisha', class: 'P7A', avg: 95.2, badge: '🥇' },
      { name: 'Okello Brian', class: 'S4B', avg: 93.8, badge: '🥈' },
      { name: 'Namukasa Joy', class: 'P6A', avg: 91.5, badge: '🥉' },
      { name: 'Ssemwogerere Paul', class: 'S2A', avg: 90.1, badge: '⭐' },
      { name: 'Atim Grace', class: 'P7B', avg: 88.7, badge: '⭐' },
    ],
    subjectPerformance: [
      { subject: 'Mathematics', avg: 68.5, pass: 82 },
      { subject: 'English Language', avg: 74.2, pass: 91 },
      { subject: 'Science', avg: 70.8, pass: 86 },
      { subject: 'Social Studies', avg: 76.1, pass: 93 },
      { subject: 'Kiswahili', avg: 65.3, pass: 78 },
      { subject: 'Religious Education', avg: 79.4, pass: 95 },
    ],
    attendanceByClass: [
      { class: 'P1', rate: 97.1 }, { class: 'P2', rate: 95.3 },
      { class: 'P3', rate: 94.8 }, { class: 'P4', rate: 93.2 },
      { class: 'P5', rate: 92.1 }, { class: 'P6', rate: 94.5 },
      { class: 'P7', rate: 95.8 }, { class: 'S1', rate: 91.4 },
      { class: 'S2', rate: 92.7 }, { class: 'S3', rate: 93.1 },
      { class: 'S4', rate: 96.2 },
    ],
    feesByClass: [
      { class: 'P1-P4', collected: 14200000, target: 18000000 },
      { class: 'P5-P7', collected: 16800000, target: 22000000 },
      { class: 'S1-S4', collected: 11500000, target: 18000000 },
    ]
  };

  const reportCategories = [
    { id: 'overview', label: 'Term Overview', icon: BarChart2 },
    { id: 'academic', label: 'Academic Performance', icon: TrendingUp },
    { id: 'attendance', label: 'Attendance Report', icon: Calendar },
    { id: 'finance', label: 'Fee Collection', icon: CreditCard },
    { id: 'staff', label: 'Staff Report', icon: Users },
  ];

  const handlePrint = () => window.print();

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Reports &amp; Analytics</h1>
          <p style={styles.pageSubtitle}>Comprehensive institutional reports for {selectedTerm}</p>
        </div>
        <div style={styles.headerActions}>
          <select style={styles.filterSelect} value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
            {TERMS.map(t => <option key={t}>{t}</option>)}
          </select>
          <select style={styles.filterSelect} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            {CLASSES.map(c => <option key={c}>{c}</option>)}
          </select>
          <button style={styles.printBtn} onClick={handlePrint}>
            <Printer size={16} /> Print Report
          </button>
          <button style={styles.downloadBtn}>
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Report Category Tabs */}
      <div style={styles.tabBar}>
        {reportCategories.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              style={{ ...styles.tabBtn, ...(activeReport === cat.id ? styles.tabBtnActive : {}) }}
              onClick={() => setActiveReport(cat.id)}
            >
              <Icon size={16} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* === OVERVIEW REPORT === */}
      {activeReport === 'overview' && (
        <div style={styles.reportBody}>
          {/* KPI Strip */}
          <div style={styles.kpiGrid}>
            <div style={styles.kpiCard}>
              <div style={{ ...styles.kpiIcon, background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                <Users size={22} color="#fff" />
              </div>
              <div>
                <div style={styles.kpiValue}>{overviewData.totalStudents}</div>
                <div style={styles.kpiLabel}>Total Students Enrolled</div>
              </div>
            </div>
            <div style={styles.kpiCard}>
              <div style={{ ...styles.kpiIcon, background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                <Calendar size={22} color="#fff" />
              </div>
              <div>
                <div style={styles.kpiValue}>{overviewData.attendance.rate}%</div>
                <div style={styles.kpiLabel}>Average Attendance
                  <span style={{ color: '#10b981', marginLeft: 8, fontSize: 12 }}>
                    {overviewData.attendance.trend}
                  </span>
                </div>
              </div>
            </div>
            <div style={styles.kpiCard}>
              <div style={{ ...styles.kpiIcon, background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                <CreditCard size={22} color="#fff" />
              </div>
              <div>
                <div style={styles.kpiValue}>UGX {overviewData.feesCollected.amount}</div>
                <div style={styles.kpiLabel}>Fees Collected ({overviewData.feesCollected.percent}%)</div>
              </div>
            </div>
            <div style={styles.kpiCard}>
              <div style={{ ...styles.kpiIcon, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}>
                <TrendingUp size={22} color="#fff" />
              </div>
              <div>
                <div style={styles.kpiValue}>{overviewData.avgGrade.score}%</div>
                <div style={styles.kpiLabel}>Average Score
                  <span style={{ color: '#10b981', marginLeft: 8, fontSize: 12 }}>
                    {overviewData.avgGrade.trend}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Two Column Section */}
          <div style={styles.twoCol}>
            {/* Top Performers */}
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <Award size={18} color="#f59e0b" />
                <h3 style={styles.panelTitle}>Top Performers — {selectedTerm}</h3>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Rank</th>
                    <th style={styles.th}>Student Name</th>
                    <th style={styles.th}>Class</th>
                    <th style={styles.th}>Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewData.topPerformers.map((s, i) => (
                    <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>{s.badge}</td>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{s.name}</td>
                      <td style={styles.td}>{s.class}</td>
                      <td style={{ ...styles.td, color: '#10b981', fontWeight: 700 }}>{s.avg}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Fee Collection Progress */}
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <CreditCard size={18} color="#f59e0b" />
                <h3 style={styles.panelTitle}>Fee Collection Progress</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {overviewData.feesByClass.map((item, i) => {
                  const pct = Math.round((item.collected / item.target) * 100);
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{item.class}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                          UGX {(item.collected / 1000000).toFixed(1)}M / {(item.target / 1000000).toFixed(1)}M
                        </span>
                      </div>
                      <div style={styles.progressBg}>
                        <div style={{
                          ...styles.progressFill,
                          width: `${pct}%`,
                          background: pct >= 80 ? 'linear-gradient(90deg,#10b981,#059669)' :
                            pct >= 50 ? 'linear-gradient(90deg,#f59e0b,#d97706)' :
                              'linear-gradient(90deg,#ef4444,#dc2626)'
                        }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>{pct}% collected</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Subject Performance Table */}
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <BarChart2 size={18} color="#6366f1" />
              <h3 style={styles.panelTitle}>Subject Performance Summary</h3>
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Subject</th>
                  <th style={styles.th}>Average Score</th>
                  <th style={styles.th}>Pass Rate</th>
                  <th style={styles.th}>Performance Bar</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {overviewData.subjectPerformance.map((sub, i) => (
                  <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{sub.subject}</td>
                    <td style={styles.td}>{sub.avg}%</td>
                    <td style={styles.td}>{sub.pass}%</td>
                    <td style={{ ...styles.td, width: 180 }}>
                      <div style={styles.progressBg}>
                        <div style={{
                          ...styles.progressFill,
                          width: `${sub.avg}%`,
                          background: sub.avg >= 75 ? 'linear-gradient(90deg,#10b981,#059669)' :
                            sub.avg >= 60 ? 'linear-gradient(90deg,#f59e0b,#d97706)' :
                              'linear-gradient(90deg,#ef4444,#dc2626)'
                        }} />
                      </div>
                    </td>
                    <td style={styles.td}>
                      {sub.avg >= 75
                        ? <span style={styles.badgeGood}><CheckCircle size={12} /> Good</span>
                        : sub.avg >= 60
                          ? <span style={styles.badgeWarn}><AlertTriangle size={12} /> Needs Attention</span>
                          : <span style={styles.badgeDanger}><AlertTriangle size={12} /> Critical</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Attendance by Class */}
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <Calendar size={18} color="#10b981" />
              <h3 style={styles.panelTitle}>Attendance Rate by Class</h3>
            </div>
            <div style={styles.attendanceGrid}>
              {overviewData.attendanceByClass.map((item, i) => (
                <div key={i} style={styles.attendanceCell}>
                  <div style={styles.attendanceClass}>{item.class}</div>
                  <div style={{
                    ...styles.attendanceRate,
                    color: item.rate >= 95 ? '#10b981' : item.rate >= 90 ? '#f59e0b' : '#ef4444'
                  }}>{item.rate}%</div>
                  <div style={styles.progressBg}>
                    <div style={{
                      ...styles.progressFill,
                      width: `${item.rate}%`,
                      background: item.rate >= 95 ? 'linear-gradient(90deg,#10b981,#059669)' :
                        item.rate >= 90 ? 'linear-gradient(90deg,#f59e0b,#d97706)' :
                          'linear-gradient(90deg,#ef4444,#dc2626)'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === ACADEMIC PERFORMANCE REPORT === */}
      {activeReport === 'academic' && (
        <div style={styles.reportBody}>
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <TrendingUp size={18} color="#6366f1" />
              <h3 style={styles.panelTitle}>Student Academic Performance — {selectedTerm} ({selectedClass})</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Student Name</th>
                    <th style={styles.th}>Class</th>
                    <th style={styles.th}>Math</th>
                    <th style={styles.th}>English</th>
                    <th style={styles.th}>Science</th>
                    <th style={styles.th}>SST</th>
                    <th style={styles.th}>Average</th>
                    <th style={styles.th}>Division</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Nakato Aisha', cls: 'P7A', math: 96, eng: 94, sci: 95, sst: 96, avg: 95.2 },
                    { name: 'Okello Brian', cls: 'S4B', math: 92, eng: 95, sci: 94, sst: 94, avg: 93.8 },
                    { name: 'Namukasa Joy', cls: 'P6A', math: 89, eng: 93, sci: 91, sst: 93, avg: 91.5 },
                    { name: 'Ssemwogerere Paul', cls: 'S2A', math: 88, eng: 91, sci: 90, sst: 91, avg: 90.1 },
                    { name: 'Atim Grace', cls: 'P7B', math: 86, eng: 90, sci: 88, sst: 91, avg: 88.7 },
                    { name: 'Muwanga David', cls: 'S1A', math: 83, eng: 87, sci: 85, sst: 88, avg: 85.8 },
                    { name: 'Nabukenya Rose', cls: 'P5A', math: 80, eng: 86, sci: 83, sst: 86, avg: 83.8 },
                    { name: 'Kato Emmanuel', cls: 'S3B', math: 78, eng: 84, sci: 81, sst: 83, avg: 81.5 },
                  ].map((s, i) => (
                    <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>{i + 1}</td>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{s.name}</td>
                      <td style={styles.td}>{s.cls}</td>
                      <td style={styles.td}>{s.math}</td>
                      <td style={styles.td}>{s.eng}</td>
                      <td style={styles.td}>{s.sci}</td>
                      <td style={styles.td}>{s.sst}</td>
                      <td style={{ ...styles.td, fontWeight: 700, color: '#6366f1' }}>{s.avg}%</td>
                      <td style={styles.td}>
                        <span style={s.avg >= 80 ? styles.badgeGood : s.avg >= 60 ? styles.badgeWarn : styles.badgeDanger}>
                          {s.avg >= 80 ? 'Div 1' : s.avg >= 60 ? 'Div 2' : 'Div 3'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* === ATTENDANCE REPORT === */}
      {activeReport === 'attendance' && (
        <div style={styles.reportBody}>
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <Calendar size={18} color="#10b981" />
              <h3 style={styles.panelTitle}>Daily Attendance Summary — {selectedTerm}</h3>
            </div>
            <div style={styles.kpiGrid}>
              {[
                { label: 'School Days This Term', value: '52', icon: Calendar, color: '#6366f1' },
                { label: 'Avg Daily Attendance', value: '117 / 124', icon: Users, color: '#10b981' },
                { label: 'Chronic Absentees (>10%)', value: '6', icon: AlertTriangle, color: '#ef4444' },
                { label: 'Perfect Attendance', value: '38', icon: CheckCircle, color: '#f59e0b' },
              ].map((m, i) => {
                const Icon = m.icon;
                return (
                  <div key={i} style={styles.kpiCard}>
                    <div style={{ ...styles.kpiIcon, background: m.color }}>
                      <Icon size={22} color="#fff" />
                    </div>
                    <div>
                      <div style={styles.kpiValue}>{m.value}</div>
                      <div style={styles.kpiLabel}>{m.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ overflowX: 'auto', marginTop: 16 }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Student Name</th>
                    <th style={styles.th}>Class</th>
                    <th style={styles.th}>Days Present</th>
                    <th style={styles.th}>Days Absent</th>
                    <th style={styles.th}>Rate</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Nakato Aisha', cls: 'P7A', present: 52, absent: 0 },
                    { name: 'Okello Brian', cls: 'S4B', present: 51, absent: 1 },
                    { name: 'Kato Emmanuel', cls: 'S3B', present: 49, absent: 3 },
                    { name: 'Atim Grace', cls: 'P7B', present: 47, absent: 5 },
                    { name: 'Muwanga David', cls: 'S1A', present: 44, absent: 8 },
                    { name: 'Nabukenya Rose', cls: 'P5A', present: 41, absent: 11 },
                  ].map((s, i) => {
                    const rate = Math.round((s.present / 52) * 100);
                    return (
                      <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{s.name}</td>
                        <td style={styles.td}>{s.cls}</td>
                        <td style={styles.td}>{s.present}</td>
                        <td style={styles.td}>{s.absent}</td>
                        <td style={{ ...styles.td, fontWeight: 700, color: rate >= 90 ? '#10b981' : rate >= 75 ? '#f59e0b' : '#ef4444' }}>{rate}%</td>
                        <td style={styles.td}>
                          {rate >= 90
                            ? <span style={styles.badgeGood}>Regular</span>
                            : rate >= 75
                              ? <span style={styles.badgeWarn}>Irregular</span>
                              : <span style={styles.badgeDanger}>Chronic</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* === FINANCE REPORT === */}
      {activeReport === 'finance' && (
        <div style={styles.reportBody}>
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <CreditCard size={18} color="#f59e0b" />
              <h3 style={styles.panelTitle}>Fee Collection Report — {selectedTerm}</h3>
            </div>
            <div style={styles.kpiGrid}>
              {[
                { label: 'Total Expected (UGX)', value: '58,000,000', color: '#6366f1' },
                { label: 'Total Collected (UGX)', value: '42,500,000', color: '#10b981' },
                { label: 'Outstanding Balance (UGX)', value: '15,500,000', color: '#ef4444' },
                { label: 'Collection Rate', value: '73.3%', color: '#f59e0b' },
              ].map((m, i) => (
                <div key={i} style={{ ...styles.kpiCard, borderLeft: `4px solid ${m.color}` }}>
                  <div>
                    <div style={{ ...styles.kpiValue, fontSize: 20 }}>UGX {m.value}</div>
                    <div style={styles.kpiLabel}>{m.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ overflowX: 'auto', marginTop: 16 }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Student Name</th>
                    <th style={styles.th}>Class</th>
                    <th style={styles.th}>Total Fees (UGX)</th>
                    <th style={styles.th}>Paid (UGX)</th>
                    <th style={styles.th}>Balance (UGX)</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Nakato Aisha', cls: 'P7A', total: 450000, paid: 450000 },
                    { name: 'Okello Brian', cls: 'S4B', total: 600000, paid: 600000 },
                    { name: 'Namukasa Joy', cls: 'P6A', total: 450000, paid: 300000 },
                    { name: 'Muwanga David', cls: 'S1A', total: 550000, paid: 200000 },
                    { name: 'Nabukenya Rose', cls: 'P5A', total: 420000, paid: 420000 },
                    { name: 'Kato Emmanuel', cls: 'S3B', total: 580000, paid: 100000 },
                  ].map((s, i) => {
                    const balance = s.total - s.paid;
                    const paid = s.paid >= s.total;
                    return (
                      <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{s.name}</td>
                        <td style={styles.td}>{s.cls}</td>
                        <td style={styles.td}>{s.total.toLocaleString()}</td>
                        <td style={{ ...styles.td, color: '#10b981', fontWeight: 600 }}>{s.paid.toLocaleString()}</td>
                        <td style={{ ...styles.td, color: balance > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{balance.toLocaleString()}</td>
                        <td style={styles.td}>
                          {paid
                            ? <span style={styles.badgeGood}>✓ Cleared</span>
                            : balance < s.total * 0.5
                              ? <span style={styles.badgeWarn}>Partial</span>
                              : <span style={styles.badgeDanger}>Outstanding</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* === STAFF REPORT === */}
      {activeReport === 'staff' && (
        <div style={styles.reportBody}>
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <Users size={18} color="#8b5cf6" />
              <h3 style={styles.panelTitle}>Staff Performance Report — {selectedTerm}</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Teacher Name</th>
                    <th style={styles.th}>Subject / Class</th>
                    <th style={styles.th}>Lessons Taught</th>
                    <th style={styles.th}>Student Avg</th>
                    <th style={styles.th}>Attendance Marked</th>
                    <th style={styles.th}>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Mr. Ssekandi John', subject: 'Mathematics (S4)', lessons: 48, avg: 78.2, att: 98 },
                    { name: 'Ms. Nalubega Betty', subject: 'English (P7)', lessons: 52, avg: 85.1, att: 100 },
                    { name: 'Mr. Tumwine Peter', subject: 'Science (P6)', lessons: 44, avg: 72.5, att: 92 },
                    { name: 'Ms. Akankwasa Ruth', subject: 'SST (P5)', lessons: 50, avg: 80.3, att: 96 },
                    { name: 'Mr. Byamugisha Fred', subject: 'Kiswahili (S2)', lessons: 40, avg: 65.8, att: 88 },
                  ].map((t, i) => {
                    const rating = t.avg >= 80 ? '⭐⭐⭐⭐⭐' : t.avg >= 70 ? '⭐⭐⭐⭐' : '⭐⭐⭐';
                    return (
                      <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{t.name}</td>
                        <td style={styles.td}>{t.subject}</td>
                        <td style={styles.td}>{t.lessons}</td>
                        <td style={{ ...styles.td, fontWeight: 700, color: '#6366f1' }}>{t.avg}%</td>
                        <td style={{ ...styles.td, color: t.att >= 95 ? '#10b981' : '#f59e0b' }}>{t.att}%</td>
                        <td style={styles.td}>{rating}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 28 },
  pageHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    flexWrap: 'wrap', gap: 16,
  },
  pageTitle: { fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: 'var(--text-tertiary)' },
  headerActions: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  filterSelect: {
    padding: '8px 14px', borderRadius: 8,
    border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer',
  },
  printBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  downloadBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 18px', borderRadius: 8, border: 'none',
    background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
    color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  tabBar: {
    display: 'flex', gap: 8, flexWrap: 'wrap',
    borderBottom: '2px solid var(--border)', paddingBottom: 0,
  },
  tabBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 20px', border: 'none', borderRadius: '8px 8px 0 0',
    backgroundColor: 'transparent', color: 'var(--text-secondary)',
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
    transition: 'all 0.2s', borderBottom: '2px solid transparent',
    marginBottom: -2,
  },
  tabBtnActive: {
    color: 'var(--primary)', fontWeight: 700,
    borderBottom: '2px solid var(--primary)',
    backgroundColor: 'var(--primary-light)',
  },
  reportBody: { display: 'flex', flexDirection: 'column', gap: 24 },
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20,
  },
  kpiCard: {
    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '20px 24px',
    display: 'flex', alignItems: 'center', gap: 16,
    boxShadow: 'var(--shadow-sm)',
  },
  kpiIcon: {
    width: 48, height: 48, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  kpiValue: { fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 },
  kpiLabel: { fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 },
  panel: {
    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 24, boxShadow: 'var(--shadow-sm)',
  },
  panelHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20,
  },
  panelTitle: { fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' },
  twoCol: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20,
    '@media(max-width:800px)': { gridTemplateColumns: '1fr' },
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 700,
    color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px',
    borderBottom: '2px solid var(--border)', backgroundColor: 'var(--bg-primary)',
  },
  td: { padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' },
  trEven: { backgroundColor: 'var(--bg-secondary)' },
  trOdd: { backgroundColor: 'var(--bg-primary)' },
  progressBg: { height: 8, backgroundColor: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, transition: 'width 0.5s ease' },
  badgeGood: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    backgroundColor: '#d1fae5', color: '#065f46',
  },
  badgeWarn: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    backgroundColor: '#fef3c7', color: '#92400e',
  },
  badgeDanger: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    backgroundColor: '#fee2e2', color: '#991b1b',
  },
  attendanceGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16,
  },
  attendanceCell: {
    backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '14px 16px',
  },
  attendanceClass: { fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4 },
  attendanceRate: { fontSize: 22, fontWeight: 800, marginBottom: 8 },
};
