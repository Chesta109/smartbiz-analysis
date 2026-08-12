const customerModel = require("../models/customerModel");
const { AppError } = require("../middlewares/errorHandler");
async function getCustomer(id) {
  const customer = await customerModel.findById(id);
  if (!customer) throw new AppError("Customer not found.", 404, "NOT_FOUND");
  return customer;
}
async function listCustomers(filters) {
  return customerModel.findAll(filters);
}
async function createCustomer(data) {
  return customerModel.create(data);
}
async function updateCustomer(id, data) {
  await getCustomer(id);
  return customerModel.update(id, data);
}
async function deleteCustomer(id) {
  await getCustomer(id);
  return customerModel.remove(id);
}
module.exports = {
  getCustomer,
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  purchaseHistory: customerModel.findPurchaseHistory,
};
