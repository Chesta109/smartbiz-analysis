require('dotenv').config();
const express = require('express');
const path = require('path');

const sessionMiddleware = require('./config/session');
const flash = require('connect-flash');
const { errorHandler } = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

const productRoutes = require('./routes/productRoutes');
const uiRoutes = require('./routes/uiRoutes');
const authRoutes = require('./routes/authRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const salesRoutes = require('./routes/salesRoutes');
const customerRoutes = require('./routes/customerRoutes');
// dashboardRoutes, authRoutes, customerRoutes, analyticsRoutes,
// reportRoutes are added here the same way as each feature branch lands.

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Manual method-override for forms sending _method
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    req.method = req.body._method.toUpperCase();
    delete req.body._method;
  }
  next();
});
app.use(sessionMiddleware);
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));

const { buildViewLocals } = require('./utils/viewLocals');

app.use((req, res, next) => {
  Object.assign(res.locals, buildViewLocals(req));
  res.locals.messages = {
    success: req.flash('success'),
    error: req.flash('error'),
  };
  next();
});

app.use('/products', productRoutes);
app.use('/api/products', productRoutes); // same router; controller branches on req.originalUrl
app.use('/customers', customerRoutes);
app.use('/settings', settingsRoutes);
app.use('/sales', salesRoutes);
app.use(authRoutes); // Handles POST /login and /register
app.use(uiRoutes);

app.get('/', (req, res) => res.redirect('/dashboard'));

// 404 fallthrough must be after all routes, before errorHandler
app.use((req, res, next) => {
  res.status(404);
  if (req.originalUrl.startsWith('/api/')) return res.json({ error: 'Not found' });
  res.render('errors/404', { title: 'Not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`SmartBiz Insight running on port ${PORT}`));

module.exports = app;
