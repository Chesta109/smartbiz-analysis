const reportService = require('../services/reportService');
const { createObjectCsvStringifier } = require('csv-writer');
const PDFDocument = require('pdfkit');

function validateDates(req, res) {
  const { from, to } = req.query;
  if (!from || !to) {
    res.status(400).send("Both from and to dates are required.");
    return null;
  }
  const f = new Date(from);
  const t = new Date(to);
  if (isNaN(f) || isNaN(t)) {
    res.status(400).send("Invalid date format.");
    return null;
  }
  if (f > t) {
    res.status(400).send("From date cannot be after to date.");
    return null;
  }
  const diff = (t - f) / (1000 * 60 * 60 * 24);
  if (diff > 366) {
    res.status(400).send("Date range cannot exceed 366 days.");
    return null;
  }
  return { from, to, f, t };
}

async function downloadCsv(req, res) {
  const dates = validateDates(req, res);
  if (!dates) return;

  const data = await reportService.getSalesReportData(dates.from, dates.to, req.session?.user?.business_id);
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="sales-report_${dates.from}_to_${dates.to}.csv"`);
  res.write('\uFEFF'); // UTF-8 BOM

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'saleId', title: 'Sale ID' },
      { id: 'date', title: 'Date' },
      { id: 'time', title: 'Time' },
      { id: 'customer', title: 'Customer' },
      { id: 'recordedBy', title: 'Recorded by' },
      { id: 'paymentMethod', title: 'Payment method' },
      { id: 'status', title: 'Status' },
      { id: 'product', title: 'Product' },
      { id: 'category', title: 'Category' },
      { id: 'qty', title: 'Qty' },
      { id: 'unitPrice', title: 'Unit price' },
      { id: 'lineTotal', title: 'Line total' }
    ]
  });

  res.write(csvStringifier.getHeaderString());
  
  const escapeCell = (val) => {
    if (typeof val === 'string' && /^[=+\-@]/.test(val)) return "'" + val;
    return val;
  };

  const records = data.ledger.map(row => ({
    saleId: escapeCell(String(row.saleId)),
    date: escapeCell(row.date),
    time: escapeCell(row.time),
    customer: escapeCell(row.customer),
    recordedBy: escapeCell(row.recordedBy),
    paymentMethod: escapeCell(row.paymentMethod),
    status: escapeCell(row.status),
    product: escapeCell(row.product),
    category: escapeCell(row.category),
    qty: escapeCell(String(row.qty)),
    unitPrice: escapeCell(String(row.unitPrice)),
    lineTotal: escapeCell(String(row.lineTotal))
  }));

  if (records.length > 0) {
    res.write(csvStringifier.stringifyRecords(records));
  }
  res.end();
}

async function downloadPdf(req, res) {
  const dates = validateDates(req, res);
  if (!dates) return;

  const businessId = req.session?.user?.business_id;
  const data = await reportService.getSalesReportData(dates.from, dates.to, businessId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="sales-report_${dates.from}_to_${dates.to}.pdf"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  
  const appName = data.businessName || 'SmartBiz Insight';

  // Title
  doc.fontSize(20).text(`${appName} - Sales Report`, { align: 'center' });
  doc.fontSize(12).text(`Date Range: ${dates.from} to ${dates.to}`, { align: 'center' });
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(2);

  if (data.summary.numSales === 0) {
    doc.fontSize(14).text("No sales in this date range.", { align: 'center' });
    doc.end();
    return;
  }

  // Summary
  doc.fontSize(14).text('Summary', { underline: true });
  doc.fontSize(10);
  doc.text(`Number of sales: ${data.summary.numSales}`);
  doc.text(`Items sold: ${data.summary.itemsSold}`);
  doc.text(`Total revenue: Rs. ${Number(data.summary.totalRevenue).toLocaleString('en-IN', {maximumFractionDigits: 2})}`);
  doc.text(`Average sale value: Rs. ${Number(data.summary.avgSale).toLocaleString('en-IN', {maximumFractionDigits: 2})}`);
  doc.moveDown(2);

  // Breakdown - Top Products
  doc.fontSize(14).text('Top 10 Products by Revenue', { underline: true });
  doc.fontSize(10);
  data.topProducts.forEach((p, i) => {
    doc.text(`${i+1}. ${p.name} - Rs. ${Number(p.revenue).toLocaleString('en-IN', {maximumFractionDigits: 2})} (${p.qty} items)`);
  });
  doc.moveDown(2);

  // Breakdown - Category
  doc.fontSize(14).text('Revenue by Category', { underline: true });
  doc.fontSize(10);
  data.byCategory.forEach(c => {
    doc.text(`${c.category || 'Uncategorized'}: Rs. ${Number(c.revenue).toLocaleString('en-IN', {maximumFractionDigits: 2})}`);
  });
  doc.moveDown(2);

  // Breakdown - Payment Method
  doc.fontSize(14).text('Revenue by Payment Method', { underline: true });
  doc.fontSize(10);
  data.byPayment.forEach(p => {
    doc.text(`${p.method || 'Unknown'}: Rs. ${Number(p.revenue).toLocaleString('en-IN', {maximumFractionDigits: 2})}`);
  });
  doc.moveDown(2);

  doc.addPage();
  doc.fontSize(14).text('Transaction Ledger', { underline: true });
  doc.fontSize(8);
  doc.moveDown(1);
  
  // Footnote
  doc.text("Note: Revenue totals and breakdowns count only 'completed' sales. This ledger lists all statuses.", { color: 'grey' });
  doc.moveDown(1);
  doc.fillColor('black');

  const startY = doc.y;
  let currentY = startY;
  
  const drawHeader = (y) => {
    doc.font('Helvetica-Bold');
    doc.text('Sale ID', 50, y);
    doc.text('Date', 100, y);
    doc.text('Customer', 160, y, { width: 100 });
    doc.text('Payment', 270, y);
    doc.text('Status', 330, y);
    doc.text('Total (Rs.)', 400, y);
    doc.font('Helvetica');
    return y + 15;
  };

  currentY = drawHeader(currentY);

  const salesMap = new Map();
  data.ledger.forEach(row => {
    if (!salesMap.has(row.saleId)) {
      salesMap.set(row.saleId, {
        id: row.saleId,
        date: row.date,
        customer: row.customer,
        payment: row.paymentMethod,
        status: row.status,
        total: 0
      });
    }
    salesMap.get(row.saleId).total += Number(row.lineTotal);
  });
  
  const salesList = Array.from(salesMap.values());

  salesList.forEach((sale) => {
    if (currentY > 700) {
      doc.addPage();
      currentY = drawHeader(50);
    }
    doc.text(String(sale.id), 50, currentY);
    doc.text(sale.date, 100, currentY);
    doc.text(sale.customer || 'Walk-in Customer', 160, currentY, { width: 100, height: 10, lineBreak: false, ellipsis: true });
    doc.text(sale.payment || 'Unknown', 270, currentY);
    doc.text(sale.status, 330, currentY);
    doc.text(Number(sale.total).toLocaleString('en-IN', {maximumFractionDigits: 2}), 400, currentY);
    currentY += 15;
  });

  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.text(`Page ${i + 1} of ${pages.count}`, 0, doc.page.height - 30, { align: 'center' });
  }

  doc.end();
}

module.exports = { downloadCsv, downloadPdf };
