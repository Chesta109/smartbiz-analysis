const customerModel = require("../models/customerModel");
const { AppError } = require("../middlewares/errorHandler");

async function getCustomer(id, businessId) {
  const customer = await customerModel.findById(id, businessId);
  if (!customer) throw new AppError("Customer not found.", 404, "NOT_FOUND");
  return customer;
}
async function listCustomers(businessId, filters) {
  return customerModel.findAll({ ...filters, businessId });
}
async function createCustomer(businessId, data) {
  return customerModel.create({ ...data, businessId });
}
async function updateCustomer(id, businessId, data) {
  await getCustomer(id, businessId);
  return customerModel.update(id, data, businessId);
}
async function deleteCustomer(id, businessId) {
  await getCustomer(id, businessId);
  return customerModel.remove(id, businessId);
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
