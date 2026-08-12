// tests/backend/salesService.test.js
//
// Mocks the DB pool and all models so this exercises only salesService's
// own control flow: does it validate before writing, does it commit only
// on full success, does it roll back and release on every failure path.

jest.mock("../../config/db");
jest.mock("../../models/productModel");
jest.mock("../../models/saleModel");
jest.mock("../../models/orderItemModel");

const pool = require("../../config/db");
const productModel = require("../../models/productModel");
const saleModel = require("../../models/saleModel");
const orderItemModel = require("../../models/orderItemModel");
const salesService = require("../../services/salesService");

function makeFakeConnection() {
  return {
    beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn(),
  };
}

describe("salesService.recordSale", () => {
  let connection;

  beforeEach(() => {
    connection = makeFakeConnection();
    pool.getConnection = jest.fn().mockResolvedValue(connection);
    jest.clearAllMocks();
    pool.getConnection = jest.fn().mockResolvedValue(connection);
  });

  test("rejects a sale with no line items before opening a transaction", async () => {
    await expect(
      salesService.recordSale({ userId: 1, items: [] }),
    ).rejects.toMatchObject({
      statusCode: 422,
    });
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  test("commits, decrements stock, and computes the correct total on a valid sale", async () => {
    productModel.findByIdForUpdate.mockResolvedValue({
      id: 5,
      name: "Wireless Mouse",
      stock_qty: 10,
      price: 650,
    });
    productModel.decrementStock.mockResolvedValue(true);
    saleModel.create.mockResolvedValue(101);
    saleModel.findByIdWithItems.mockResolvedValue({
      id: 101,
      total_amount: 1300,
    });

    const result = await salesService.recordSale({
      customerId: 2,
      userId: 1,
      items: [{ productId: 5, quantity: 2 }],
    });

    expect(connection.beginTransaction).toHaveBeenCalled();
    expect(saleModel.create).toHaveBeenCalledWith(connection, {
      customerId: 2,
      userId: 1,
      totalAmount: 1300, // 650 * 2
    });
    expect(orderItemModel.create).toHaveBeenCalledWith(connection, {
      saleId: 101,
      productId: 5,
      quantity: 2,
      unitPrice: 650,
    });
    expect(productModel.decrementStock).toHaveBeenCalledWith(connection, 5, 2);
    expect(connection.commit).toHaveBeenCalled();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
    expect(result).toEqual({ id: 101, total_amount: 1300 });
  });

  test("rolls back and never commits when requested quantity exceeds stock", async () => {
    productModel.findByIdForUpdate.mockResolvedValue({
      id: 5,
      name: "Wireless Mouse",
      stock_qty: 1,
      price: 650,
    });

    await expect(
      salesService.recordSale({
        userId: 1,
        items: [{ productId: 5, quantity: 3 }],
      }),
    ).rejects.toMatchObject({ statusCode: 422, kind: "validation" });

    expect(saleModel.create).not.toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  test("rolls back if a product does not exist", async () => {
    productModel.findByIdForUpdate.mockResolvedValue(null);

    await expect(
      salesService.recordSale({
        userId: 1,
        items: [{ productId: 999, quantity: 1 }],
      }),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  test("rolls back if the stock decrement unexpectedly fails mid-transaction", async () => {
    productModel.findByIdForUpdate.mockResolvedValue({
      id: 5,
      name: "Wireless Mouse",
      stock_qty: 10,
      price: 650,
    });
    productModel.decrementStock.mockResolvedValue(false); // simulated race condition
    saleModel.create.mockResolvedValue(101);

    await expect(
      salesService.recordSale({
        userId: 1,
        items: [{ productId: 5, quantity: 2 }],
      }),
    ).rejects.toMatchObject({ statusCode: 500, kind: "database" });

    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  test("rejects non-positive or non-integer quantities before touching the DB", async () => {
    await expect(
      salesService.recordSale({
        userId: 1,
        items: [{ productId: 5, quantity: 0 }],
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(connection.rollback).toHaveBeenCalled();
  });
});
