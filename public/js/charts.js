/* =========================================================
   CURRENCY FORMATTER
   ========================================================= */

function formatIndianCurrency(value) {
    value = Number(value || 0);

    if (value >= 10000000) {
        return `₹${(value / 10000000).toFixed(2)}Cr`;
    }

    if (value >= 100000) {
        return `₹${(value / 100000).toFixed(2)}L`;
    }

    if (value >= 1000) {
        return `₹${(value / 1000).toFixed(1)}K`;
    }

    return `₹${value.toFixed(0)}`;
}


/* =========================================================
   DASHBOARD FILTERS
   ========================================================= */

function getSelectedPeriod() {
    const filter = document.getElementById('date-filter');

    return filter
        ? filter.value || '30'
        : '30';
}

function getSelectedCategory() {
    const filter =
        document.getElementById('category-filter');

    return filter
        ? filter.value || 'all'
        : 'all';
}

function getAnalyticsUrl(endpoint) {

    const params = new URLSearchParams();

    params.set(
        'period',
        getSelectedPeriod()
    );

    params.set(
        'category',
        getSelectedCategory()
    );

    return `${endpoint}?${params.toString()}`;
}


/* =========================================================
   LOAD DASHBOARD SUMMARY / KPIs
   ========================================================= */

async function loadSummary() {
    try {
        const response = await fetch(
           getAnalyticsUrl('/api/analytics/summary')

        );

        const profitResponse = await fetch(
          getAnalyticsUrl('/api/analytics/profit')

        );

        if (!response.ok) {
            throw new Error(
                `Summary API error: ${response.status}`
            );
        }

        if (!profitResponse.ok) {
            throw new Error(
                `Profit API error: ${profitResponse.status}`
            );
        }

        const result = await response.json();
        const profitResult = await profitResponse.json();

        const data = result.data || {};
        const profitData = profitResult.data || {};

        const revenueElement = document.getElementById('kpi-0');
        const ordersElement = document.getElementById('kpi-1');
        const profitElement = document.getElementById('kpi-2');
        const marginElement = document.getElementById('kpi-3');

        if (revenueElement) {
            revenueElement.textContent =
                formatIndianCurrency(data.total_revenue);
        }

        if (ordersElement) {
            ordersElement.textContent =
                data.total_orders || 0;
        }

        if (profitElement) {
            profitElement.textContent =
                formatIndianCurrency(profitData.total_profit);
        }

        if (marginElement) {
            marginElement.textContent =
                `${Number(
                    profitData.profit_margin_percentage || 0
                ).toFixed(2)}%`;
        }

        console.log(
            `Dashboard summary loaded for period: ${getSelectedPeriod()}`
        );

    } catch (error) {
        console.error(
            "Error loading dashboard KPIs:",
            error
        );
    }
}

async function loadCategories() {
    try {
        const response = await fetch(
            '/api/analytics/category-list'
        );

        if (!response.ok) {
            throw new Error(
                `Category API error: ${response.status}`
            );
        }

        const result = await response.json();

        const categories = result.data || [];

        const select =
            document.getElementById('category-filter');

        if (!select) {
            console.error(
                'Category filter element not found'
            );
            return;
        }

        select.innerHTML = `
            <option value="all">
                All Categories
            </option>
        `;

        categories.forEach(category => {
            const option =
                document.createElement('option');

            option.value = category;
            option.textContent = category;

            select.appendChild(option);
        });

        console.log(
            'Categories loaded:',
            categories
        );

    } catch (error) {
        console.error(
            'Error loading categories:',
            error
        );
    }
}

/* =========================================================
   LOAD REVENUE TREND
   ========================================================= */

function formatTrendLabel(label) {
    // "2026-09-06" -> "Sep 06"; "2026-09" stays as it is
    const parts = String(label).split('-');

    if (parts.length === 3) {
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        return `${months[Number(parts[1]) - 1]} ${parts[2]}`;
    }

    return label;
}

async function loadRevenueTrend() {
    const container = document.getElementById('revenue-trend-chart');

    if (!container) {
        console.error('Revenue trend container not found');
        return;
    }

    try {
        const response = await fetch(
            getAnalyticsUrl('/api/analytics/monthly-sales')
        );

        if (!response.ok) {
            throw new Error(`Revenue trend API error: ${response.status}`);
        }

        const result = await response.json();
        let items = (result.data || []).map(item => ({
            label: item.month,
            revenue: Number(item.revenue || 0)
        }));

        // A line needs at least 2 points. With only one month of sales,
        // draw the same period day by day instead.
        let isDaily = false;

        if (items.length < 2) {
            try {
                const dailyResponse = await fetch(
                    getAnalyticsUrl('/api/analytics/daily-sales')
                );

                if (dailyResponse.ok) {
                    const dailyResult = await dailyResponse.json();
                    const dailyItems = (dailyResult.data || []).map(item => ({
                        label: item.day,
                        revenue: Number(item.revenue || 0)
                    }));

                    if (dailyItems.length >= 2) {
                        items = dailyItems;
                        isDaily = true;
                    }
                }
            } catch (dailyError) {
                console.error('Daily revenue fallback failed:', dailyError);
            }
        }

        if (items.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; color:var(--muted); font-size:13px;">
                    No revenue data available for the selected period.
                </div>
            `;
            return;
        }

        const revenues = items.map(item => item.revenue);
        const maxRevenue = Math.max(...revenues, 1);

        // Fixed-size drawing area, scaled without stretching.
        const width = 1000;
        const height = 260;
        const padLeft = 70;
        const padRight = 40;
        const padTop = 40;
        const padBottom = 40;

        const chartWidth = width - padLeft - padRight;
        const chartHeight = height - padTop - padBottom;
        const baseY = height - padBottom;

        const xAt = index =>
            items.length === 1
                ? padLeft + chartWidth / 2
                : padLeft + (index / (items.length - 1)) * chartWidth;

        const yAt = value => padTop + (1 - value / maxRevenue) * chartHeight;

        const points = items.map((item, index) => ({
            x: xAt(index),
            y: yAt(item.revenue),
            label: formatTrendLabel(item.label),
            revenue: item.revenue
        }));

        const linePoints = points.map(p => `${p.x},${p.y}`).join(' ');

        const areaPoints = [
            `${points[0].x},${baseY}`,
            ...points.map(p => `${p.x},${p.y}`),
            `${points[points.length - 1].x},${baseY}`
        ].join(' ');

        const gridLines = [0, 0.5, 1].map(fraction => {
            const value = maxRevenue * fraction;
            const y = yAt(value);
            return `
                <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}"
                      stroke="#e5e7eb" stroke-width="1" />
                <text x="${padLeft - 10}" y="${y + 4}" text-anchor="end"
                      font-size="12" fill="#64748b">
                    ${formatIndianCurrency(value)}
                </text>
            `;
        }).join('');

        const fewPoints = points.length <= 12;

        const dots = points.map(p => `
            <circle cx="${p.x}" cy="${p.y}" r="${fewPoints ? 5 : 3}" fill="#2563EB"
                    stroke="#ffffff" stroke-width="2">
                <title>${p.label}: ${formatIndianCurrency(p.revenue)}</title>
            </circle>
        `).join('');

        const valueLabels = fewPoints
            ? points.map(p => `
                <text x="${p.x}" y="${p.y - 12}" text-anchor="middle"
                      font-size="12" font-weight="600" fill="#1e293b">
                    ${formatIndianCurrency(p.revenue)}
                </text>
            `).join('')
            : '';

        // At most ~8 x-axis labels so they never overlap
        const labelStep = Math.max(1, Math.ceil(points.length / 8));

        const xLabels = points.map((p, index) => {
            const isLast = index === points.length - 1;
            const show = index % labelStep === 0 &&
                (isLast || points.length - 1 - index >= labelStep / 2);

            return (show || isLast)
                ? `<text x="${p.x}" y="${height - 12}" text-anchor="middle"
                         font-size="12" fill="#64748b">${p.label}</text>`
                : '';
        }).join('');

        const note = isDaily
            ? `<div style="text-align:center; color:var(--muted); font-size:12px; margin-top:4px;">
                   Showing daily revenue because this period has only one month of sales.
               </div>`
            : '';

        container.innerHTML = `
            <svg
                viewBox="0 0 ${width} ${height}"
                width="100%"
                style="display:block; max-height:240px;"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label="Revenue trend"
            >
                ${gridLines}
                ${points.length > 1 ? `
                    <polygon points="${areaPoints}" fill="#2563EB" opacity="0.10" />
                    <polyline
                        points="${linePoints}"
                        fill="none"
                        stroke="#2563EB"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />` : ''}
                ${dots}
                ${valueLabels}
                ${xLabels}
            </svg>
            ${note}
        `;

        console.log("Revenue trend loaded:", items);

    } catch (error) {

        console.error("Error loading revenue trend:", error);

        container.innerHTML = `
            <div style="text-align:center; color:#dc2626; font-size:13px;">
                Unable to load revenue trend.
            </div>
        `;
    }
}


/* =========================================================
   LOAD PRODUCT PERFORMANCE
   ========================================================= */

async function loadProductPerformance() {

    try {

        const response = await fetch(
            getAnalyticsUrl('/api/analytics/products')
        );

        if (!response.ok) {
            throw new Error(
                `Product API error: ${response.status}`
            );
        }

        const result = await response.json();

        const products = (result.data || [])
            .map(product => ({
                ...product,

                revenue:
                    Number(product.revenue || 0),

                profit:
                    Number(product.profit || 0),

                units_sold:
                    Number(product.units_sold || 0)
            }))
            .sort(
                (a, b) =>
                    b.revenue - a.revenue
            )
            .slice(0, 5);

        const container =
            document.getElementById(
                'product-performance-chart'
            );

        if (!container) {
            return;
        }

        if (products.length === 0) {

            container.innerHTML = `
                <div style="
                    text-align:center;
                    color:var(--muted);
                ">
                    No product data available
                    for the selected period.
                </div>
            `;

            return;
        }

        const maxRevenue = Math.max(
            ...products.map(
                product => product.revenue
            )
        );

        container.innerHTML =
            products
                .map(product => {

                    const width =
                        maxRevenue > 0
                            ? (
                                product.revenue /
                                maxRevenue
                            ) * 100
                            : 0;

                    return `
                        <div style="
                            display:flex;
                            align-items:center;
                            gap:10px;
                            width:100%;
                        ">

                            <span style="
                                font-size:11px;
                                width:90px;
                                text-align:right;
                                color:var(--muted);
                                white-space:nowrap;
                                overflow:hidden;
                                text-overflow:ellipsis;
                            "
                            title="${product.product_name}">
                                ${product.product_name}
                            </span>

                            <div style="
                                flex:1;
                                height:16px;
                                background:var(--line);
                                border-radius:4px;
                                overflow:hidden;
                            ">

                                <div style="
                                    width:${width}%;
                                    height:100%;
                                    background:#2563EB;
                                    border-radius:4px;
                                "></div>

                            </div>

                            <span style="
                                width:65px;
                                font-size:11px;
                                color:var(--ink);
                                text-align:right;
                            ">
                                ${formatIndianCurrency(
                                    product.revenue
                                )}
                            </span>

                        </div>
                    `;

                })
                .join('');

        console.log(
            "Product performance loaded for period:",
            getSelectedPeriod()
        );

    } catch (error) {

        console.error(
            "Error loading product performance:",
            error
        );
    }
}


/* =========================================================
   LOAD INVENTORY ALERTS
   Inventory is NOT date filtered.
   ========================================================= */

async function loadInventoryAlerts() {

    try {

        const response = await fetch(
            '/api/analytics/inventory'
        );

        if (!response.ok) {
            throw new Error(
                `Inventory API error: ${response.status}`
            );
        }

        const result = await response.json();

        const inventory =
            result.data || [];

        const container =
            document.getElementById(
                'low-stock-list'
            );

        if (!container) {
            console.error(
                'Low stock container not found'
            );
            return;
        }

        if (inventory.length === 0) {

            container.innerHTML = `
                <div class="empty-state"
                     style="padding:24px 0;">

                    <span style="font-size:14px;">
                        All products are above
                        their reorder level.
                    </span>

                </div>
            `;

            return;
        }

        container.innerHTML =
            inventory
                .slice(0, 5)
                .map((product, index) => {

                    const stock =
                        Number(
                            product.stock_qty || 0
                        );

                    const reorderLevel =
                        Number(
                            product.reorder_level || 0
                        );

                    const statusClass =
                        stock === 0
                            ? 'status-out'
                            : 'status-low';

                    const statusLabel =
                        stock === 0
                            ? 'Out of stock'
                            : 'Low stock';

                    return `
                        <div style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            padding:16px 0;
                            border-bottom:${
                                index <
                                Math.min(
                                    inventory.length,
                                    5
                                ) - 1
                                    ? '1px solid var(--line)'
                                    : 'none'
                            };
                        ">

                            <div>

                                <div style="
                                    font-weight:600;
                                    font-size:14px;
                                    color:var(--ink);
                                ">
                                    ${product.product_name}
                                </div>

                                <div style="
                                    font-size:13px;
                                    color:var(--muted);
                                ">
                                    Stock: ${stock}
                                    · Reorder level:
                                    ${reorderLevel}
                                </div>

                            </div>

                            <div style="
                                display:flex;
                                align-items:center;
                                gap:12px;
                            ">

                                <span
                                    class="${statusClass} status-dot"
                                >
                                    ${statusLabel}
                                </span>

                                <button
                                    class="btn btn-outline btn-sm"
                                >
                                    Restock
                                </button>

                            </div>

                        </div>
                    `;

                })
                .join('');

        console.log(
            "Inventory alerts loaded:",
            inventory
        );

    } catch (error) {

        console.error(
            "Error loading inventory alerts:",
            error
        );

        const container =
            document.getElementById(
                'low-stock-list'
            );

        if (container) {

            container.innerHTML = `
                <div style="
                    text-align:center;
                    color:#dc2626;
                    font-size:13px;
                    padding:24px 0;
                ">
                    Unable to load inventory alerts.
                </div>
            `;
        }
    }
}


/* =========================================================
   LOAD BUSINESS RECOMMENDATIONS
   ========================================================= */

async function loadBusinessRecommendations() {

    try {

        const response = await fetch(
            getAnalyticsUrl(
                '/api/analytics/product-insights'
            )
        );

        if (!response.ok) {
            throw new Error(
                `Product insights API error: ${response.status}`
            );
        }

        const result =
            await response.json();

        const insights =
            (result.data || [])
                .map(item => ({
                    ...item,

                    stock_qty:
                        Number(
                            item.stock_qty || 0
                        ),

                    reorder_level:
                        Number(
                            item.reorder_level || 0
                        ),

                    revenue:
                        Number(
                            item.revenue || 0
                        ),

                    units_sold:
                        Number(
                            item.units_sold || 0
                        )
                }));

        const container =
            document.getElementById(
                'business-recommendations'
            );

        if (!container) {

            console.error(
                'Business recommendations container not found'
            );

            return;
        }

        /*
         * Only show products that require attention.
         */

        const actionableProducts =
            insights
                .filter(
                    item =>
                        item.business_status &&
                        item.business_status
                            .toUpperCase() !== 'NORMAL'
                )
                .sort((a, b) => {

                    // Out of stock first

                    const aOut =
                        a.stock_qty === 0
                            ? 1
                            : 0;

                    const bOut =
                        b.stock_qty === 0
                            ? 1
                            : 0;

                    if (aOut !== bOut) {
                        return bOut - aOut;
                    }

                    // Products furthest below
                    // reorder level

                    const aRatio =
                        a.reorder_level > 0
                            ? a.stock_qty /
                              a.reorder_level
                            : 1;

                    const bRatio =
                        b.reorder_level > 0
                            ? b.stock_qty /
                              b.reorder_level
                            : 1;

                    return aRatio - bRatio;
                });

        if (actionableProducts.length === 0) {

            container.innerHTML = `
                <div style="
                    text-align:center;
                    color:var(--muted);
                    font-size:13px;
                    padding:30px 0;
                ">
                    No immediate business
                    actions required.
                </div>
            `;

            return;
        }

        /*
         * Display up to 8 actionable recommendations.
         */

        const recommendations =
            actionableProducts.slice(0, 8);

        container.innerHTML =
            recommendations
                .map(
                    (item, index) => {

                        const isOutOfStock =
                            item.stock_qty === 0;

                        const title =
                            `Restock ${item.product_name}`;

                        const description =
                            isOutOfStock
                                ? `This product is currently out of stock. Reorder level is ${item.reorder_level}.`
                                : `Current stock is ${item.stock_qty}, which is below the reorder level of ${item.reorder_level}.`;

                        const statusText =
                            item.business_status
                                .toUpperCase();

                        const badgeClass =
                            isOutOfStock
                                ? 'tag-pill tag-rule'
                                : 'tag-pill tag-stat';

                        return `
                            <div style="
                                display:flex;
                                justify-content:space-between;
                                align-items:flex-start;
                                padding:16px 0;
                                border-bottom:${
                                    index <
                                    recommendations.length - 1
                                        ? '1px solid var(--line)'
                                        : 'none'
                                };
                            ">

                                <div style="
                                    min-width:0;
                                    padding-right:20px;
                                ">

                                    <div style="
                                        font-weight:600;
                                        font-size:14px;
                                        color:var(--ink);
                                        margin-bottom:4px;
                                    ">
                                        ${title}
                                    </div>

                                    <div style="
                                        font-size:13px;
                                        color:var(--muted);
                                        max-width:420px;
                                        line-height:1.45;
                                    ">
                                        ${description}
                                    </div>

                                </div>

                                <span
                                    class="${badgeClass}"
                                    style="white-space:nowrap;"
                                >
                                    ${statusText}
                                </span>

                            </div>
                        `;
                    }
                )
                .join('');

        console.log(
            "Business recommendations loaded:",
            recommendations
        );

    } catch (error) {

        console.error(
            "Error loading business recommendations:",
            error
        );

        const container =
            document.getElementById(
                'business-recommendations'
            );

        if (container) {

            container.innerHTML = `
                <div style="
                    text-align:center;
                    color:#dc2626;
                    font-size:13px;
                    padding:30px 0;
                ">
                    Unable to load business
                    recommendations.
                </div>
            `;
        }
    }
}


/* =========================================================
   LOAD ALL FILTERED DASHBOARD DATA
   ========================================================= */

function loadFilteredDashboard() {

    console.log(
        "Applying filters:",
        {
            period: getSelectedPeriod(),
            category: getSelectedCategory()
        }
    );

    loadSummary();

    loadRevenueTrend();

    loadProductPerformance();

    loadBusinessRecommendations();
}


/* =========================================================
   INITIALIZE DASHBOARD
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
         * Initial dashboard load
         */
        loadCategories();
        loadSummary();
        loadRevenueTrend();
        loadProductPerformance();
        loadInventoryAlerts();
        loadBusinessRecommendations();

       /* =================================================
   DATE FILTER
   ================================================= */

const dateFilter =
    document.getElementById(
        'date-filter'
    );

if (dateFilter) {

    dateFilter.addEventListener(
        'change',
        () => {

            console.log(
                "Date filter changed to:",
                dateFilter.value
            );

            loadFilteredDashboard();
        }
    );
}


/* =================================================
   CATEGORY FILTER
   ================================================= */

const categoryFilter =
    document.getElementById(
        'category-filter'
    );

if (categoryFilter) {

    categoryFilter.addEventListener(
        'change',
        () => {

            console.log(
                "Category filter changed to:",
                categoryFilter.value
            );

            loadFilteredDashboard();
        }
    );
}


/* =================================================
   REFRESH BUTTON
   ================================================= */

const refreshButton =
    document.getElementById(
        'refresh-dashboard'
    );

if (refreshButton) {

    refreshButton.addEventListener(
        'click',
        () => {

            console.log(
                "Refreshing dashboard..."
            );

            loadFilteredDashboard();

            loadInventoryAlerts();
        }
    );
}        

    }
);