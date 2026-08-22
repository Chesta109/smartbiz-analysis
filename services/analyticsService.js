const pool = require("../config/db");


/* =========================================================
   DATE FILTER
   ========================================================= */

function getDateFilter(period) {

    const value = String(period || "30");

    if (["7", "30", "90"].includes(value)) {

        return {
            condition: `
                s.created_at >= DATE_SUB(
                    NOW(),
                    INTERVAL ${Number(value)} DAY
                )
            `,
            params: []
        };
    }


    if (value === "this_month") {

        return {
            condition: `
                s.created_at >= DATE_FORMAT(
                    CURDATE(),
                    '%Y-%m-01'
                )
            `,
            params: []
        };
    }


    if (value === "last_month") {

        return {
            condition: `
                s.created_at >= DATE_FORMAT(
                    DATE_SUB(
                        CURDATE(),
                        INTERVAL 1 MONTH
                    ),
                    '%Y-%m-01'
                )

                AND s.created_at < DATE_FORMAT(
                    CURDATE(),
                    '%Y-%m-01'
                )
            `,
            params: []
        };
    }


    if (value === "this_year") {

        return {
            condition: `
                s.created_at >= DATE_FORMAT(
                    CURDATE(),
                    '%Y-01-01'
                )
            `,
            params: []
        };
    }


    return {
        condition: "1 = 1",
        params: []
    };
}

function getCategoryFilter(category) {

    const value = String(category || "all").trim();

    if (
        !value ||
        value.toLowerCase() === "all"
    ) {
        return {
            condition: "1 = 1",
            params: []
        };
    }

    return {
        condition: "p.category = ?",
        params: [value]
    };
}

function getCombinedFilters(period, category) {

    const dateFilter =
        getDateFilter(period);

    const categoryFilter =
        getCategoryFilter(category);

    return {
        condition: `
            ${dateFilter.condition}
            AND ${categoryFilter.condition}
        `,
        params: [
            ...dateFilter.params,
            ...categoryFilter.params
        ]
    };
}

/* =========================================================
   SUMMARY
   Original logic:
   WHERE status = 'completed'
   ========================================================= */

async function getSummary(
    period = "30",
    category = "all"
) {

    const { condition, params } =
        getCombinedFilters(
            period,
            category
        );

    const categoryJoin =
        category !== "all"
            ? `
                INNER JOIN order_items oi
                    ON oi.sale_id = s.id

                INNER JOIN products p
                    ON p.id = oi.product_id
              `
            : "";

    const [rows] = await pool.query(
        `
        SELECT
            COUNT(DISTINCT s.id) AS total_orders,

            COALESCE(
                SUM(s.total_amount),
                0
            ) AS total_revenue,

            COALESCE(
                SUM(s.total_amount)
                /
                NULLIF(
                    COUNT(DISTINCT s.id),
                    0
                ),
                0
            ) AS average_order_value

        FROM sales s

        ${categoryJoin}

        WHERE s.status = 'completed'
        AND ${condition}
        `,
        params
    );

    return rows[0] || {
        total_orders: 0,
        total_revenue: 0,
        average_order_value: 0
    };
}


/* =========================================================
   ORDER STATUS
   Original view includes ALL statuses.
   Date filter is applied, but status is NOT restricted.
   ========================================================= */

async function getOrderStatus(
    period = "30",
    category = "all"
) {

    const { condition, params } =
        getCombinedFilters(
            period,
            category
        );

    const categoryJoin =
        category !== "all"
            ? `
                INNER JOIN order_items oi
                    ON oi.sale_id = s.id

                INNER JOIN products p
                    ON p.id = oi.product_id
              `
            : "";

    const [rows] = await pool.query(
        `
        SELECT
            s.status,

            COUNT(DISTINCT s.id)
                AS order_count,

            COALESCE(
                SUM(s.total_amount),
                0
            ) AS revenue

        FROM sales s

        ${categoryJoin}

        WHERE ${condition}

        GROUP BY s.status

        ORDER BY order_count DESC
        `,
        params
    );

    return rows;
}


/* =========================================================
   MONTHLY SALES
   Original logic:
   WHERE status = 'completed'
   ========================================================= */

async function getMonthlySales(
    period = "30",
    category = "all"
) {

    const { condition, params } =
        getCombinedFilters(
            period,
            category
        );

    const categoryJoin =
        category !== "all"
            ? `
                INNER JOIN order_items oi
                    ON oi.sale_id = s.id

                INNER JOIN products p
                    ON p.id = oi.product_id
              `
            : "";

    const [rows] = await pool.query(
        `
        SELECT
            YEAR(s.created_at)
                AS sales_year,

            MONTH(s.created_at)
                AS sales_month,

            DATE_FORMAT(
                s.created_at,
                '%Y-%m'
            ) AS month,

            COUNT(DISTINCT s.id)
                AS total_orders,

            COALESCE(
                SUM(s.total_amount),
                0
            ) AS revenue

        FROM sales s

        ${categoryJoin}

        WHERE s.status = 'completed'
        AND ${condition}

        GROUP BY
            YEAR(s.created_at),
            MONTH(s.created_at),
            DATE_FORMAT(
                s.created_at,
                '%Y-%m'
            )

        ORDER BY
            sales_year,
            sales_month
        `,
        params
    );

    return rows;
}


/* =========================================================
   PRODUCT PERFORMANCE
   Original logic preserved.
   ========================================================= */

async function getProductPerformance(
    period = "30",
    category = "all"
) {

    const { condition, params } =
        getCombinedFilters(
            period,
            category
        );

    const [rows] = await pool.query(
        `
        SELECT
            p.id AS product_id,

            p.name AS product_name,

            COALESCE(
                SUM(oi.quantity),
                0
            ) AS units_sold,

            COALESCE(
                SUM(oi.subtotal),
                0
            ) AS revenue,

            COALESCE(
                SUM(
                    oi.subtotal -
                    (
                        oi.quantity *
                        p.cost
                    )
                ),
                0
            ) AS profit

        FROM order_items oi

        INNER JOIN sales s
            ON s.id = oi.sale_id

        INNER JOIN products p
            ON p.id = oi.product_id

        WHERE s.status = 'completed'
        AND ${condition}

        GROUP BY
            p.id,
            p.name

        ORDER BY revenue DESC
        `,
        params
    );

    return rows;
}


/* =========================================================
   CATEGORY PERFORMANCE
   Original logic preserved.
   ========================================================= */

async function getCategoryPerformance(
    period = "30",
    category = "all"
) {

    const { condition, params } =
        getCombinedFilters(
            period,
            category
        );

    const [rows] = await pool.query(
        `
        SELECT
            p.category,

            COALESCE(
                SUM(oi.quantity),
                0
            ) AS units_sold,

            COALESCE(
                SUM(oi.subtotal),
                0
            ) AS revenue,

            COALESCE(
                SUM(
                    oi.quantity * p.cost
                ),
                0
            ) AS total_cost,

            COALESCE(
                SUM(
                    oi.subtotal -
                    (
                        oi.quantity *
                        p.cost
                    )
                ),
                0
            ) AS profit

        FROM order_items oi

        INNER JOIN sales s
            ON s.id = oi.sale_id

        INNER JOIN products p
            ON p.id = oi.product_id

        WHERE s.status = 'completed'
        AND ${condition}

        GROUP BY p.category

        ORDER BY revenue DESC
        `,
        params
    );

    return rows;
}


/* =========================================================
   CUSTOMER PERFORMANCE
   Original logic preserved.
   ========================================================= */

async function getCustomerPerformance(
    period = "30",
    category = "all"
) {

    const { condition, params } =
        getCombinedFilters(
            period,
            category
        );

    const categoryJoin =
        category !== "all"
            ? `
                INNER JOIN order_items oi
                    ON oi.sale_id = s.id

                INNER JOIN products p
                    ON p.id = oi.product_id
              `
            : "";

    const [rows] = await pool.query(
        `
        SELECT
            c.id AS customer_id,

            c.name AS customer_name,

            COUNT(DISTINCT s.id)
                AS total_orders,

            COALESCE(
                SUM(s.total_amount),
                0
            ) AS total_spent,

            COALESCE(
                SUM(s.total_amount)
                /
                NULLIF(
                    COUNT(DISTINCT s.id),
                    0
                ),
                0
            ) AS average_order_value

        FROM sales s

        LEFT JOIN customers c
            ON c.id = s.customer_id

        ${categoryJoin}

        WHERE s.status = 'completed'
        AND ${condition}

        GROUP BY
            c.id,
            c.name

        ORDER BY total_spent DESC
        `,
        params
    );

    return rows;
}

/* =========================================================
   INVENTORY ALERTS
   NOT DATE FILTERED.
   This exactly follows the original view logic.
   ========================================================= */

async function getInventoryAlerts() {

    const [rows] = await pool.query(`
        SELECT
            p.id AS product_id,
            p.name AS product_name,
            p.sku,
            p.category,
            p.stock_qty,
            p.reorder_level,

            CASE
                WHEN p.stock_qty = 0
                    THEN 'OUT OF STOCK'

                WHEN p.stock_qty <= p.reorder_level
                    THEN 'LOW STOCK'

                ELSE 'NORMAL'
            END AS stock_status

        FROM products p

        ORDER BY p.stock_qty ASC
    `);

    return rows;
}


/* =========================================================
   PAYMENT METHOD ANALYSIS
   Original logic:
   completed sales only.
   ========================================================= */

async function getPaymentAnalysis(
    period = "30",
    category = "all"
) {

    const { condition, params } =
        getCombinedFilters(
            period,
            category
        );

    const categoryJoin =
        category !== "all"
            ? `
                INNER JOIN order_items oi
                    ON oi.sale_id = s.id

                INNER JOIN products p
                    ON p.id = oi.product_id
              `
            : "";

    const [rows] = await pool.query(
        `
        SELECT
            s.payment_method,

            COUNT(DISTINCT s.id)
                AS order_count,

            COALESCE(
                SUM(s.total_amount),
                0
            ) AS revenue

        FROM sales s

        ${categoryJoin}

        WHERE s.status = 'completed'
        AND ${condition}

        GROUP BY
            s.payment_method

        ORDER BY revenue DESC
        `,
        params
    );

    return rows;
}

/* =========================================================
   PROFIT SUMMARY
   Original calculation preserved exactly.
   ========================================================= */

async function getProfitSummary(
    period = "30",
    category = "all"
) {

    const { condition, params } =
        getCombinedFilters(
            period,
            category
        );

    const [rows] = await pool.query(
        `
        SELECT

            COALESCE(
                SUM(oi.subtotal),
                0
            ) AS total_revenue,

            COALESCE(
                SUM(
                    oi.quantity * p.cost
                ),
                0
            ) AS total_cost,

            COALESCE(
                SUM(
                    oi.subtotal -
                    (
                        oi.quantity *
                        p.cost
                    )
                ),
                0
            ) AS total_profit,

            COALESCE(
                (
                    SUM(
                        oi.subtotal -
                        (
                            oi.quantity *
                            p.cost
                        )
                    )
                    /
                    NULLIF(
                        SUM(oi.subtotal),
                        0
                    )
                ) * 100,
                0
            ) AS profit_margin_percentage

        FROM order_items oi

        INNER JOIN sales s
            ON s.id = oi.sale_id

        INNER JOIN products p
            ON p.id = oi.product_id

        WHERE s.status = 'completed'
        AND ${condition}
        `,
        params
    );

    return rows[0] || {
        total_revenue: 0,
        total_cost: 0,
        total_profit: 0,
        profit_margin_percentage: 0
    };
}

/* =========================================================
   PRODUCT BUSINESS INSIGHTS
   Original CASE logic preserved.
   Date filtering is applied only to sales calculations.
   ========================================================= */


        
       async function getProductInsights(
    period = "30",
    category = "all"
) {

    const { condition, params } =
        getCombinedFilters(
            period,
            category
        );

    const [rows] = await pool.query(
        `
        SELECT
            p.id AS product_id,

            p.name AS product_name,

            p.category,

            p.stock_qty,

            p.reorder_level,

            COALESCE(
                SUM(
                    CASE
                        WHEN s.status = 'completed'
                        THEN oi.quantity
                        ELSE 0
                    END
                ),
                0
            ) AS units_sold,

            COALESCE(
                SUM(
                    CASE
                        WHEN s.status = 'completed'
                        THEN oi.subtotal
                        ELSE 0
                    END
                ),
                0
            ) AS revenue,

            CASE

                WHEN p.stock_qty = 0
                    THEN 'OUT_OF_STOCK'

                WHEN p.stock_qty <= p.reorder_level
                    THEN 'REORDER_SOON'

                ELSE 'NORMAL'

            END AS business_status

        FROM products p

        LEFT JOIN order_items oi
            ON oi.product_id = p.id

        LEFT JOIN sales s
            ON s.id = oi.sale_id
            AND ${condition}

        WHERE
            (
                ? = 'all'
                OR p.category = ?
            )

        GROUP BY
            p.id,
            p.name,
            p.category,
            p.stock_qty,
            p.reorder_level

        ORDER BY revenue DESC
        `,
        [
            ...params,
            category,
            category
        ]
    );

    return rows;
}

async function getCategories() {

    const [rows] = await pool.query(`
        SELECT DISTINCT
            category
        FROM products
        WHERE category IS NOT NULL
          AND TRIM(category) <> ''
        ORDER BY category
    `);

    return rows.map(
        row => row.category
    );
}

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
    getSummary,
    getOrderStatus,
    getMonthlySales,
    getProductPerformance,
    getCategoryPerformance,
    getCustomerPerformance,
    getInventoryAlerts,
    getPaymentAnalysis,
    getProfitSummary,
    getProductInsights,
    getCategories
};