"""Create or reset the isolated, shared SmartBiz demonstration tenant.

Usage: python scripts/generate_business_data.py --demo --yes [--reset]
"""
import argparse
import os
import random
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
random.seed(42)
DB_CONFIG = {"host": os.getenv("DB_HOST", "127.0.0.1"), "port": int(os.getenv("DB_PORT", "3306")), "user": os.getenv("DB_USER", "root"), "password": os.getenv("DB_PASSWORD", ""), "database": os.getenv("DB_NAME", "smartbiz_insight")}
DEMO_EMAIL = os.getenv("DEMO_ACCOUNT_EMAIL", "").strip().lower()
DEMO_BUSINESS_NAME = os.getenv("DEMO_BUSINESS_NAME", "SmartBiz Shared Demo")
DEMO_ACCOUNT_NAME = os.getenv("DEMO_ACCOUNT_NAME", "SmartBiz Demo Access")
# Hash of an unrecoverable random value. Demo sessions are authenticated only
# by the server-side DEMO_ACCESS_PASSWORD_HASH, not by this account password.
DISABLED_LOGIN_HASH = "$2b$12$rr7fhI/0KIOfOmV4qdW1e.U3t5PrEJrL.vOXFm9.0okgnyS5FJeMG"

PRODUCT_CATALOG = [
    ("Wireless Mouse", "Electronics", 400, 699), ("Mechanical Keyboard", "Electronics", 900, 1499), ("USB-C Cable", "Accessories", 120, 299), ("Laptop Stand", "Accessories", 500, 899), ("Bluetooth Headphones", "Audio", 1200, 1999), ("Wireless Earbuds", "Audio", 1500, 2499), ("Webcam", "Electronics", 900, 1599), ("USB Hub", "Accessories", 350, 699), ("Power Bank", "Mobile Accessories", 700, 1199), ("Phone Charger", "Mobile Accessories", 350, 649), ("Bluetooth Speaker", "Audio", 1000, 1799), ("Smart Watch", "Wearables", 1800, 2999), ("Fitness Band", "Wearables", 900, 1599), ("Phone Case", "Mobile Accessories", 120, 299), ("Screen Protector", "Mobile Accessories", 70, 199), ("LED Desk Lamp", "Home Office", 450, 799), ("Office Chair", "Furniture", 3500, 5999), ("Study Table", "Furniture", 4000, 6999), ("Notebook", "Stationery", 50, 99), ("Premium Notebook", "Stationery", 120, 249), ("Gel Pen Pack", "Stationery", 80, 149), ("Desk Organizer", "Stationery", 180, 349), ("Backpack", "Bags", 900, 1599), ("Laptop Backpack", "Bags", 1400, 2399), ("Travel Adapter", "Accessories", 500, 899), ("HDMI Cable", "Accessories", 180, 399), ("Keyboard Wrist Rest", "Accessories", 250, 499), ("Mouse Pad", "Accessories", 100, 249), ("Monitor Stand", "Home Office", 650, 1099), ("Extension Board", "Electronics", 350, 699), ("Table Fan", "Home Office", 1100, 1899), ("Mini Vacuum Cleaner", "Home Office", 800, 1399), ("Ring Light", "Electronics", 700, 1299), ("Microphone", "Audio", 1300, 2199), ("Portable SSD", "Electronics", 3000, 4499), ("USB Flash Drive", "Storage", 350, 699), ("Memory Card", "Storage", 400, 799), ("External Hard Drive", "Storage", 3200, 4999), ("Router", "Networking", 1200, 1999), ("Wi-Fi Range Extender", "Networking", 900, 1599),
]
FIRST_NAMES = ["Aarav", "Aditi", "Arjun", "Ananya", "Isha", "Karan", "Meera", "Rahul", "Priya", "Vikram", "Neha", "Kavya"]
LAST_NAMES = ["Sharma", "Verma", "Gupta", "Mehta", "Singh", "Kapoor", "Joshi", "Bansal"]
CITIES = ["Delhi", "Noida", "Gurugram", "Lucknow", "Jaipur", "Chandigarh"]


def money(value):
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def get_or_create_demo_context(cursor):
    if not DEMO_EMAIL or "@" not in DEMO_EMAIL:
        raise ValueError("DEMO_ACCOUNT_EMAIL must be configured before seeding the shared demo.")
    cursor.execute("SELECT id, business_id, name, email_verified, role FROM users WHERE email = %s FOR UPDATE", (DEMO_EMAIL,))
    user = cursor.fetchone()
    if user:
        user_id, business_id, name, verified, role = user
        if name != DEMO_ACCOUNT_NAME or not verified or role != "manager" or business_id is None:
            raise ValueError("DEMO_ACCOUNT_EMAIL belongs to an existing non-demo account; no records were changed.")
        cursor.execute("SELECT name FROM businesses WHERE id = %s FOR UPDATE", (business_id,))
        business = cursor.fetchone()
        if not business or business[0] != DEMO_BUSINESS_NAME:
            raise ValueError("Configured demo account is not attached to the expected demo business; no records were changed.")
        return business_id, user_id
    cursor.execute("INSERT INTO businesses (name) VALUES (%s)", (DEMO_BUSINESS_NAME,))
    business_id = cursor.lastrowid
    cursor.execute("INSERT INTO users (business_id, name, email, password_hash, role, email_verified) VALUES (%s, %s, %s, %s, 'manager', 1)", (business_id, DEMO_ACCOUNT_NAME, DEMO_EMAIL, DISABLED_LOGIN_HASH))
    return business_id, cursor.lastrowid


def reset_demo_data(cursor, business_id):
    # Order items are removed by the foreign-key cascade from sales.
    cursor.execute("DELETE FROM sales WHERE business_id = %s", (business_id,))
    cursor.execute("DELETE FROM customers WHERE business_id = %s", (business_id,))
    cursor.execute("DELETE FROM products WHERE business_id = %s", (business_id,))


def seed(cursor, business_id, user_id):
    cursor.execute("SELECT COUNT(*) FROM products WHERE business_id = %s AND sku LIKE 'DEMO-%%'", (business_id,))
    if cursor.fetchone()[0]:
        raise ValueError("Demo data already exists for this business; no records were changed.")

    customers = []
    for i in range(1, 151):
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        customers.append((business_id, name, f"demo.customer.{i}@example.test", f"+91-{random.randint(7000000000, 9999999999)}", f"{random.randint(10, 999)}, {random.choice(CITIES)}"))
    cursor.executemany("INSERT INTO customers (business_id, name, email, phone, address) VALUES (%s, %s, %s, %s, %s)", customers)
    cursor.execute("SELECT id FROM customers WHERE business_id = %s AND email LIKE 'demo.customer.%%@example.test' ORDER BY id", (business_id,))
    customer_ids = [row[0] for row in cursor.fetchall()]
    if len(customer_ids) != len(customers):
        raise RuntimeError("Could not resolve every newly inserted demo customer.")

    products = []
    for i, (name, category, cost, price) in enumerate(PRODUCT_CATALOG, 1):
        low = i in {3, 8, 12, 17, 25, 34}
        products.append((business_id, name, f"DEMO-{category[:3].upper()}-{i:03d}", category, money(price), money(cost), random.randint(2, 8) if low else random.randint(35, 110), random.randint(8, 15) if low else random.randint(8, 20)))
    cursor.executemany("INSERT INTO products (business_id, name, sku, category, price, cost, stock_qty, reorder_level) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)", products)
    cursor.execute("SELECT id, price FROM products WHERE business_id = %s AND sku LIKE 'DEMO-%%' ORDER BY id", (business_id,))
    product_rows = cursor.fetchall()

    start = datetime.now() - timedelta(days=365)
    for _ in range(1000):
        created = start + timedelta(days=random.randint(0, 364), hours=random.randint(9, 20), minutes=random.randint(0, 59))
        status = random.choices(["completed", "pending", "refunded"], weights=[94, 3, 3])[0]
        payment = random.choices(["upi", "card", "cash", "other"], weights=[45, 30, 20, 5])[0]
        cursor.execute("INSERT INTO sales (business_id, customer_id, user_id, total_amount, payment_method, status, created_at) VALUES (%s, %s, %s, 0, %s, %s, %s)", (business_id, random.choice(customer_ids), user_id, payment, status, created))
        sale_id, total = cursor.lastrowid, Decimal("0.00")
        for product_id, price in random.choices(product_rows, k=random.choices([1, 2, 3, 4], weights=[55, 28, 12, 5])[0]):
            quantity = random.choices([1, 2, 3, 4], weights=[65, 25, 8, 2])[0]
            unit_price = money(Decimal(str(price)) * Decimal(str(random.choice([1, 1, 1, .95, .90]))))
            subtotal = money(unit_price * quantity)
            total += subtotal
            cursor.execute("INSERT INTO order_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES (%s, %s, %s, %s, %s)", (sale_id, product_id, quantity, unit_price, subtotal))
        cursor.execute("UPDATE sales SET total_amount = %s WHERE id = %s", (money(total), sale_id))


def verify(cursor, business_id):
    counts = {}
    for table in ("products", "customers", "sales"):
        cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE business_id = %s", (business_id,))
        counts[table] = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM order_items oi JOIN sales s ON s.id = oi.sale_id WHERE s.business_id = %s", (business_id,))
    counts["order_items"] = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM sales s LEFT JOIN customers c ON c.id = s.customer_id LEFT JOIN users u ON u.id = s.user_id WHERE s.business_id = %s AND (c.id IS NULL OR c.business_id <> s.business_id OR u.id IS NULL OR u.business_id <> s.business_id)", (business_id,))
    if cursor.fetchone()[0]:
        raise RuntimeError("Cross-business reference detected.")
    print("Seed verification:", ", ".join(f"{key}={value}" for key, value in counts.items()))


def main():
    parser = argparse.ArgumentParser(description="Seed the isolated shared demonstration business.")
    parser.add_argument("--demo", action="store_true", help="target only the configured shared demo business")
    parser.add_argument("--reset", action="store_true", help="replace only the configured demo business dataset")
    parser.add_argument("--yes", action="store_true", help="confirm this write operation")
    args = parser.parse_args()
    if not args.demo or not args.yes:
        parser.error("--demo and --yes are required; this command writes only the configured demo tenant.")
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    try:
        conn.start_transaction()
        business_id, user_id = get_or_create_demo_context(cursor)
        if args.reset:
            reset_demo_data(cursor, business_id)
        seed(cursor, business_id, user_id)
        verify(cursor, business_id)
        conn.commit()
        print("Demo data committed for the configured shared demo business.")
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
