import re

def update_service():
    with open('services/analyticsService.js', 'r') as f:
        text = f.read()

    # Update getCombinedFilters
    text = re.sub(
        r'function getCombinedFilters\(period, category\) \{([\s\S]*?return \{)[\s\S]*?condition: `[\s\S]*?\$\{dateFilter\.condition\}[\s\S]*?AND \$\{categoryFilter\.condition\}[\s\S]*?`,[\s\S]*?params: \[[\s\S]*?\.\.\.dateFilter\.params,[\s\S]*?\.\.\.categoryFilter\.params[\s\S]*?\][\s\S]*?\};[\s\S]*?\}',
        '''function getCombinedFilters(period, category, businessId) {
    const dateFilter = getDateFilter(period);
    const categoryFilter = getCategoryFilter(category);
    let condition = `\n        ${dateFilter.condition}\n        AND ${categoryFilter.condition}\n    `;
    let params = [...dateFilter.params, ...categoryFilter.params];
    if (businessId) {
        condition += " AND s.business_id = ?";
        params.push(businessId);
    }
    return { condition, params };
}''',
        text
    )

    # Function signatures to update
    funcs = [
        'getSummary', 'getOrderStatus', 'getMonthlySales', 'getDailySales',
        'getProductPerformance', 'getCategoryPerformance', 'getCustomerPerformance',
        'getPaymentAnalysis', 'getProfitSummary', 'getProductInsights'
    ]

    for func in funcs:
        # async function funcName(period = "30", category = "all") {
        text = re.sub(
            rf'async function {func}\([\s\n]*period = "30",[\s\n]*category = "all"[\s\n]*\)[\s\n]*\{{',
            f'async function {func}(period = "30", category = "all", businessId) {{',
            text
        )
        # getCombinedFilters(period, category)
        text = re.sub(
            r'getCombinedFilters\([\s\n]*period,[\s\n]*category[\s\n]*\);',
            r'getCombinedFilters(period, category, businessId);',
            text
        )

    # getInventoryAlerts
    text = re.sub(
        r'async function getInventoryAlerts\(\) \{[\s\n]*const \[rows\] = await pool.query\(`[\s\n]*SELECT([\s\S]*?)FROM products p([\s\n]*?)ORDER BY p\.stock_qty ASC',
        r'''async function getInventoryAlerts(category = "all", businessId) {
    const [rows] = await pool.query(`
        SELECT\1FROM products p\2WHERE p.business_id = ?
        ORDER BY p.stock_qty ASC''',
        text
    )
    
    # getInventoryAlerts fix the param
    text = re.sub(
        r'WHERE p\.business_id = \?[\s\n]*ORDER BY p\.stock_qty ASC[\s\n]*`\);',
        r'WHERE p.business_id = ?\n        ORDER BY p.stock_qty ASC\n    `, [businessId]);',
        text
    )

    # getCategories
    text = re.sub(
        r'async function getCategories\(\) \{([\s\S]*?)FROM products([\s\n]*?)WHERE category IS NOT NULL([\s\S]*?)`\);',
        r'''async function getCategories(businessId) {\1FROM products\2WHERE category IS NOT NULL AND business_id = ?\3`, [businessId]);''',
        text
    )

    # Fix getProductInsights category check (has `WHERE (? = 'all' OR p.category = ?)`)
    # We need to make sure we don't break its existing params.
    # It passes: [ ...params, category, category ]
    # Wait, getCombinedFilters now appends businessId.
    # We also need p.business_id = ? maybe? But s.business_id is checked in the LEFT JOIN or WHERE?
    # getProductInsights queries FROM products p LEFT JOIN ...
    # So if products aren't filtered by business_id, it will return products from other businesses!
    # Let's add AND p.business_id = ? to getProductInsights.
    text = re.sub(
        r'WHERE[\s\n]*\([\s\n]*\? = \'all\'[\s\n]*OR p\.category = \?[\s\n]*\)',
        r'''WHERE
            (
                ? = 'all'
                OR p.category = ?
            )
            AND p.business_id = ?''',
        text
    )
    text = re.sub(
        r'\[[\s\n]*\.\.\.params,[\s\n]*category,[\s\n]*category[\s\n]*\]',
        r'[ ...params, category, category, businessId ]',
        text
    )

    with open('services/analyticsService.js', 'w') as f:
        f.write(text)

if __name__ == '__main__':
    update_service()
