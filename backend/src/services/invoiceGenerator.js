const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class InvoiceGenerator {
  static generateInvoice(invoiceData, filePath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ bufferPages: true });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // ─────────── HEADER ───────────
        doc.fontSize(18).font('Helvetica-Bold').text('SCHOOL FEES INVOICE', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(invoiceData.schoolName || 'Ndugu Academy', { align: 'center' });
        doc.fontSize(9).fillColor('#666').text(invoiceData.schoolAddress || 'Kampala, Uganda', { align: 'center' });
        doc.fillColor('#000');

        doc.moveTo(50, 80).lineTo(545, 80).stroke();

        // ─────────── INVOICE DETAILS ───────────
        doc.fontSize(11).font('Helvetica-Bold').text('Invoice Details', 50, 100);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 50, 125);
        doc.text(`Academic Year: ${invoiceData.academicYear}`, 50, 145);
        doc.text(`Term: ${invoiceData.term}`, 50, 165);

        // ─────────── STUDENT INFO ───────────
        doc.fontSize(11).font('Helvetica-Bold').text('Student Information', 50, 200);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Name: ${invoiceData.studentName}`, 50, 225);
        doc.text(`Student ID: ${invoiceData.studentId}`, 50, 245);
        doc.text(`Class: ${invoiceData.className}`, 50, 265);
        doc.text(`Parent/Guardian: ${invoiceData.parentName}`, 50, 285);
        doc.text(`Contact: ${invoiceData.parentPhone}`, 50, 305);

        // ─────────── FEE BREAKDOWN ───────────
        doc.fontSize(11).font('Helvetica-Bold').text('Fee Breakdown', 50, 340);
        
        const tableTop = 360;
        const col1 = 50, col2 = 350, col3 = 450;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Description', col1, tableTop);
        doc.text('Amount (UGX)', col2, tableTop);
        doc.text('Total', col3, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

        let currentY = tableTop + 25;
        doc.font('Helvetica');

        if (invoiceData.feeBreakdown) {
          invoiceData.feeBreakdown.forEach(fee => {
            doc.text(fee.description, col1, currentY);
            doc.text(`UGX ${fee.amount.toLocaleString()}`, col2, currentY);
            currentY += 20;
          });
        }

        doc.moveTo(50, currentY).lineTo(545, currentY).stroke();
        currentY += 15;

        // ─────────── SUMMARY ───────────
        doc.font('Helvetica-Bold').fontSize(11);
        doc.text('Summary', 50, currentY);
        currentY += 25;

        doc.font('Helvetica').fontSize(10);
        doc.text(`Total Amount Due: UGX ${invoiceData.totalAmount.toLocaleString()}`, 50, currentY);
        currentY += 20;
        doc.text(`Amount Already Paid: UGX ${invoiceData.amountPaid.toLocaleString()}`, 50, currentY);
        currentY += 20;
        
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#d32f2f');
        doc.text(`Outstanding Balance: UGX ${invoiceData.outstandingBalance.toLocaleString()}`, 50, currentY);
        doc.fillColor('#000');

        // ─────────── PAYMENT HISTORY ───────────
        currentY += 40;
        doc.fontSize(11).font('Helvetica-Bold').text('Payment History', 50, currentY);
        
        const historyTop = currentY + 25;
        const hCol1 = 50, hCol2 = 150, hCol3 = 250, hCol4 = 350, hCol5 = 450;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Date', hCol1, historyTop);
        doc.text('Receipt', hCol2, historyTop);
        doc.text('Amount (UGX)', hCol3, historyTop);
        doc.text('Method', hCol4, historyTop);
        doc.text('Status', hCol5, historyTop);

        doc.moveTo(50, historyTop + 15).lineTo(545, historyTop + 15).stroke();

        let historyY = historyTop + 25;
        doc.font('Helvetica').fontSize(9);

        if (invoiceData.paymentHistory && invoiceData.paymentHistory.length > 0) {
          invoiceData.paymentHistory.forEach(payment => {
            doc.text(new Date(payment.paymentDate).toLocaleDateString(), hCol1, historyY);
            doc.text(payment.receiptNumber, hCol2, historyY);
            doc.text(`UGX ${payment.amountPaid.toLocaleString()}`, hCol3, historyY);
            doc.text(payment.paymentMethod, hCol4, historyY);
            doc.text('Paid', hCol5, historyY);
            historyY += 15;
          });
        } else {
          doc.text('No payments recorded yet', hCol1, historyY);
        }

        // ─────────── PAYMENT METHODS ───────────
        currentY = historyY + 30;
        doc.fontSize(11).font('Helvetica-Bold').text('Payment Methods Accepted', 50, currentY);
        currentY += 20;
        doc.fontSize(10).font('Helvetica');
        doc.text('• MTN Mobile Money', 50, currentY);
        currentY += 15;
        doc.text('• Airtel Money', 50, currentY);
        currentY += 15;
        doc.text('• Bank Deposit', 50, currentY);
        currentY += 15;
        doc.text('• Cash at School Office', 50, currentY);

        // ─────────── FOOTER ───────────
        doc.fontSize(9).fillColor('#999');
        doc.text('This is an automatically generated invoice. Please contact the school office for inquiries.', 50, 750, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = InvoiceGenerator;
