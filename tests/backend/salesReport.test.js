const test = require("node:test");
const assert = require("node:assert/strict");
const { Writable } = require("node:stream");
const { downloadPdf, downloadCsv } = require("../../controllers/salesReportController");
const reportService = require("../../services/reportService");

function createMockResponse() {
  const chunks = [];
  const headers = {};
  let statusCode = 200;
  let sentBody = null;
  let ended = false;

  const res = new Writable({
    write(chunk, enc, cb) {
      chunks.push(chunk);
      cb();
    },
    final(cb) {
      ended = true;
      cb();
    }
  });

  res.headers = headers;
  res.setHeader = (key, value) => {
    headers[key] = value;
  };
  res.getHeader = (key) => headers[key];
  res.status = (code) => {
    statusCode = code;
    return {
      send: (body) => {
        sentBody = body;
      }
    };
  };

  const originalEnd = res.end.bind(res);
  res.end = (...args) => {
    ended = true;
    return originalEnd(...args);
  };

  return {
    res,
    getChunks: () => chunks,
    getBuffer: () => Buffer.concat(chunks),
    getHeaders: () => headers,
    getStatusCode: () => statusCode,
    getSentBody: () => sentBody,
    isEnded: () => ended
  };
}

test("salesReportController.downloadPdf generates valid multi-page PDF for account with sales", async () => {
  // Generate mock data spanning multiple pages
  const ledger = [];
  for (let i = 1; i <= 60; i++) {
    ledger.push({
      saleId: i,
      date: "2026-03-01",
      customer: `Customer ${i}`,
      recordedBy: "Rohan",
      paymentMethod: "Cash",
      status: "completed",
      product: `Product ${i % 5}`,
      category: "Electronics",
      qty: 1,
      unitPrice: 100,
      lineTotal: 100
    });
  }

  const originalGetData = reportService.getSalesReportData;
  reportService.getSalesReportData = async () => ({
    businessName: "Rohan Demo Business",
    ledger,
    summary: {
      numSales: 60,
      itemsSold: 60,
      totalRevenue: 6000,
      avgSale: 100
    },
    topProducts: [{ name: "Product 1", revenue: 1200, qty: 12 }],
    byCategory: [{ category: "Electronics", revenue: 6000 }],
    byPayment: [{ method: "Cash", revenue: 6000 }]
  });

  try {
    const { res, getBuffer, getHeaders } = createMockResponse();
    const req = {
      query: { from: "2026-01-01", to: "2026-03-31" },
      session: { user: { business_id: 1, name: "Rohan" } }
    };

    await downloadPdf(req, res);
    await new Promise((resolve) => res.on("finish", resolve));

    const buffer = getBuffer();
    assert.ok(buffer.length > 0, "PDF buffer should not be empty");
    assert.equal(buffer.slice(0, 4).toString(), "%PDF", "PDF should start with %PDF header");
    assert.equal(getHeaders()["Content-Type"], "application/pdf");
    assert.equal(
      getHeaders()["Content-Disposition"],
      'attachment; filename="sales-report_2026-01-01_to_2026-03-31.pdf"'
    );
  } finally {
    reportService.getSalesReportData = originalGetData;
  }
});

test("salesReportController.downloadPdf handles empty sales report gracefully", async () => {
  const originalGetData = reportService.getSalesReportData;
  reportService.getSalesReportData = async () => ({
    businessName: "Mohit Empty Business",
    ledger: [],
    summary: {
      numSales: 0,
      itemsSold: 0,
      totalRevenue: 0,
      avgSale: 0
    },
    topProducts: [],
    byCategory: [],
    byPayment: []
  });

  try {
    const { res, getBuffer, getHeaders } = createMockResponse();
    const req = {
      query: { from: "2026-01-01", to: "2026-03-31" },
      session: { user: { business_id: 2, name: "Mohit" } }
    };

    await downloadPdf(req, res);
    await new Promise((resolve) => res.on("finish", resolve));

    const buffer = getBuffer();
    assert.ok(buffer.length > 0, "PDF buffer should not be empty");
    assert.equal(buffer.slice(0, 4).toString(), "%PDF", "PDF should start with %PDF header");
    assert.equal(getHeaders()["Content-Type"], "application/pdf");
  } finally {
    reportService.getSalesReportData = originalGetData;
  }
});

test("salesReportController.downloadPdf validates date range", async () => {
  const { res, getStatusCode, getSentBody } = createMockResponse();
  const req = {
    query: { from: "2026-05-01", to: "2026-01-01" }, // from > to
    session: { user: { business_id: 1 } }
  };

  await downloadPdf(req, res);
  assert.equal(getStatusCode(), 400);
  assert.equal(getSentBody(), "From date cannot be after to date.");
});

test("salesReportController.downloadPdf passes error to next() when headers not sent", async () => {
  const originalGetData = reportService.getSalesReportData;
  reportService.getSalesReportData = async () => {
    throw new Error("DB connection failure");
  };

  try {
    const { res } = createMockResponse();
    const req = {
      query: { from: "2026-01-01", to: "2026-03-31" },
      session: { user: { business_id: 1 } }
    };
    let caughtError = null;
    await downloadPdf(req, res, (err) => {
      caughtError = err;
    });
    assert.ok(caughtError, "Should pass error to next()");
    assert.equal(caughtError.message, "DB connection failure");
  } finally {
    reportService.getSalesReportData = originalGetData;
  }
});

test("salesReportController.downloadPdf does not call next() or resend headers if headers were already sent", async () => {
  const originalGetData = reportService.getSalesReportData;
  reportService.getSalesReportData = async () => ({
    businessName: "Test",
    summary: { numSales: 1, itemsSold: 1, totalRevenue: 10, avgSale: 10 },
    ledger: [{
      saleId: 1,
      date: "2026-03-01",
      customer: "A",
      paymentMethod: "Cash",
      status: "completed",
      lineTotal: 10
    }],
    topProducts: [],
    byCategory: [],
    byPayment: []
  });

  try {
    const { res, isEnded } = createMockResponse();
    res.headersSent = true;
    const req = {
      query: { from: "2026-01-01", to: "2026-03-31" },
      session: { user: { business_id: 1 } }
    };

    let nextCalled = false;
    await downloadPdf(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false, "Should not call next() when headersSent is true");
  } finally {
    reportService.getSalesReportData = originalGetData;
  }
});

