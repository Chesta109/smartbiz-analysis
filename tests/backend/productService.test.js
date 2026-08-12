// tests/backend/productService.test.js
// Mocks productModel so this test suite has zero real MySQL dependency —
// matches the doc's requirement for isolated, fast unit tests.

jest.mock("../../models/productModel");
const productModel = require("../../models/productModel");
const productService = require("../../services/productService");

describe("productService", () => {
  afterEach(() => jest.clearAllMocks());

  test("listProducts passes filters straight through to the model", async () => {
    productModel.findAll.mockResolvedValue([{ id: 1, name: "Wireless Mouse" }]);
    const result = await productService.listProducts({ search: "mouse" });
    expect(productModel.findAll).toHaveBeenCalledWith({ search: "mouse" });
    expect(result).toHaveLength(1);
  });

  test("getProduct throws a 404 AppError when the product does not exist", async () => {
    productModel.findById.mockResolvedValue(null);
    await expect(productService.getProduct(999)).rejects.toMatchObject({
      statusCode: 404,
      kind: "not_found",
    });
  });

  test("createProduct rejects negative stock with a validation AppError", async () => {
    await expect(
      productService.createProduct({
        name: "Test",
        category: "Test",
        price: 10,
        cost: 5,
        stock_qty: -1,
        reorder_level: 5,
      }),
    ).rejects.toMatchObject({ statusCode: 422, kind: "validation" });
    expect(productModel.create).not.toHaveBeenCalled();
  });

  test("deleteProduct 404s before attempting delete if product is missing", async () => {
    productModel.findById.mockResolvedValue(null);
    await expect(productService.deleteProduct(42)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(productModel.remove).not.toHaveBeenCalled();
  });
});
