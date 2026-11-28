-- ============================================
-- SCHEMA DATABASE: cipta_jaya
-- ============================================

CREATE DATABASE IF NOT EXISTS cipta_jaya
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cipta_jaya;

-- Tabel Admin
CREATE TABLE IF NOT EXISTS admins (
  id          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  username    VARCHAR(80)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL DEFAULT 'Admin',
  role        VARCHAR(20)  NOT NULL DEFAULT 'admin',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Tabel Sesi
CREATE TABLE IF NOT EXISTS sessions (
  session_id  VARCHAR(255) NOT NULL,
  expires     INT UNSIGNED NOT NULL,
  data        TEXT,
  PRIMARY KEY (session_id),
  INDEX idx_expires (expires)
) ENGINE=InnoDB;

-- Tabel Produk
CREATE TABLE IF NOT EXISTS products (
  id              VARCHAR(36)    NOT NULL DEFAULT (UUID()),
  name            VARCHAR(180)   NOT NULL,
  slug            VARCHAR(220)   NOT NULL UNIQUE,
  sku             VARCHAR(80)    NOT NULL UNIQUE,
  category        VARCHAR(100)   NOT NULL,
  description     TEXT           DEFAULT '',
  price           BIGINT         NOT NULL DEFAULT 0,
  wholesale_price BIGINT         DEFAULT NULL,
  wholesale_min   INT UNSIGNED   DEFAULT NULL,
  unit            VARCHAR(40)    NOT NULL DEFAULT 'pcs',
  stock_qty       INT UNSIGNED   NOT NULL DEFAULT 0,
  image           VARCHAR(2048)  DEFAULT '',
  gallery         JSON           DEFAULT NULL,
  benefits        JSON           DEFAULT NULL,
  specifications  JSON           DEFAULT NULL,
  rating          DECIMAL(2,1)   DEFAULT NULL,
  review_count    INT UNSIGNED   NOT NULL DEFAULT 0,
  sold_count      INT UNSIGNED   NOT NULL DEFAULT 0,
  featured        TINYINT(1)     NOT NULL DEFAULT 0,
  published       TINYINT(1)     NOT NULL DEFAULT 0,
  archived        TINYINT(1)     NOT NULL DEFAULT 0,
  created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_category (category),
  INDEX idx_published (published, archived),
  INDEX idx_featured (featured)
) ENGINE=InnoDB;

-- Tabel Pesanan
CREATE TABLE IF NOT EXISTS orders (
  id               VARCHAR(36)  NOT NULL,
  customer_name    VARCHAR(100) NOT NULL,
  delivery_address VARCHAR(500) NOT NULL,
  notes            VARCHAR(300) DEFAULT NULL,
  total_amount     BIGINT       NOT NULL DEFAULT 0,
  status           VARCHAR(30)  NOT NULL DEFAULT 'pending_confirmation',
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Tabel Item Pesanan
CREATE TABLE IF NOT EXISTS order_items (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id     VARCHAR(36)     NOT NULL,
  product_id   VARCHAR(36)     NOT NULL,
  product_name VARCHAR(180)    NOT NULL,
  sku          VARCHAR(80)     NOT NULL,
  unit         VARCHAR(40)     NOT NULL,
  unit_price   BIGINT          NOT NULL,
  quantity     INT UNSIGNED    NOT NULL,
  line_total   BIGINT          NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_order (order_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;
