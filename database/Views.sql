
-- Overall Sales Summary
-- CREATE OR REPLACE VIEW vw_sales_summary AS
SELECT
    COUNT(*) AS total_orders,
    SUM(total_amount) AS total_revenue,
    AVG(total_amount) AS average_order_value
FROM sales
WHERE status = 'completed';
SELECT * FROM vw_sales_summary;

-- Order Status Summary
CREATE OR REPLACE VIEW vw_order_status AS
SELECT
    status,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_amount
FROM sales
GROUP BY status;
SELECT * FROM vw_order_status;

-- Monthly Sales
CREATE OR REPLACE VIEW vw_monthly_sales AS
SELECT
    YEAR(created_at) AS sales_year,
    MONTH(created_at) AS sales_month,
    DATE_FORMAT(created_at, '%Y-%m') AS month,
    COUNT(*) AS total_orders,
    SUM(total_amount) AS revenue,
    AVG(total_amount) AS average_order_value
FROM sales
WHERE status = 'completed'
GROUP BY YEAR(created_at), MONTH(created_at),DATE_FORMAT(created_at, '%Y-%m')
ORDER BY sales_year,sales_month;
SELECT * FROM vw_monthly_sales;

-- Product Performance
CREATE OR REPLACE VIEW vw_product_performance AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    p.category,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.subtotal) AS revenue,
    SUM(oi.quantity * p.cost) AS total_cost,
    SUM(oi.subtotal - (oi.quantity * p.cost)) AS profit
FROM order_items oi
JOIN sales s ON oi.sale_id = s.id
JOIN products p ON oi.product_id = p.id
WHERE s.status = 'completed'
GROUP BY p.id, p.name, p.sku, p.category;
SELECT * FROM vw_product_performance;

-- Category Performance
CREATE OR REPLACE VIEW vw_category_performance AS
SELECT
    p.category,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.subtotal) AS revenue,
    SUM(oi.quantity * p.cost) AS total_cost,
    SUM(oi.subtotal - (oi.quantity * p.cost)) AS profit
FROM order_items oi
JOIN sales s ON oi.sale_id = s.id
JOIN products p ON oi.product_id = p.id
WHERE s.status = 'completed'
GROUP BY p.category;
SELECT * FROM vw_category_performance;

-- Customer Performance
CREATE OR REPLACE VIEW vw_customer_performance AS
SELECT
    c.id AS customer_id,
    c.name AS customer_name,
    c.email,
    COUNT(s.id) AS total_orders,
    SUM(s.total_amount) AS total_spent,
    AVG(s.total_amount) AS average_order_value,
    MAX(s.created_at) AS last_order_date
FROM customers c
JOIN sales s ON c.id = s.customer_id
WHERE s.status = 'completed'
GROUP BY c.id, c.name, c.email;
SELECT * FROM vw_customer_performance ORDER BY total_spent DESC;

-- Inventory Alerts
CREATE OR REPLACE VIEW vw_inventory_alerts AS
SELECT
    id AS product_id,
    name AS product_name,
    sku, category, stock_qty, reorder_level,
    CASE
        WHEN stock_qty = 0 THEN 'OUT OF STOCK'
        WHEN stock_qty <= reorder_level THEN 'LOW STOCK'
        ELSE 'NORMAL'
    END AS stock_status
FROM products;
SELECT * FROM vw_inventory_alerts ;

-- Payment Method Analysis
CREATE OR REPLACE VIEW vw_payment_analysis AS
SELECT
    payment_method,
    COUNT(*) AS total_orders,
    SUM(total_amount) AS revenue,
    AVG(total_amount) AS average_order_value
FROM sales
WHERE status = 'completed'
GROUP BY payment_method;
SELECT * FROM vw_payment_analysis ORDER BY revenue DESC;

-- Profitabililty Summary
CREATE OR REPLACE VIEW vw_profit_summary AS
SELECT
    SUM(oi.subtotal) AS total_revenue,
    SUM(oi.quantity * p.cost) AS total_cost,
    SUM(oi.subtotal - (oi.quantity * p.cost)) AS total_profit,
    ROUND(
        SUM(oi.subtotal - (oi.quantity * p.cost))
        / NULLIF(SUM(oi.subtotal), 0) * 100,
        2
    ) AS profit_margin_percentage
FROM order_items oi JOIN sales s ON oi.sale_id = s.id
JOIN products p ON oi.product_id = p.id
WHERE s.status = 'completed';
SELECT * FROM vw_profit_summary;

-- Low Performing Products
CREATE OR REPLACE VIEW vw_product_insights AS
SELECT p.id AS product_id, p.name AS product_name, p.category,
    COALESCE(SUM(
        CASE
            WHEN s.status = 'completed'
            THEN oi.quantity
            ELSE 0
        END), 0) AS units_sold,
    COALESCE(SUM(
        CASE
            WHEN s.status = 'completed'
            THEN oi.subtotal
            ELSE 0
        END), 0) AS revenue,
    p.stock_qty,p.reorder_level,
    CASE
        WHEN p.stock_qty <= p.reorder_level
             AND COALESCE(SUM(
                 CASE
                     WHEN s.status = 'completed'
                     THEN oi.quantity
                     ELSE 0
                 END
             ), 0) > 0
            THEN 'REORDER SOON'

        WHEN COALESCE(SUM(
                 CASE
                     WHEN s.status = 'completed'
                     THEN oi.quantity
                     ELSE 0
                 END), 0) = 0
            THEN 'LOW SALES'
               ELSE 'NORMAL'
    END AS business_status
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN sales s ON oi.sale_id = s.id
GROUP BY p.id, p.name, p.category, p.stock_qty, p.reorder_level;
Select * FROM vw_product_insights;