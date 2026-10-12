-- Migration: Add business scoping (Phase 6)
-- Run this once on an existing database via:
-- mysql -u your_user -p smartbiz < database/migrations/001_add_business_id.sql

CREATE TABLE IF NOT EXISTS businesses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Seed business
INSERT IGNORE INTO businesses (id, name) VALUES (1, 'Demo Business');

-- users
ALTER TABLE users ADD COLUMN business_id INT NOT NULL DEFAULT 1;
ALTER TABLE users ADD CONSTRAINT fk_users_business FOREIGN KEY (business_id) REFERENCES businesses(id);
ALTER TABLE users ALTER COLUMN business_id DROP DEFAULT;

-- customers
ALTER TABLE customers ADD COLUMN business_id INT NOT NULL DEFAULT 1;
ALTER TABLE customers ADD CONSTRAINT fk_customers_business FOREIGN KEY (business_id) REFERENCES businesses(id);
ALTER TABLE customers ALTER COLUMN business_id DROP DEFAULT;

-- products
ALTER TABLE products ADD COLUMN business_id INT NOT NULL DEFAULT 1;
ALTER TABLE products ADD CONSTRAINT fk_products_business FOREIGN KEY (business_id) REFERENCES businesses(id);
ALTER TABLE products DROP INDEX sku;
ALTER TABLE products ADD UNIQUE INDEX uk_products_business_sku (business_id, sku);
ALTER TABLE products ALTER COLUMN business_id DROP DEFAULT;

-- sales
ALTER TABLE sales ADD COLUMN business_id INT NOT NULL DEFAULT 1;
ALTER TABLE sales ADD CONSTRAINT fk_sales_business FOREIGN KEY (business_id) REFERENCES businesses(id);
ALTER TABLE sales ADD INDEX idx_sales_business_created (business_id, created_at);
ALTER TABLE sales ALTER COLUMN business_id DROP DEFAULT;
