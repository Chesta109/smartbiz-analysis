-- Synthetic demo data only. No real business data ever committed here.
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Demo Owner', 'owner@demo.com', '$2b$10$replaceWithRealBcryptHash', 'owner');

INSERT INTO customers (name, email, phone) VALUES
  ('Walk-in Customer', NULL, NULL);

INSERT INTO products (name, sku, category, price, cost, stock_qty, reorder_level) VALUES
  ('Sample Widget', 'SKU-0001', 'General', 199.00, 120.00, 50, 10);
