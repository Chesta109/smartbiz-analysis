import re

with open('controllers/analyticsController.js', 'r') as f:
    text = f.read()

text = re.sub(r'getFilters\(req\);', 'getFilters(req);\n        const businessId = req.session.user.business_id;', text)
text = re.sub(r'(analyticsService\.\w+\(\s*[^)]*?)\s*\)', r'\1, businessId)', text)
text = text.replace('getCategories(, businessId)', 'getCategories(businessId)')
with open('controllers/analyticsController.js', 'w') as f:
    f.write(text)

with open('controllers/dashboardController.js', 'r') as f:
    d_text = f.read()

d_text = re.sub(r'async function index\(req, res\) \{', 'async function index(req, res) {\n  const businessId = req.session.user.business_id;', d_text)
d_text = d_text.replace('getSummary()', 'getSummary("30", "all", businessId)')
d_text = d_text.replace('getProfitSummary()', 'getProfitSummary("30", "all", businessId)')
d_text = d_text.replace('runForecast()', 'runForecast(businessId)')

# replace the pool.query
q_old = """pool.query(
      `
      SELECT
        name,
        stock_qty,
        reorder_level
      FROM products
      WHERE stock_qty <= reorder_level
      ORDER BY stock_qty ASC
      LIMIT 5
      `
    ),"""

q_new = """pool.query(
      `
      SELECT
        name,
        stock_qty,
        reorder_level
      FROM products
      WHERE stock_qty <= reorder_level AND business_id = ?
      ORDER BY stock_qty ASC
      LIMIT 5
      `, [businessId]
    ),"""

d_text = d_text.replace(q_old, q_new)
with open('controllers/dashboardController.js', 'w') as f:
    f.write(d_text)

print("Done updating controllers.")
