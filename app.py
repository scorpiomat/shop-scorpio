from flask import Flask, render_template, request, jsonify
import sqlite3
import uuid
from pathlib import Path

app = Flask(__name__)
DATABASE = Path(__file__).with_name("scorpio_store.db")

GAMES = [
    {
        "id": "ml",
        "name": "Mobile Legends",
        "unit": "Diamond",
        "image": "mobile-legends.jpg",
        "needs_server": True
    },
    {
        "id": "naruto",
        "name": "Naruto",
        "unit": "Paket Game",
        "image": "naruto.jpg",
        "needs_server": False
    },
    {
        "id": "pubg",
        "name": "PUBG Mobile",
        "unit": "UC",
        "image": "pubg.jpg",
        "needs_server": False
    },
    {
        "id": "hok",
        "name": "Honor of Kings",
        "unit": "Tokens",
        "image": "honor-of-kings.jpg",
        "needs_server": False
    }
]

PACKAGES = [
    {"id": "p1", "name": "Starter", "amount": 86, "price": 15000},
    {"id": "p2", "name": "Basic", "amount": 172, "price": 29000},
    {"id": "p3", "name": "Plus", "amount": 257, "price": 43000},
    {"id": "p4", "name": "Pro", "amount": 344, "price": 57000},
    {"id": "p5", "name": "Elite", "amount": 514, "price": 85000}
]

PAYMENTS = {
    "qris": "QRIS",
    "ewallet": "E-Wallet",
    "virtual_account": "Virtual Account"
}


def get_db():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with get_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                order_code TEXT PRIMARY KEY,
                game_id TEXT NOT NULL,
                game_name TEXT NOT NULL,
                player_id TEXT NOT NULL,
                server_id TEXT,
                package_id TEXT NOT NULL,
                package_name TEXT NOT NULL,
                amount INTEGER NOT NULL,
                price INTEGER NOT NULL,
                payment_method TEXT NOT NULL,
                status TEXT NOT NULL
            )
        """)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/games")
def get_games():
    return jsonify(GAMES)


@app.route("/api/packages")
def get_packages():
    return jsonify(PACKAGES)


@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.get_json(silent=True) or {}

    game = next(
        (item for item in GAMES if item["id"] == data.get("game_id")),
        None
    )

    package = next(
        (item for item in PACKAGES if item["id"] == data.get("package_id")),
        None
    )

    player_id = str(data.get("player_id", "")).strip()
    server_id = str(data.get("server_id", "")).strip()
    payment = data.get("payment_method", "")

    if not game:
        return jsonify(error="Game tidak valid."), 400

    if not player_id:
        return jsonify(error="User ID wajib diisi."), 400

    if game["needs_server"] and not server_id:
        return jsonify(error="Server ID wajib diisi."), 400

    if not package:
        return jsonify(error="Paket tidak valid."), 400

    if payment not in PAYMENTS:
        return jsonify(error="Pilih metode pembayaran."), 400

    order_code = "SC-" + uuid.uuid4().hex[:8].upper()
    status = "Menunggu Pembayaran"

    with get_db() as db:
        db.execute("""
            INSERT INTO orders (
                order_code, game_id, game_name, player_id, server_id,
                package_id, package_name, amount, price,
                payment_method, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            order_code,
            game["id"],
            game["name"],
            player_id,
            server_id,
            package["id"],
            package["name"],
            package["amount"],
            package["price"],
            payment,
            status
        ))

    return jsonify({
        "message": "Pesanan berhasil dibuat.",
        "order_code": order_code,
        "game": game["name"],
        "amount": package["amount"],
        "price": package["price"],
        "status": status,
        "payment_note": (
            "Mode uji coba. Pembayaran dan pengiriman item game "
            "belum aktif."
        )
    }), 201


@app.route("/api/orders/<order_code>")
def check_order(order_code):
    with get_db() as db:
        order = db.execute(
            "SELECT * FROM orders WHERE order_code = ?",
            (order_code.upper(),)
        ).fetchone()

    if order is None:
        return jsonify(error="Pesanan tidak ditemukan."), 404

    return jsonify(dict(order))


init_db()

if __name__ == "__main__":
    app.run(debug=True)