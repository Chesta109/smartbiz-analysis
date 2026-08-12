const pool = require("../config/db");
const saleModel = require("../models/saleModel");
const productModel = require("../models/productModel");
const orderItemModel = require("../models/orderItemModel");
const { AppError } = require("../middlewares/errorHandler");

async function createSale(customerId, userId, items) {
  if (!items || items.length === 0) {
    throw new AppError(
      "Sale must have at least one item.",
      422,
      "VALIDATION_ERROR",
    );
  }

  let totalAmount = 0;
  const enrichedItems = [];

  for (const item of items) {
    const product = await productModel.findById(item.productId);
    if (!product) {
      throw new AppError(
        `Product ID ${item.productId} not found.`,
        404,
        "NOT_FOUND",
      );
    }
    if (product.stock_qty < item.quantity) {
      throw new AppError(
        `Not enough stock for ${product.name}.`,
        400,
        "BAD_REQUEST",
      );
    }
    const unitPrice = product.price;
    totalAmount += unitPrice * item.quantity;
    enrichedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: unitPrice,
    });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const saleId = await saleModel.create(connection, {
      customerId: customerId || null,
      userId,
      totalAmount,
    });

    const orderItemsToInsert = enrichedItems.map((i) => ({
      saleId,
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    }));

    await orderItemModel.createMany(connection, orderItemsToInsert);

    for (const item of enrichedItems) {
      await productModel.adjustStockWithConnection(
        connection,
        item.productId,
        -item.quantity,
      );
    }

    await connection.commit();
    return saleId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { createSale };
