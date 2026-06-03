/** CSV (dependency-free) and PDF (pdfkit) exporters. */
const PDFDocument = require('pdfkit');

/** Convert an array of flat objects to a CSV string. */
function toCsv(rows) {
  if (!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(','));
  return lines.join('\n');
}

/**
 * Render a PDF buffer from a title and an ordered list of sections.
 * Each section: { heading: string, rows: object[] } — rows printed as a table.
 */
function toPdf({ title, subtitle, sections }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).fillColor('#b91c1c').text('TZW LTD', { continued: false });
    doc.fontSize(14).fillColor('#111').text(title);
    if (subtitle) doc.fontSize(10).fillColor('#555').text(subtitle);
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor('#888').text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown(1);

    for (const section of sections) {
      doc.fontSize(12).fillColor('#b91c1c').text(section.heading);
      doc.moveDown(0.3);
      doc.fillColor('#111').fontSize(9);

      if (!section.rows || !section.rows.length) {
        doc.fillColor('#888').text('No records.').fillColor('#111');
        doc.moveDown(0.8);
        continue;
      }
      const headers = Object.keys(section.rows[0]);
      doc.font('Helvetica-Bold').text(headers.join('   |   '));
      doc.font('Helvetica');
      for (const row of section.rows) {
        const line = headers.map((h) => (row[h] === null || row[h] === undefined ? '' : String(row[h]))).join('   |   ');
        doc.text(line);
      }
      doc.moveDown(0.8);
    }

    doc.end();
  });
}

module.exports = { toCsv, toPdf };
