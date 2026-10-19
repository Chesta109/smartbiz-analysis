/*
 * Safely export and reset one verified business tenant.
 * Usage: node scripts/resetBusinessData.js --user-id <id> --yes
 */
require("../config/env");
const fs = require("node:fs/promises");
const path = require("node:path");
const pool = require("../config/db");

function userIdFromArgs(args) {
  const index = args.indexOf("--user-id");
  const value = index >= 0 ? Number(args[index + 1]) : NaN;
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

async function count(connection, sql, params) {
  const [[row]] = await connection.query(sql, params);
  return Number(row.count);
}

async function run() {
  const args = process.argv.slice(2);
  const userId = userIdFromArgs(args);
  if (!userId || !args.includes("--yes")) {
    throw new Error("Usage: node scripts/resetBusinessData.js --user-id <verified-user-id> --yes");
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [users] = await connection.query(
      `SELECT u.id, u.name, u.email, u.email_verified, u.business_id, b.name AS business_name
       FROM users u JOIN businesses b ON b.id = u.business_id
       WHERE u.id = ? FOR UPDATE`,
      [userId],
    );
    const user = users[0];
    if (!user?.email_verified || !user.business_id) {
      throw new Error("Target user is not a verified account with a business; no records were changed.");
    }
    const businessId = user.business_id;
    const businessUsers = await count(connection, "SELECT COUNT(*) AS count FROM users WHERE business_id = ?", [businessId]);
    const crossUserSales = await count(connection, "SELECT COUNT(*) AS count FROM sales WHERE business_id = ? AND user_id <> ?", [businessId, userId]);
    const crossBusinessReferences = await count(
      connection,
      `SELECT COUNT(*) AS count FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       LEFT JOIN users sale_user ON sale_user.id = s.user_id
       WHERE s.business_id = ?
         AND ((c.id IS NOT NULL AND c.business_id <> s.business_id) OR sale_user.business_id <> s.business_id)`,
      [businessId],
    );
    if (businessUsers !== 1 || crossUserSales !== 0 || crossBusinessReferences !== 0) {
      throw new Error("Tenant ownership is shared or inconsistent; no records were changed.");
    }

    const [products] = await connection.query("SELECT * FROM products WHERE business_id = ? ORDER BY id", [businessId]);
    const [customers] = await connection.query("SELECT * FROM customers WHERE business_id = ? ORDER BY id", [businessId]);
    const [sales] = await connection.query("SELECT * FROM sales WHERE business_id = ? ORDER BY id", [businessId]);
    const [orderItems] = await connection.query(
      "SELECT oi.* FROM order_items oi JOIN sales s ON s.id = oi.sale_id WHERE s.business_id = ? ORDER BY oi.id",
      [businessId],
    );
    const backup = {
      format: "smartbiz-business-backup-v1",
      createdAt: new Date().toISOString(),
      target: { id: user.id, name: user.name, email: user.email, businessId, businessName: user.business_name },
      data: { products, customers, sales, orderItems },
    };
    const backupDirectory = path.join(__dirname, "..", "backups");
    await fs.mkdir(backupDirectory, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDirectory, `business-${businessId}-before-reset-${timestamp}.json`);
    await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), { encoding: "utf8", flag: "wx" });

    // Deleting sales first lets fk_items_sale cascade only this tenant's order
    // items. Customers and products can then be removed without disabling FKs.
    const [salesResult] = await connection.query("DELETE FROM sales WHERE business_id = ?", [businessId]);
    const [customersResult] = await connection.query("DELETE FROM customers WHERE business_id = ?", [businessId]);
    const [productsResult] = await connection.query("DELETE FROM products WHERE business_id = ?", [businessId]);
    const remaining = {
      products: await count(connection, "SELECT COUNT(*) AS count FROM products WHERE business_id = ?", [businessId]),
      customers: await count(connection, "SELECT COUNT(*) AS count FROM customers WHERE business_id = ?", [businessId]),
      sales: await count(connection, "SELECT COUNT(*) AS count FROM sales WHERE business_id = ?", [businessId]),
      orderItems: await count(connection, "SELECT COUNT(*) AS count FROM order_items oi JOIN sales s ON s.id = oi.sale_id WHERE s.business_id = ?", [businessId]),
    };
    if (Object.values(remaining).some(Boolean)) throw new Error("Post-reset verification found remaining tenant data; transaction was rolled back.");
    await connection.commit();
    console.log(JSON.stringify({
      backupPath,
      target: { userId: user.id, email: user.email, verified: Boolean(user.email_verified), businessId },
      deleted: { sales: salesResult.affectedRows, customers: customersResult.affectedRows, products: productsResult.affectedRows, orderItems: orderItems.length },
      remaining,
    }, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("Business reset failed:", error.message);
  process.exitCode = 1;
});
