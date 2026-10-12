const analyticsService = require("../services/analyticsService");

/* =========================================================
   GET FILTERS
   ========================================================= */

function getFilters(req) {
    return {
        period: req.query.period || "30",
        category: req.query.category || "all"
    };
}

/* =========================================================
   SUMMARY
   ========================================================= */

async function getSummary(req, res, next) {
    try {
        const { period, category } = getFilters(req);
        const businessId = req.session.user.business_id;

        const data = await analyticsService.getSummary(
            period,
            category, businessId);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   ORDER STATUS
   ========================================================= */

async function getOrderStatus(req, res, next) {
    try {
        const { period, category } = getFilters(req);
        const businessId = req.session.user.business_id;

        const data = await analyticsService.getOrderStatus(
            period,
            category, businessId);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   MONTHLY SALES
   ========================================================= */

async function getMonthlySales(req, res, next) {
    try {
        const { period, category } = getFilters(req);
        const businessId = req.session.user.business_id;

        const data = await analyticsService.getMonthlySales(
            period,
            category, businessId);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   DAILY SALES
   ========================================================= */

async function getDailySales(req, res, next) {
    try {
        const { period, category } = getFilters(req);
        const businessId = req.session.user.business_id;

        const data = await analyticsService.getDailySales(
            period,
            category, businessId);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   PRODUCT PERFORMANCE
   ========================================================= */

async function getProductPerformance(req, res, next) {
    try {
        const { period, category } = getFilters(req);
        const businessId = req.session.user.business_id;

        const data = await analyticsService.getProductPerformance(
            period,
            category, businessId);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   CATEGORY PERFORMANCE
   ========================================================= */

async function getCategoryPerformance(req, res, next) {
    try {
        const { period, category } = getFilters(req);
        const businessId = req.session.user.business_id;

        const data = await analyticsService.getCategoryPerformance(
            period,
            category, businessId);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   CUSTOMER PERFORMANCE
   ========================================================= */

async function getCustomerPerformance(req, res, next) {
    try {
        const { period, category } = getFilters(req);
        const businessId = req.session.user.business_id;

        const data = await analyticsService.getCustomerPerformance(
            period,
            category, businessId);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   INVENTORY
   ========================================================= */

async function getInventoryAlerts(req, res, next) {
    try {
        const { category } = getFilters(req);
        const businessId = req.session.user.business_id;

        const data = await analyticsService.getInventoryAlerts(
            category, businessId);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   PAYMENT
   ========================================================= */

async function getPaymentAnalysis(req, res, next) {
    try {
        const { period, category } = getFilters(req);
        const businessId = req.session.user.business_id;

        const data = await analyticsService.getPaymentAnalysis(
            period,
            category, businessId);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   PROFIT
   ========================================================= */

async function getProfitSummary(req, res, next) {
    try {
        const { period, category } = getFilters(req);
        const businessId = req.session.user.business_id;

        const data = await analyticsService.getProfitSummary(
            period,
            category, businessId);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   PRODUCT INSIGHTS
   ========================================================= */

async function getProductInsights(req, res, next) {
    try {
        const { period, category } = getFilters(req);
        const businessId = req.session.user.business_id;

        const data = await analyticsService.getProductInsights(
            period,
            category, businessId);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   CATEGORIES
   ========================================================= */

async function getCategories(req, res, next) {
    try {
        const businessId = req.session.user.business_id;
        const data = await analyticsService.getCategories(businessId);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
    getSummary,
    getOrderStatus,
    getMonthlySales,
    getDailySales,
    getProductPerformance,
    getCategoryPerformance,
    getCustomerPerformance,
    getInventoryAlerts,
    getPaymentAnalysis,
    getProfitSummary,
    getProductInsights,
    getCategories
};