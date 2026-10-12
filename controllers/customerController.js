const { renderView, customerFilters } = require("../utils/viewLocals");
const customerService = require("../services/customerService");

async function index(req, res) {
  const businessId = req.session.user.business_id;
  renderView(req, res, "customers/index", {
    title: "Customers",
    customers: await customerService.listCustomers(businessId, customerFilters(req.query)),
    filters: customerFilters(req.query),
  });
}

async function show(req, res) {
  const businessId = req.session.user.business_id;
  const customer = await customerService.getCustomer(req.params.id, businessId);
  renderView(req, res, "customers/show", {
    title: customer.name,
    customer,
    history: await customerService.purchaseHistory(customer.id, businessId),
  });
}

async function search(req, res) {
  const businessId = req.session.user.business_id;
  const q = req.query.q || "";
  if (q.length < 1 || q.length > 60) {
    return res.json({ data: [] });
  }
  const results = await customerService.searchCustomers(q, businessId);
  res.json({ data: results });
}

async function create(req, res) {
  const businessId = req.session.user.business_id;
  const customer = await customerService.createCustomer(businessId, req.body);
  if (req.accepts("json")) return res.status(201).json(customer);
  req.flash("success", "Customer added successfully.");
  res.redirect("/customers");
}

async function update(req, res) {
  const businessId = req.session.user.business_id;
  const customer = await customerService.updateCustomer(
    req.params.id,
    businessId,
    req.body,
  );
  if (req.accepts("json")) return res.json(customer);
  req.flash("success", "Customer updated successfully.");
  res.redirect("/customers");
}

async function remove(req, res) {
  const businessId = req.session.user.business_id;
  await customerService.deleteCustomer(req.params.id, businessId);
  if (req.accepts("json")) return res.status(204).send();
  req.flash("success", "Customer deleted successfully.");
  res.redirect("/customers");
}

module.exports = { index, show, create, update, remove, search };
