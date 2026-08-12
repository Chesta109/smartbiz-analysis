const DEFAULT_PAGINATION = { page: 1, limit: 20, total: 0, totalPages: 0 };

const DEFAULT_TODAY_SUMMARY = {
  sales_today: 0,
  revenue_today: 0,
  items_sold: 0,
  avg_sale_value: 0,
};

function customerFilters(query = {}) {
  return { search: query.search || "" };
}

function productFilters(query = {}) {
  return {
    search: query.search || "",
    category: query.category || "",
    stockLevel: query.stockLevel || "",
  };
}

function defaultFilters(query = {}) {
  return {
    search: query.search || "",
    category: query.category || "",
    stockLevel: query.stockLevel || "",
    ...query,
  };
}

/** Safe view locals merged with route-specific data (explicit data wins). */
function buildViewLocals(req, data = {}) {
  const query = req.query || {};

  return {
    title: data.title ?? "SmartBiz Insight",
    currentPath: req.path,
    user: req.session?.user ?? null,
    filters: data.filters ?? defaultFilters(query),
    pagination: data.pagination ?? { ...DEFAULT_PAGINATION },
    customers: data.customers ?? [],
    products: data.products ?? [],
    sales: data.sales ?? [],
    recentSales: data.recentSales ?? [],
    todaySummary: data.todaySummary ?? { ...DEFAULT_TODAY_SUMMARY },
    reports: data.reports ?? [],
    metrics: data.metrics ?? [],
    lowStockItems: data.lowStockItems ?? [],
    recommendations: data.recommendations ?? [],
    topProducts: data.topProducts ?? [],
    revenueTrend: data.revenueTrend ?? [],
    history: data.history ?? [],
    customer: data.customer ?? null,
  };
}

function renderView(req, res, view, data = {}) {
  res.render(view, buildViewLocals(req, data));
}

module.exports = {
  DEFAULT_PAGINATION,
  DEFAULT_TODAY_SUMMARY,
  customerFilters,
  productFilters,
  defaultFilters,
  buildViewLocals,
  renderView,
};
