const customerModel = require("../models/customerModel");
const { AppError } = require("../middlewares/errorHandler");

async function getCustomer(id, businessId) {
  const customerId = parseInt(id, 10);
  if (!customerId || isNaN(customerId)) throw new AppError("Customer not found.", 404, "NOT_FOUND");
  const customer = await customerModel.findById(customerId, businessId);
  if (!customer) throw new AppError("Customer not found.", 404, "NOT_FOUND");
  return customer;
}
async function listCustomers(businessId, filters) {
  return customerModel.findAll({ ...filters, businessId });
}
async function createCustomer(businessId, data) {
  const customer = normaliseCustomer(data);
  if (customer.email) {
    const existing = await customerModel.findByEmail(customer.email, businessId);
    if (existing) throw new AppError("A customer with that email already exists.", 409, "VALIDATION_ERROR");
  }
  return customerModel.create({ ...customer, businessId });
}
async function updateCustomer(id, businessId, data) {
  const existing = await getCustomer(id, businessId);
  const customer = normaliseCustomer(data);
  if (customer.email) {
    const existingWithEmail = await customerModel.findByEmail(customer.email, businessId);
    if (existingWithEmail && existingWithEmail.id !== existing.id) {
      throw new AppError("A customer with that email already exists.", 409, "VALIDATION_ERROR");
    }
  }
  return customerModel.update(existing.id, customer, businessId);
}
async function deleteCustomer(id, businessId) {
  const existing = await getCustomer(id, businessId);
  if (await customerModel.hasPurchaseHistory(existing.id, businessId)) {
    throw new AppError("This customer has purchase history and cannot be deleted.", 409, "CUSTOMER_HAS_PURCHASE_HISTORY");
  }
  return customerModel.remove(existing.id, businessId);
}

function normaliseCustomer(data = {}) {
  const name = String(data.name || "").trim();
  const email = String(data.email || "").trim().toLowerCase();
  const phone = String(data.phone || "").trim();
  const address = String(data.address || "").trim();
  if (!name || name.length > 120) throw new AppError("Enter a customer name (up to 120 characters).", 422, "VALIDATION_ERROR");
  if (email && (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new AppError("Enter a valid email address.", 422, "VALIDATION_ERROR");
  if (phone.length > 30) throw new AppError("Phone number must be 30 characters or fewer.", 422, "VALIDATION_ERROR");
  if (address.length > 255) throw new AppError("Address must be 255 characters or fewer.", 422, "VALIDATION_ERROR");
  return { name, email: email || null, phone: phone || null, address: address || null };
}

module.exports = {
  getCustomer,
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  purchaseHistory: (id, businessId) => customerModel.findPurchaseHistory(id, businessId),
  searchCustomers: (q, businessId) => customerModel.searchByPrefix(q, 8, businessId),
};
