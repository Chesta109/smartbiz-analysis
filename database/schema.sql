-- SmartBiz Insight — Schema (per ER diagram + ARCHITECTURE.md decisions)
-- No ORM. Plain SQL, referenced 1:1 by models/.

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(160)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('owner','manager','viewer') NOT NULL DEFAULT 'viewer',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE customers (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120)  NOT NULL,
  email       VARCHAR(160),
  phone       VARCHAR(30),
  address     VARCHAR(255),
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customers_email (email)
) ENGINE=InnoDB;

-- No standalone `inventory` table: stock lives on products (Section 4.2 of doc).
CREATE TABLE products (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(160)   NOT NULL,
  sku            VARCHAR(60)    NOT NULL UNIQUE,
  category       VARCHAR(80),
  price          DECIMAL(10,2)  NOT NULL,
  cost           DECIMAL(10,2)  NOT NULL DEFAULT 0,
  stock_qty      INT            NOT NULL DEFAULT 0,
  reorder_level  INT            NOT NULL DEFAULT 5,
  created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_category (category)
) ENGINE=InnoDB;

CREATE TABLE sales (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  customer_id    INT,
  user_id        INT NOT NULL,
  total_amount   DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method ENUM('cash','card','upi','other') NOT NULL DEFAULT 'cash',
  status         ENUM('completed','refunded','pending') NOT NULL DEFAULT 'completed',
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_sales_user     FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE RESTRICT,
  INDEX idx_sales_created_at (created_at)
) ENGINE=InnoDB;

-- Line items for a sale; product row's stock_qty is decremented in the same
-- DB transaction that inserts these (owned by services/salesService.js).
CREATE TABLE order_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  sale_id     INT NOT NULL,
  product_id  INT NOT NULL,
  quantity    INT NOT NULL,
  unit_price  DECIMAL(10,2) NOT NULL,
  subtotal    DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_items_sale    FOREIGN KEY (sale_id)    REFERENCES sales(id)    ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_items_sale (sale_id),
  INDEX idx_items_product (product_id)
) ENGINE=InnoDB;
