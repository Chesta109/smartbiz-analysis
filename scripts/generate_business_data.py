"""
SmartBiz Insight - realistic demo data generator

Creates data for the existing schema:
users, customers, products, sales, order_items

Usage:
  1) Install dependencies:
       pip install mysql-connector-python bcrypt

  2) Set database environment variables (or edit the defaults below):
       DB_HOST=localhost
       DB_PORT=3306
       DB_USER=root
       DB_PASSWORD= your_mysql_password
       DB_NAME=smartbiz_insight

  3) Run:
       python generate_business_data.py

The script is intentionally idempotent for demo development:
it clears the five business tables first, then inserts a fresh dataset.
DO NOT run this against a production database.
"""

import os
import random
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

import bcrypt
import mysql.connector

random.seed(42)

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.environ["DB_PASSWORD"],
    "database": os.getenv("DB_NAME", "smartbiz_insight"),
}

N_USERS = 8
N_CUSTOMERS = 150
N_PRODUCTS = 40
N_SALES = 1000

FIRST_NAMES = [
    "Aarav", "Aditi", "Arjun", "Ananya", "Rohan", "Isha", "Karan", "Meera",
    "Rahul", "Priya", "Vikram", "Neha", "Aditya", "Kavya", "Sahil", "Riya",
    "Aman", "Simran", "Nikhil", "Pooja", "Yash", "Tanya", "Dev", "Sneha"
]
LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Mehta", "Singh", "Kapoor", "Malhotra",
    "Joshi", "Bansal", "Agarwal", "Chopra", "Sethi", "Khanna", "Arora"
]
CITIES = [
    "Delhi", "Noida", "Gurugram", "Ghaziabad", "Lucknow", "Jaipur",
    "Chandigarh", "Amritsar", "Dehradun", "Moradabad"
]

PRODUCT_CATALOG = [
    ("Wireless Mouse", "Electronics", 400, 699),
    ("Mechanical Keyboard", "Electronics", 900, 1499),
    ("USB-C Cable", "Accessories", 120, 299),
    ("Laptop Stand", "Accessories", 500, 899),
    ("Bluetooth Headphones", "Audio", 1200, 1999),
    ("Wireless Earbuds", "Audio", 1500, 2499),
    ("Webcam", "Electronics", 900, 1599),
    ("USB Hub", "Accessories", 350, 699),
    ("Power Bank", "Mobile Accessories", 700, 1199),
    ("Phone Charger", "Mobile Accessories", 350, 649),
    ("Bluetooth Speaker", "Audio", 1000, 1799),
    ("Smart Watch", "Wearables", 1800, 2999),
    ("Fitness Band", "Wearables", 900, 1599),
    ("Phone Case", "Mobile Accessories", 120, 299),
    ("Screen Protector", "Mobile Accessories", 70, 199),
    ("LED Desk Lamp", "Home Office", 450, 799),
    ("Office Chair", "Furniture", 3500, 5999),
    ("Study Table", "Furniture", 4000, 6999),
    ("Notebook", "Stationery", 50, 99),
    ("Premium Notebook", "Stationery", 120, 249),
    ("Gel Pen Pack", "Stationery", 80, 149),
    ("Desk Organizer", "Stationery", 180, 349),
    ("Backpack", "Bags", 900, 1599),
    ("Laptop Backpack", "Bags", 1400, 2399),
    ("Travel Adapter", "Accessories", 500, 899),
    ("HDMI Cable", "Accessories", 180, 399),
    ("Keyboard Wrist Rest", "Accessories", 250, 499),
    ("Mouse Pad", "Accessories", 100, 249),
    ("Monitor Stand", "Home Office", 650, 1099),
    ("Extension Board", "Electronics", 350, 699),
    ("Table Fan", "Home Office", 1100, 1899),
    ("Mini Vacuum Cleaner", "Home Office", 800, 1399),
    ("Ring Light", "Electronics", 700, 1299),
    ("Microphone", "Audio", 1300, 2199),
    ("Portable SSD", "Electronics", 3000, 4499),
    ("USB Flash Drive", "Storage", 350, 699),
    ("Memory Card", "Storage", 400, 799),
    ("External Hard Drive", "Storage", 3200, 4999),
    ("Router", "Networking", 1200, 1999),
    ("Wi-Fi Range Extender", "Networking", 900, 1599),
]

def money(value):
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def make_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

def make_email(name, number):
    clean = name.lower().replace(" ", ".")
    return f"{clean}{number}@example.com"

def make_password_hash():
    return bcrypt.hashpw(b"Demo@12345", bcrypt.gensalt(rounds=10)).decode()

def connect():
    return mysql.connector.connect(**DB_CONFIG)

def clear_tables(cur):
    cur.execute("SET FOREIGN_KEY_CHECKS = 0")
    for table in ("order_items", "sales", "products", "customers", "users"):
        cur.execute(f"TRUNCATE TABLE {table}")
    cur.execute("SET FOREIGN_KEY_CHECKS = 1")

def insert_users(cur):
    rows = []
    for i in range(1, N_USERS + 1):
        role = "owner" if i == 1 else ("manager" if i <= 3 else "viewer")
        name = make_name()
        rows.append((name, f"employee{i}@smartbiz.demo", make_password_hash(), role))
    cur.executemany(
        """INSERT INTO users (name, email, password_hash, role)
           VALUES (%s, %s, %s, %s)""",
        rows
    )

def insert_customers(cur):
    rows = []
    for i in range(1, N_CUSTOMERS + 1):
        name = make_name()
        rows.append((
            name,
            make_email(name, i),
            f"+91-{random.randint(7000000000, 9999999999)}",
            f"{random.randint(10, 999)}, {random.choice(CITIES)}"
        ))
    cur.executemany(
        """INSERT INTO customers (name, email, phone, address)
           VALUES (%s, %s, %s, %s)""",
        rows
    )

def insert_products(cur):
    rows = []
    for i, (name, category, cost, price) in enumerate(PRODUCT_CATALOG, 1):
        # Some products intentionally have low stock to create useful inventory insights.
        if i in {3, 8, 12, 17, 25, 34}:
            stock = random.randint(2, 8)
            reorder = random.randint(8, 15)
        elif i in {18, 35, 38}:
            stock = random.randint(5, 15)
            reorder = random.randint(10, 20)
        else:
            stock = random.randint(20, 100)
            reorder = random.randint(8, 20)

        rows.append((
            name,
            f"SKU-{category[:3].upper()}-{i:03d}",
            category,
            money(price),
            money(cost),
            stock,
            reorder
        ))

    cur.executemany(
        """INSERT INTO products
           (name, sku, category, price, cost, stock_qty, reorder_level)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        rows
    )

def get_ids(cur, table):
    cur.execute(f"SELECT id FROM {table} ORDER BY id")
    return [row[0] for row in cur.fetchall()]

def insert_sales_and_items(cur):
    customer_ids = get_ids(cur, "customers")
    user_ids = get_ids(cur, "users")

    cur.execute("SELECT id, price, cost FROM products ORDER BY id")
    products = cur.fetchall()

    # Product weights create realistic best/worst sellers.
    weights = []
    for pid, price, cost in products:
        if pid in {1, 2, 5, 6, 10, 12, 22, 24}:
            weights.append(5.0)
        elif pid in {17, 18, 35, 37}:
            weights.append(0.7)
        else:
            weights.append(2.0)

    start_date = datetime.now() - timedelta(days=365)

    sales_rows = []
    item_rows = []
    stock_used = {pid: 0 for pid, _, _ in products}

    for _ in range(N_SALES):
        # Mild upward trend over the year plus weekend variation.
        day_offset = random.randint(0, 364)
        created = start_date + timedelta(
            days=day_offset,
            hours=random.randint(9, 20),
            minutes=random.randint(0, 59)
        )

        customer_id = random.choice(customer_ids)
        user_id = random.choice(user_ids)

        status_roll = random.random()
        if status_roll < 0.94:
            status = "completed"
        elif status_roll < 0.97:
            status = "pending"
        else:
            status = "refunded"

        payment_method = random.choices(
            ["upi", "card", "cash", "other"],
            weights=[45, 30, 20, 5],
            k=1
        )[0]

        # Insert sale first so we get its auto-increment ID.
        cur.execute(
            """INSERT INTO sales
               (customer_id, user_id, total_amount, payment_method, status, created_at)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (customer_id, user_id, Decimal("0.00"), payment_method, status, created)
        )
        sale_id = cur.lastrowid

        # 1-4 line items per sale.
        n_items = random.choices([1, 2, 3, 4], weights=[55, 28, 12, 5], k=1)[0]
        chosen = random.choices(products, weights=weights, k=n_items)

        total = Decimal("0.00")
        for pid, base_price, cost in chosen:
            quantity = random.choices([1, 2, 3, 4], weights=[65, 25, 8, 2], k=1)[0]

            # Small variation from catalogue price to mimic discounts/negotiation.
            discount = random.choice([0, 0, 0, 0.05, 0.10])
            unit_price = money(Decimal(str(base_price)) * (Decimal("1") - Decimal(str(discount))))
            subtotal = money(unit_price * quantity)
            total += subtotal
            stock_used[pid] += quantity

            item_rows.append((sale_id, pid, quantity, unit_price, subtotal))

        cur.execute(
            "UPDATE sales SET total_amount = %s WHERE id = %s",
            (money(total), sale_id)
        )

    cur.executemany(
        """INSERT INTO order_items
           (sale_id, product_id, quantity, unit_price, subtotal)
           VALUES (%s, %s, %s, %s, %s)""",
        item_rows
    )

    # Bring stock down according to completed/refunded/pending sales approximately.
    # Keep stock non-negative and preserve useful low-stock examples.
    for pid, used in stock_used.items():
        cur.execute("SELECT stock_qty FROM products WHERE id = %s", (pid,))
        original = cur.fetchone()[0]
        remaining = max(0, original - int(used * 0.35))
        cur.execute(
            "UPDATE products SET stock_qty = %s WHERE id = %s",
            (remaining, pid)
        )

def verify(cur):
    print("\n--- Verification ---")
    for table in ("users", "customers", "products", "sales", "order_items"):
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        print(f"{table:12s}: {cur.fetchone()[0]} rows")

    cur.execute("""
        SELECT
            COALESCE(SUM(total_amount), 0),
            COUNT(*)
        FROM sales
        WHERE status = 'completed'
    """)
    revenue, orders = cur.fetchone()
    print(f"Completed revenue: ₹{revenue:,.2f}")
    print(f"Completed orders:  {orders}")

    cur.execute("""
        SELECT COUNT(*)
        FROM products
        WHERE stock_qty <= reorder_level
    """)
    print(f"Low-stock products: {cur.fetchone()[0]}")

def main():
    print("Connecting to MySQL...")
    conn = connect()
    cur = conn.cursor()

    try:
        print("WARNING: This will TRUNCATE users, customers, products, sales and order_items.")
        print(f"Database: {DB_CONFIG['database']} @ {DB_CONFIG['host']}:{DB_CONFIG['port']}")
        answer = input("Type YES to continue: ").strip()
        if answer != "YES":
            print("Cancelled.")
            return

        clear_tables(cur)
        insert_users(cur)
        insert_customers(cur)
        insert_products(cur)
        insert_sales_and_items(cur)

        conn.commit()
        verify(cur)
        print("\nDone. Your SmartBiz database now contains realistic demo data.")
        print("Demo user password for generated users: Demo@12345")
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
