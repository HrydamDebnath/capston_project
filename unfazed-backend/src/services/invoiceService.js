const PDFDocument = require('pdfkit');
const { format } = require('date-fns');
const { formatMoney } = require('../utils/money');

function splitGst(amount, ratePercent) {
  const taxable = Math.round((amount * 100) / (100 + ratePercent));
  const gst = amount - taxable;
  const cgst = Math.floor(gst / 2);
  return { taxable, gst, cgst, sgst: gst - cgst };
}

function writeRow(doc, y, label, value, options = {}) {
  doc.font(options.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(options.size || 10).fillColor('#1b2236');
  doc.text(label, 50, y, { width: 330 });
  doc.text(value, 380, y, { width: 165, align: 'right' });
}

function streamInvoice({ payment, therapist, client }, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Invoice ${payment.invoiceNumber}` } });
  doc.pipe(stream);

  const { taxable, cgst, sgst } = splitGst(payment.amount, payment.gstRatePercent);
  const halfRate = payment.gstRatePercent / 2;

  doc.rect(0, 0, doc.page.width, 8).fill('#3d4fd9');

  doc.fillColor('#1b2236').font('Helvetica-Bold').fontSize(22).text('Tax Invoice', 50, 50);
  doc.font('Helvetica').fontSize(10).fillColor('#5b6477');
  doc.text(`Invoice no. ${payment.invoiceNumber}`, 50, 82);
  doc.text(`Date ${format(payment.paidAt || payment.createdAt, 'dd MMM yyyy')}`, 50, 97);
  doc.text(`Reference ${payment.gatewayTransactionId || payment.gatewayOrderId}`, 50, 112);

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1b2236').text(therapist.name, 350, 50, { width: 195, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor('#5b6477');
  if (therapist.businessAddress) doc.text(therapist.businessAddress, 350, 66, { width: 195, align: 'right' });
  if (therapist.gstin) doc.text(`GSTIN ${therapist.gstin}`, { width: 195, align: 'right' });
  doc.text(therapist.email, { width: 195, align: 'right' });

  doc.moveTo(50, 150).lineTo(545, 150).strokeColor('#e3e7ef').stroke();

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#5b6477').text('Billed to', 50, 168);
  doc.font('Helvetica').fontSize(11).fillColor('#1b2236').text(client.name, 50, 183);
  doc.fontSize(10).fillColor('#5b6477').text(client.email, 50, 199);
  if (client.phone) doc.text(client.phone, 50, 214);

  doc.rect(50, 250, 495, 26).fill('#f3f5f9');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#5b6477');
  doc.text('Description', 60, 259);
  doc.text('Amount', 380, 259, { width: 155, align: 'right' });

  writeRow(doc, 292, payment.description || 'Therapy session', formatMoney(taxable, payment.currency));
  writeRow(doc, 316, `CGST @ ${halfRate}%`, formatMoney(cgst, payment.currency));
  writeRow(doc, 338, `SGST @ ${halfRate}%`, formatMoney(sgst, payment.currency));

  doc.moveTo(50, 366).lineTo(545, 366).strokeColor('#e3e7ef').stroke();
  writeRow(doc, 378, 'Total paid', formatMoney(payment.amount, payment.currency), { bold: true, size: 12 });

  doc.font('Helvetica').fontSize(9).fillColor('#5b6477');
  doc.text('Amounts are inclusive of GST. This is a computer generated invoice and does not require a signature.', 50, 440, { width: 495 });
  doc.text('Issued through Unfazed.', 50, 470);

  doc.end();
}

module.exports = { streamInvoice, splitGst };
