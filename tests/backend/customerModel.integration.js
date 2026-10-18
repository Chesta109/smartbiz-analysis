require("../../config/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const pool = require("../../config/db");
const customerModel = require("../../models/customerModel");
const customerService = require("../../services/customerService");

test("customer metrics, isolation, validation, and protected deletion use the tenant sales relationship", async () => {
  let businessId;
  let userId;
  let otherBusinessId;
  try {
    const [business] = await pool.query("INSERT INTO businesses (name) VALUES (?)", [`Customer Test ${Date.now()}`]);
    businessId = business.insertId;
    const [user] = await pool.query(
      "INSERT INTO users (business_id, name, email, password_hash, role, email_verified) VALUES (?, ?, ?, ?, 'manager', 1)",
      [businessId, "Customer Test", `customer-test-${Date.now()}@example.test`, "$2b$10$JH.OuRGriQuvIo.briRyFOTZ3EriwnKlaRhIOWRROhtviOfDuISoC"],
    );
    userId = user.insertId;
    const [otherBusiness] = await pool.query("INSERT INTO businesses (name) VALUES (?)", [`Other Customer Test ${Date.now()}`]);
    otherBusinessId = otherBusiness.insertId;

    const purchased = await customerService.createCustomer(businessId, { name: "Purchaser", email: "purchaser@example.test", phone: "123" });
    const removable = await customerService.createCustomer(businessId, { name: "Removable", email: "removable@example.test" });
    await pool.query(
      "INSERT INTO sales (business_id, customer_id, user_id, total_amount, status, created_at) VALUES (?, ?, ?, ?, 'completed', ?), (?, ?, ?, ?, 'pending', ?)",
      [businessId, purchased.id, userId, 110, "2026-10-18 10:00:00", businessId, purchased.id, userId, 999, "2026-10-19 10:00:00"],
    );

    const customers = await customerModel.findAll({ businessId });
    const listed = customers.find((customer) => customer.id === purchased.id);
    assert.equal(Number(listed.orders), 2);
    assert.equal(Number(listed.total_spend), 110);
    assert.equal(new Date(listed.last_purchase).toISOString().slice(0, 10), "2026-10-19");
    assert.equal(await customerModel.findById(purchased.id, otherBusinessId), null);

    await assert.rejects(() => customerService.createCustomer(businessId, { name: "Bad email", email: "not-an-email" }), { type: "VALIDATION_ERROR" });
    await assert.rejects(() => customerService.createCustomer(businessId, { name: "Duplicate", email: "purchaser@example.test" }), { type: "VALIDATION_ERROR" });
    await assert.rejects(() => customerService.deleteCustomer(purchased.id, businessId), { type: "CUSTOMER_HAS_PURCHASE_HISTORY" });
    assert.equal(await customerService.deleteCustomer(removable.id, businessId), true);
    assert.equal(await customerModel.findById(removable.id, businessId), null);

    // Test Edit Customer functionality: update details, preserve purchase history & metrics
    const secondCust = await customerService.createCustomer(businessId, { name: "Second Customer", email: "second@example.test", phone: "+91-9876543210" });
    const updated = await customerService.updateCustomer(purchased.id, businessId, {
      name: "Purchaser Updated",
      email: "purchaser.updated@example.test",
      phone: "+91-1122334455",
      address: "123 Business Street",
    });
    assert.equal(updated.id, purchased.id);
    assert.equal(updated.name, "Purchaser Updated");
    assert.equal(updated.email, "purchaser.updated@example.test");
    assert.equal(updated.phone, "+91-1122334455");
    assert.equal(updated.address, "123 Business Street");

    // Metrics remain unchanged after editing details
    const refreshedCustomers = await customerModel.findAll({ businessId });
    const refreshedPurchased = refreshedCustomers.find((c) => c.id === purchased.id);
    assert.equal(Number(refreshedPurchased.orders), 2);
    assert.equal(Number(refreshedPurchased.total_spend), 110);

    // Cross-tenant customer edit must be blocked
    await assert.rejects(
      () => customerService.updateCustomer(purchased.id, otherBusinessId, { name: "Hacked Name" }),
      { type: "NOT_FOUND" }
    );

    // Duplicate email on update must be blocked
    await assert.rejects(
      () => customerService.updateCustomer(secondCust.id, businessId, { name: "Second", email: "purchaser.updated@example.test" }),
      { type: "VALIDATION_ERROR" }
    );

    // Invalid email on update must be rejected
    await assert.rejects(
      () => customerService.updateCustomer(purchased.id, businessId, { name: "Purchaser", email: "not-a-valid-email" }),
      { type: "VALIDATION_ERROR" }
    );
  } finally {
    if (businessId) {
      await pool.query("DELETE FROM sales WHERE business_id = ?", [businessId]);
      await pool.query("DELETE FROM customers WHERE business_id = ?", [businessId]);
      if (userId) await pool.query("DELETE FROM users WHERE id = ?", [userId]);
      await pool.query("DELETE FROM businesses WHERE id = ?", [businessId]);
    }
    if (otherBusinessId) await pool.query("DELETE FROM businesses WHERE id = ?", [otherBusinessId]);
    await pool.end();
  }
});
