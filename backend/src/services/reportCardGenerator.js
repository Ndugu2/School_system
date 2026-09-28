const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * ReportCardGenerator — dual-layout PDF generator.
 *
 * Auto-formats the report based on the student's class level:
 *   • S1–S4  → NCDC Competency-Based Report Card (Lower Secondary)
 *   • S5–S6  → UACE Statement of Results (Upper Secondary, 20-point scale)
 *
 * Expected `data` shape:
 * {
 *   reportType: 'ncdc' | 'uace' | undefined   // optional — auto-derived from classLevel
 *   school: { name, address, phone, motto },
 *   student: { name, studentId, admissionNumber, classLevel, streamName, gender, parentName },
 *   academicYear,
 *   term,
 *   classTeacher: { name, phone },
 *   headTeacher: { name, phone },
 *   comments: { classTeacher, headTeacher },
 *   verification: { token, note },
 *
 *   // NCDC (S1–S4):
 *   subjects: [ { subject: { name, code }, aoiScore, formativeMark, summativeMark, finalScore, competency } ],
 *   genericSkills: [ { name, score, descriptor } ],
 *   averages: { aoiAvg, formativeTotal, summativeTotal, finalAvg, competencyLabel },
 *
 *   // UACE (S5–S6):
 *   combination: { name, label },
 *   uaceSubjects: [ { subject: { name, code }, type, marks, maxMarks, percentage, letterGrade, points } ],
 *   aggregate: { total, outOf, breakdown }
 * }
 */
class ReportCardGenerator {
  static generate(data, stream) {
    return new Promise(async (resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      doc.pipe(stream);

      const type = ReportCardGenerator.resolveType(data);
      try {
        if (type === 'ncdc') await ReportCardGenerator.buildNCDC(doc, data);
        else await ReportCardGenerator.buildUACE(doc, data);

        doc.end();
        stream.on('finish', () => resolve());
        stream.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  static resolveType(data) {
    if (data.reportType) return data.reportType;
    const level = data.student?.classLevel || '';
    return ['S5', 'S6'].includes(level) ? 'uace' : 'ncdc';
  }

  // ───────────────────────────── Shared helpers ─────────────────────────────
  static drawWatermark(doc) {
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    doc.save();
    doc.opacity(0.08);
    doc.fillColor('#4f46e5');
    doc.rotate(-45, { origin: [pageW / 2, pageH / 2] });
    doc.fontSize(72).font('Helvetica-Bold');
    doc.text('NDUGU ACADEMY', -120, pageH / 2 - 60, { align: 'center', width: pageW + 240 });
    doc.restore();
  }

  static drawSchoolHeader(doc, data, title) {
    const width = doc.page.width - 100;
    const schoolName = data.school?.name || 'Ndugu Academy';
    const address = data.school?.address || 'P.O. Box 7120, Kampala, Uganda';
    const phone = data.school?.phone ? `  |  Tel: ${data.school.phone}` : '';

    doc.rect(50, 50, width, 90).fill('#1e3a5f');
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
      .text(schoolName.toUpperCase(), 60, 62, { align: 'center', width: width - 20, lineBreak: false });
    doc.fontSize(10).font('Helvetica')
      .text(`${address}${phone}`, 60, 92, { align: 'center', width: width - 20, lineBreak: false });
    doc.fontSize(13).font('Helvetica-Bold')
      .text(title, 60, 116, { align: 'center', width: width - 20, fillColor: '#e8e8e8', lineBreak: false });
    doc.fillColor('#000000');

    doc.moveTo(50, 155).lineTo(50 + width, 155).lineWidth(2).stroke('#1e3a5f');
    doc.lineWidth(1);
    doc.y = 165;
  }

  static drawStudentInfo(doc, data) {
    const width = doc.page.width - 100;
    let y = doc.y + 10;
    doc.rect(50, y, width, 62).fill('#f4f7fb').stroke('#cbd5e1');
    doc.fillColor('#1e3a5f').fontSize(10).font('Helvetica-Bold').text('STUDENT INFORMATION', 60, y + 8, { lineBreak: false });
    doc.fillColor('#334155').fontSize(10).font('Helvetica');

    const left = `Name: ${data.student?.name || '—'}`;
    const left2 = `Student ID: ${data.student?.studentId || '—'}    |    Adm No: ${data.student?.admissionNumber || '—'}`;
    const right = `Class: ${data.student?.classLevel || '—'}${data.student?.streamName ? ` ${data.student.streamName}` : ''}`;
    const right2 = `Term: ${data.term || '—'}    |    Year: ${data.academicYear || '—'}`;

    doc.text(left, 60, y + 22, { lineBreak: false });
    doc.text(right, 60 + width / 2, y + 22, { lineBreak: false });
    doc.text(left2, 60, y + 38, { lineBreak: false });
    doc.text(right2, 60 + width / 2, y + 38, { lineBreak: false });
    if (data.student?.parentName) {
      doc.text(`Parent: ${data.student.parentName}`, 60, y + 54, { lineBreak: false });
    }
    doc.y = y + 78;
  }

  static async drawQRCode(doc, data, x, y, size = 88) {
    const payload = data.verification?.token;
    if (!payload) return false;
    try {
      const buffer = await QRCode.toBuffer(payload, {
        type: 'png',
        width: size * 3,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      doc.image(buffer, x, y, { width: size, height: size });
      doc.fontSize(7).font('Helvetica').fillColor('#64748b')
        .text('Scan to verify', x, y + size + 2, { align: 'center', width: size, lineBreak: false });
      doc.fillColor('#000000');
      return true;
    } catch {
      return false;
    }
  }

  static drawCommentsAndSignatures(doc, data, y) {
    const width = doc.page.width - 100;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e3a5f')
      .text('COMMENTS', 50, y, { lineBreak: false });
    doc.fillColor('#000000');

    const ct = data.comments?.classTeacher || '';
    const ht = data.comments?.headTeacher || '';
    let cy = y + 16;

    doc.rect(50, cy, width, 46).fill('#f8fafc').stroke('#e2e8f0');
    doc.fontSize(9).font('Helvetica').fillColor('#334155');
    doc.text('Class Teacher:', 60, cy + 6, { continued: false, lineBreak: false });
    doc.font('Helvetica-Bold').fillColor('#000000').fontSize(9)
      .text(ct ? `  ${ct}` : '  ____________________________', 60, cy + 16, { width: width - 60, lineBreak: false });
    doc.fillColor('#334155').font('Helvetica').fontSize(9)
      .text('Signature: ______________  Date: ____________', 60, cy + 30, { lineBreak: false });
    cy += 54;

    doc.rect(50, cy, width, 46).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('#334155').font('Helvetica').fontSize(9);
    doc.text('Headteacher:', 60, cy + 6, { lineBreak: false });
    doc.font('Helvetica-Bold').fillColor('#000000').fontSize(9)
      .text(ht ? `  ${ht}` : '  ____________________________', 60, cy + 16, { width: width - 60, lineBreak: false });
    doc.fillColor('#334155').font('Helvetica').fontSize(9)
      .text('Signature: ______________  Date: ____________', 60, cy + 30, { lineBreak: false });
    doc.fillColor('#000000');
    cy += 54;
    return cy;
  }

  static ensureSpace(doc, needed) {
    const bottom = doc.page.height - 50;
    if (doc.y + needed > bottom) doc.addPage();
  }

  // ────────────────────────────────── NCDC (S1–S4) ──────────────────────────
  static async buildNCDC(doc, data) {
    const width = doc.page.width - 100;
    ReportCardGenerator.drawWatermark(doc);
    ReportCardGenerator.drawSchoolHeader(doc, data, 'NATIONAL CURRICULUM DEVELOPMENT CENTRE');
    ReportCardGenerator.drawStudentInfo(doc, data);

    const subjects = data.subjects || [];
    const averages = data.averages || {};

    // ── Results table ──
    const tableY = doc.y + 6;
    const cols = { name: 50, code: 160, aoi: 200, form: 280, summ: 350, final: 425, comp: 470 };
    const headers = ['Subject', 'Code', 'AOI Score', 'Formative\n(20%)', 'Summative\n(80%)', 'Final\n(100%)', 'Competency'];

    const headH = 32;
    doc.rect(cols.name, tableY, width, headH).fill('#1e3a5f');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    headers.forEach((h, i) => {
      const [l1, l2] = h.split('\n');
      doc.text(l1, cols.name + (i === 0 ? 10 : 0), tableY + 6, { width: 150, align: i === 0 ? 'left' : 'center', lineBreak: false });
      if (l2) doc.text(l2, cols.name + (i === 0 ? 10 : 0), tableY + 15, { width: 150, align: i === 0 ? 'left' : 'center', lineBreak: false });
    });
    doc.fillColor('#000000');
    doc.y = tableY + headH;

    let rowY = tableY + headH;
    subjects.forEach((s, idx) => {
      ReportCardGenerator.ensureSpace(doc, 20);
      rowY = Math.max(doc.y, rowY);
      const bg = idx % 2 === 0 ? '#f8faff' : '#ffffff';
      doc.rect(cols.name, rowY, width, 18).fill(bg).stroke('#e2e8f0');
      doc.fontSize(8).font('Helvetica').fillColor('#000000');
      doc.text(s.subject?.name || '—', cols.name + 10, rowY + 5, { width: 105, lineBreak: false });
      doc.text(s.subject?.code || '—', cols.code + 8, rowY + 5, { width: 40, align: 'center', lineBreak: false });
      doc.text(s.aoiScore != null ? Number(s.aoiScore).toFixed(1) : '—', cols.aoi + 8, rowY + 5, { width: 40, align: 'center', lineBreak: false });
      doc.text(s.formativeMark != null ? `${Number(s.formativeMark).toFixed(1)}` : '—', cols.form + 8, rowY + 5, { width: 40, align: 'center', lineBreak: false });
      doc.text(s.summativeMark != null ? `${Number(s.summativeMark).toFixed(1)}` : '—', cols.summ + 8, rowY + 5, { width: 40, align: 'center', lineBreak: false });
      doc.font('Helvetica-Bold')
        .text(s.finalScore != null ? `${Number(s.finalScore).toFixed(1)}` : '—', cols.final + 8, rowY + 5, { width: 40, align: 'center', lineBreak: false });
      doc.fillColor(s.competency === 'Outstanding' ? '#16a34a' : s.competency === 'Moderate' ? '#d97706' : '#64748b')
        .fontSize(7).font('Helvetica')
        .text(s.competency || '—', cols.comp + 4, rowY + 5, { width: 58, align: 'center', lineBreak: false });
      doc.fillColor('#000000').fontSize(8).font('Helvetica');
      rowY += 18;
    });
    doc.y = rowY;

    if (subjects.length === 0) {
      doc.rect(cols.name, rowY, width, 20).fill('#fef9c3');
      doc.fillColor('#92400e').fontSize(9)
        .text('No results recorded for this term.', 60, rowY + 6, { align: 'center', width, lineBreak: false });
      rowY += 20;
      doc.y = rowY;
    }

    // ── Averages ──
    if (subjects.length > 0) {
      doc.rect(cols.name, rowY, width, 20).fill('#eef2ff').stroke('#c7d2fe');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#312e81')
        .text(`AVERAGES →  AOI: ${Number(averages.aoiAvg || 0).toFixed(1)}/3    |    Final Mark: ${Number(averages.finalAvg || 0).toFixed(1)}/100    |    Overall Competency: ${averages.competencyLabel || '—'}`, cols.name + 10, rowY + 6, { width: width - 20, lineBreak: false });
      doc.fillColor('#000000');
      rowY += 20;
      doc.y = rowY;
    }

    // ── Competency descriptors legend ──
    rowY += 10;
    ReportCardGenerator.ensureSpace(doc, 54);
    doc.rect(50, rowY, width, 56).fill('#f8fafc').stroke('#e2e8f0');
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e3a5f').text('COMPETENCY DESCRIPTORS', 60, rowY + 6, { lineBreak: false });
    doc.fillColor('#334155').fontSize(9).font('Helvetica');
    doc.text('Basic (1.0 – 1.4): Learner demonstrates basic understanding and can carry out activities with support.', 60, rowY + 20, { width: width - 20, lineBreak: false });
    doc.text('Moderate (1.5 – 2.4): Learner demonstrates proficient competence and performs activities with minimal guidance.', 60, rowY + 33, { width: width - 20, lineBreak: false });
    doc.text('Outstanding (2.5 – 3.0): Learner demonstrates mastery of competence and works independently with excellence.', 60, rowY + 46, { width: width - 20, lineBreak: false });
    doc.fillColor('#000000');
    doc.y = rowY + 56;

    // ── Generic skills evaluation ──
    const skillsY = rowY + 66;
    ReportCardGenerator.ensureSpace(doc, 70);
    const skillsHeaderY = Math.max(doc.y, skillsY);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e3a5f')
      .text('GENERIC SKILLS EVALUATION', 50, skillsHeaderY, { lineBreak: false });
    doc.fillColor('#000000');

    let sy = skillsHeaderY + 16;
    const skills = data.genericSkills || [];
    doc.rect(50, sy, width, 20).fill('#1e3a5f');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    doc.text('Skill', 60, sy + 6, { lineBreak: false });
    doc.text('Score (1-3)', 300, sy + 6, { align: 'center', width: 80, lineBreak: false });
    doc.text('Profile', 390, sy + 6, { align: 'center', width: 130, lineBreak: false });
    doc.fillColor('#000000');

    sy += 20;
    skills.forEach((s, idx) => {
      ReportCardGenerator.ensureSpace(doc, 18);
      const bg = idx % 2 === 0 ? '#f8faff' : '#ffffff';
      doc.rect(50, sy, width, 18).fill(bg).stroke('#e2e8f0');
      doc.fontSize(9).font('Helvetica').fillColor('#000000');
      doc.text(s.name || '—', 60, sy + 5, { width: 220, lineBreak: false });
      doc.text(s.score != null ? Number(s.score).toFixed(1) : '—', 300, sy + 5, { align: 'center', width: 80, lineBreak: false });
      doc.text(s.descriptor || '—', 390, sy + 5, { align: 'center', width: 130, lineBreak: false });
      sy += 18;
    });
    doc.y = sy;

    if (skills.length === 0) {
      doc.rect(50, sy, width, 18).fill('#fef9c3');
      doc.fillColor('#92400e').fontSize(9).text('No generic skills evaluation entered for this term.', 60, sy + 5, { align: 'center', width, lineBreak: false });
      sy += 18;
      doc.y = sy;
    }

    // ── Comments & signatures ──
    sy += 12;
    doc.y = sy;
    ReportCardGenerator.ensureSpace(doc, 120);
    sy = ReportCardGenerator.drawCommentsAndSignatures(doc, data, doc.y);
    doc.y = sy + 20;

    // ── QR code (bottom-right) ──
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const qrY = pageH - 152;
    const qrSize = 80;
    const hasQR = await ReportCardGenerator.drawQRCode(doc, data, pageW - 127, qrY, qrSize);
    if (hasQR) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e3a5f')
        .text('Verification', pageW - 127, qrY - 12, { align: 'center', width: qrSize, lineBreak: false });
      if (data.verification?.note) {
        doc.font('Helvetica').fontSize(7).fillColor('#64748b')
          .text(data.verification.note, pageW - 127, qrY + qrSize + 6, { align: 'center', width: qrSize, lineBreak: false });
      }
    }
    doc.fillColor('#000000');

    doc.fillColor('#6b7280').fontSize(8).font('Helvetica')
      .text(`Generated: ${new Date().toLocaleDateString('en-UG', { dateStyle: 'full' })}  |  Ndugu Academy — NCDC Competency-Based Report Card`, 60, pageH - 64, { align: 'center', width: pageW - 120, lineBreak: false });
  }

  // ────────────────────────────────── UACE (S5–S6) ──────────────────────────
  static async buildUACE(doc, data) {
    const width = doc.page.width - 100;
    ReportCardGenerator.drawWatermark(doc);
    ReportCardGenerator.drawSchoolHeader(doc, data, 'UGANDA ADVANCED CERTIFICATE OF EDUCATION — STATEMENT OF RESULTS');
    ReportCardGenerator.drawStudentInfo(doc, data);

    const subjects = data.uaceSubjects || [];
    const aggregate = data.aggregate || {};

    // ── Combination breakdown ──
    const combY = doc.y + 8;
    doc.rect(50, combY, width, 40).fill('#eef2ff').stroke('#c7d2fe');
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#312e81')
      .text(`SUBJECT COMBINATION: ${data.combination?.name || '—'}`, 60, combY + 6, { lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor('#475569')
      .text(data.combination?.label || '', 60, combY + 22, { width: width - 20, lineBreak: false });
    doc.fillColor('#000000');
    doc.y = combY + 40;

    // ── Results table ──
    const tableY = combY + 50;
    const cols = { name: 50, code: 150, type: 210, marks: 300, grade: 390, points: 460 };
    const headers = ['Subject', 'Code', 'Type', 'Marks (%)', 'Grade', 'Points'];
    doc.rect(50, tableY, width, 22).fill('#1e3a5f');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    headers.forEach((h, i) => {
      doc.text(h, cols.name + (i === 0 ? 10 : i === 3 || i === 4 || i === 5 ? 20 : 0), tableY + 7, {
        width: 150, align: i === 0 ? 'left' : 'center', lineBreak: false,
      });
    });
    doc.fillColor('#000000');

    let rowY = tableY + 22;
    subjects.forEach((s, idx) => {
      ReportCardGenerator.ensureSpace(doc, 20);
      rowY = Math.max(doc.y, rowY);
      const bg = idx % 2 === 0 ? '#f8faff' : '#ffffff';
      doc.rect(50, rowY, width, 18).fill(bg).stroke('#e2e8f0');
      doc.fontSize(9).font('Helvetica').fillColor('#000000');
      doc.text(s.subject?.name || '—', 60, rowY + 5, { width: 100, lineBreak: false });
      doc.text(s.subject?.code || '—', cols.code + 8, rowY + 5, { width: 40, align: 'center', lineBreak: false });
      doc.text(s.type || 'principal', cols.type + 8, rowY + 5, { width: 55, align: 'center', lineBreak: false });
      doc.text(s.percentage != null ? `${Number(s.percentage).toFixed(1)}` : '—', cols.marks + 8, rowY + 5, { width: 50, align: 'center', lineBreak: false });

      const gradeColor = s.letterGrade === 'A' || s.letterGrade === 'B' ? '#16a34a'
        : s.letterGrade === 'C' || s.letterGrade === 'D' ? '#2563eb'
        : s.letterGrade === 'E' || s.letterGrade === 'O' ? '#d97706' : '#dc2626';
      doc.fillColor(gradeColor).font('Helvetica-Bold')
        .text(s.letterGrade || '—', cols.grade + 8, rowY + 5, { width: 40, align: 'center', lineBreak: false });
      doc.fillColor('#000000').font('Helvetica')
        .text(s.points != null ? String(s.points) : '—', cols.points + 8, rowY + 5, { width: 40, align: 'center', lineBreak: false });
      rowY += 18;
    });
    doc.y = rowY;

    if (subjects.length === 0) {
      doc.rect(50, rowY, width, 20).fill('#fef9c3');
      doc.fillColor('#92400e').fontSize(9).text('No results recorded for this term.', 60, rowY + 6, { align: 'center', width, lineBreak: false });
      rowY += 20;
      doc.y = rowY;
    }

    // ── Aggregate summary ──
    rowY += 12;
    ReportCardGenerator.ensureSpace(doc, 90);
    doc.rect(50, rowY, width, 72).fill('#fefce8').stroke('#fde047');
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#854d0e').text('TOTAL AGGREGATE', 60, rowY + 8, { lineBreak: false });
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#1e3a5f')
      .text(`${aggregate.total ?? 0}`, 60, rowY + 22, { lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor('#000000')
      .text(`out of ${aggregate.outOf ?? 20} points`, 110, rowY + 30, { lineBreak: false });
    doc.fillColor('#713f12').fontSize(8).font('Helvetica')
      .text(aggregate.breakdown || 'Best 3 principal subjects (18) + General Paper (1) + Subsidiary (1).', 60, rowY + 52, { width: width - 20, lineBreak: false });
    doc.fillColor('#000000');
    doc.y = rowY + 72;

    // ── Assessment scale legend ──
    const scaleY = rowY + 84;
    ReportCardGenerator.ensureSpace(doc, 46);
    doc.rect(50, scaleY, width, 38).fill('#f8fafc').stroke('#e2e8f0');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e3a5f').text('UACE POINTS SCALE', 60, scaleY + 5, { lineBreak: false });
    doc.fillColor('#334155').fontSize(8).font('Helvetica')
      .text('A(80+)=6  B(70-79)=5  C(60-69)=4  D(50-59)=3  E(40-49)=2  O(35-39)=1  F(<35)=0    |    General Paper: Pass=1, Subsidiary: Pass=1', 60, scaleY + 20, { width: width - 20, lineBreak: false });
    doc.fillColor('#000000');
    doc.y = scaleY + 38;

    // ── Comments & signatures ──
    const comY = scaleY + 48;
    ReportCardGenerator.ensureSpace(doc, 120);
    const sigEnd = ReportCardGenerator.drawCommentsAndSignatures(doc, data, Math.max(doc.y, comY));
    doc.y = sigEnd + 10;

    // ── QR code (bottom-right) ──
    const pageH = doc.page.height;
    const pageW = doc.page.width;
    const qrY = pageH - 152;
    const qrSize = 80;
    const hasQR = await ReportCardGenerator.drawQRCode(doc, data, pageW - 127, qrY, qrSize);
    if (hasQR) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e3a5f')
        .text('Verification', pageW - 127, qrY - 12, { align: 'center', width: qrSize, lineBreak: false });
      if (data.verification?.note) {
        doc.font('Helvetica').fontSize(7).fillColor('#64748b')
          .text(data.verification.note, pageW - 127, qrY + qrSize + 6, { align: 'center', width: qrSize, lineBreak: false });
      }
    }
    doc.fillColor('#000000');

    doc.fillColor('#6b7280').fontSize(8).font('Helvetica')
      .text(`Generated: ${new Date().toLocaleDateString('en-UG', { dateStyle: 'full' })}  |  Ndugu Academy — UACE Statement of Results`, 60, pageH - 64, { align: 'center', width: pageW - 120, lineBreak: false });
  }
}

module.exports = ReportCardGenerator;