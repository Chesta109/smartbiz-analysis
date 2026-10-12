const pool = require("../config/db");

async function getSalesReportData(from, to, businessId = null) {
  let ledgerQuery = `
    SELECT 
      s.id AS saleId,
      DATE_FORMAT(s.created_at, '%Y-%m-%d') AS date,
      DATE_FORMAT(s.created_at, '%H:%i:%s') AS time,
      COALESCE(c.name, 'Walk-in Customer') AS customer,
      u.name AS recordedBy,
      s.payment_method AS paymentMethod,
      s.status,
      p.name AS product,
      p.category,
      oi.quantity AS qty,
      oi.unit_price AS unitPrice,
      (oi.quantity * oi.unit_price) AS lineTotal
    FROM sales s
    JOIN order_items oi ON s.id = oi.sale_id
    JOIN products p ON oi.product_id = p.id
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.created_at >= ? AND s.created_at < DATE_ADD(?, INTERVAL 1 DAY)
  `;
  
  const params = [from, to];
  
  if (businessId) {
    ledgerQuery += " AND s.business_id = ?";
    params.push(businessId);
  }
  
  ledgerQuery += " ORDER BY s.created_at ASC";
  
  const [ledger] = await pool.query(ledgerQuery, params);
  
  let businessName = null;
  if (businessId) {
    try {
      const [bRows] = await pool.query("SELECT name FROM businesses WHERE id = ?", [businessId]);
      if (bRows[0]) businessName = bRows[0].name;
    } catch(err) {
      // businesses table might not exist yet before migration
    }
  }
  
  const completedSales = ledger.filter(r => r.status === 'completed');
  
  const uniqueSaleIds = new Set(completedSales.map(r => r.saleId));
  const numSales = uniqueSaleIds.size;
  const itemsSold = completedSales.reduce((acc, curr) => acc + curr.qty, 0);
  const totalRevenue = completedSales.reduce((acc, curr) => acc + curr.lineTotal, 0);
  const avgSale = numSales > 0 ? totalRevenue / numSales : 0;
  
  const byCategoryMap = new Map();
  const byPaymentMap = new Map();
  const topProductsMap = new Map();

  completedSales.forEach(r => {
    byCategoryMap.set(r.category, (byCategoryMap.get(r.category) || 0) + r.lineTotal);
    byPaymentMap.set(r.paymentMethod, (byPaymentMap.get(r.paymentMethod) || 0) + r.lineTotal);
    
    if (!topProductsMap.has(r.product)) topProductsMap.set(r.product, { name: r.product, revenue: 0, qty: 0 });
    const p = topProductsMap.get(r.product);
    p.revenue += r.lineTotal;
    p.qty += r.qty;
  });

  const byCategory = Array.from(byCategoryMap.entries())
    .map(([category, revenue]) => ({ category, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
    
  const byPayment = Array.from(byPaymentMap.entries())
    .map(([method, revenue]) => ({ method, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
    
  const topProducts = Array.from(topProductsMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    businessName,
    ledger,
    summary: { numSales, itemsSold, totalRevenue, avgSale },
    byCategory,
    byPayment,
    topProducts
  };
}

module.exports = { getSalesReportData };
