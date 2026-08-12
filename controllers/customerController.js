const { renderView, customerFilters } = require("../utils/viewLocals");
const customerService = require("../services/customerService");

async function index(req, res) {
  renderView(req, res, "customers/index", {
    title: "Customers",
    customers: await customerService.listCustomers(customerFilters(req.query)),
    filters: customerFilters(req.query),
  });
}

async function show(req, res) {
  const customer = await customerService.getCustomer(req.params.id);
  renderView(req, res, "customers/show", {
    title: customer.name,
    customer,
    history: await customerService.purchaseHistory(customer.id),
  });
}
async function create(req, res) {
  const customer = await customerService.createCustomer(req.body);
  if (req.accepts("json")) return res.status(201).json(customer);
  req.flash("success", "Customer added successfully.");
  res.redirect("/customers");
}
async function update(req, res) {
  const customer = await customerService.updateCustomer(
    req.params.id,
    req.body,
  );
  if (req.accepts("json")) return res.json(customer);
  req.flash("success", "Customer updated successfully.");
  res.redirect("/customers");
}
async function remove(req, res) {
  await customerService.deleteCustomer(req.params.id);
  if (req.accepts("json")) return res.status(204).send();
  req.flash("success", "Customer deleted successfully.");
  res.redirect("/customers");
}
module.exports = { index, show, create, update, remove };
