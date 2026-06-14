"""TikTok 店铺看板 - PostgreSQL API Server"""
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="TikTok Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_conn():
    return psycopg2.connect("dbname=tiktok_dashboard", cursor_factory=RealDictCursor)


# ── Root ──
@app.get("/")
def root():
    return {
        "name": "TikTok Dashboard API",
        "endpoints": [
            "GET /api/user/me",
            "GET /api/shops",
            "GET /api/shops/performance",
            "GET /api/orders/daily?date=2026-06-12",
            "GET /api/dashboard/overview",
        ],
    }

# ── 1. 当前用户信息 ──
@app.get("/api/user/me")
def user_me():
    return {
        "code": 0,
        "data": {
            "name": "管理员",
            "role": "admin",
            "group": "",
            "department": "",
            "team": "",
        },
    }


# ── 2. 店铺列表 ──
@app.get("/api/shops")
def get_shops():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('SELECT * FROM "shops"')
    rows = cur.fetchall()
    cur.close(); conn.close()
    return {"code": 0, "data": rows}


# ── 3. 店铺表现 ──
@app.get("/api/shops/performance")
def get_performance():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('SELECT * FROM "shop_performance"')
    rows = cur.fetchall()
    cur.close(); conn.close()
    return {"code": 0, "data": rows}


# ── 4. 日订单（每日每店取最后一条记录） ──
@app.get("/api/orders/daily")
def get_daily_orders(date: str = Query(None)):
    """Return deduplicated daily orders: last record per shop per day."""
    conn = get_conn()
    cur = conn.cursor()
    # 去重：同一店铺同一天可能有多条记录，取最新的一条（按同步时间 DESC）
    base_sql = """
        SELECT * FROM (
            SELECT *, ROW_NUMBER() OVER (
                PARTITION BY "店铺", SUBSTRING("同步时间", 1, 10)
                ORDER BY "同步时间" DESC
            ) AS _rn
            FROM "daily_orders"
        ) t WHERE _rn = 1
    """
    if date:
        cur.execute(base_sql + ' AND SUBSTRING("同步时间", 1, 10) = %s', (date,))
    else:
        cur.execute(base_sql)
    rows = cur.fetchall()
    for row in rows:
        row.pop("_rn", None)
    cur.close(); conn.close()
    return {"code": 0, "data": rows}


# ── 5. 聚合概览 ──
@app.get("/api/dashboard/overview")
def get_overview(date: str = Query(None)):
    import re
    conn = get_conn()
    cur = conn.cursor()

    date_filter = f"{date}%" if date else "%"

    cur.execute(
        'SELECT "今日商品交易总额", "昨日商品交易总额", "今日成交件数", "昨日成交件数", '
        '"今日商品访客数", "昨日商品访客数", "今日下单用户数", "昨日下单用户数" '
        'FROM ('
        '  SELECT DISTINCT ON ("店铺") * FROM "daily_orders" '
        '  WHERE "同步时间" LIKE %s ORDER BY "店铺", "同步时间" DESC'
        ') t',
        (date_filter,),
    )

    RATES = {"THB": 0.20, "MYR": 1.55, "VND": 0.00029, "PHP": 0.13}

    # 多币种 GMV 解析（与前端 aggregator.ts 逻辑一致，需保持同步）
    def parse_gmv(raw):
        if not raw: return 0
        s = raw.strip()
        currency = ""
        if s.startswith(("RM", "฿", "₱", "₫")):
            sym = s[0] if s[0] in "฿₱₫" else s[:2]
            s = s[len(sym):]
            currency = {"฿": "THB", "RM": "MYR", "₱": "PHP", "₫": "VND"}.get(sym, "")
        if s.endswith("₫"):
            s = s[:-1]
            currency = "VND"
        s = s.replace(",", "")
        if currency == "VND":
            s = s.replace(".", "")
        try:
            n = float(s) if s else 0
        except ValueError:
            return 0
        rate = RATES.get(currency, 1)
        return n * rate

    def safe_int(v):
        try: return int(v) if v else 0
        except: return 0

    todayGmv = yesterdayGmv = 0
    todayOrders = yesterdayOrders = 0
    todayVisitors = yesterdayVisitors = 0
    todayBuyers = yesterdayBuyers = 0

    for row in cur:
        todayGmv += parse_gmv(row["今日商品交易总额"])
        yesterdayGmv += parse_gmv(row["昨日商品交易总额"])
        todayOrders += safe_int(row["今日成交件数"])
        yesterdayOrders += safe_int(row["昨日成交件数"])
        todayVisitors += safe_int(row["今日商品访客数"])
        yesterdayVisitors += safe_int(row["昨日商品访客数"])
        todayBuyers += safe_int(row["今日下单用户数"])
        yesterdayBuyers += safe_int(row["昨日下单用户数"])

    # Shop counts
    cur2 = conn.cursor()
    cur2.execute('SELECT count(*) AS cnt FROM "shops"')
    shopCount = cur2.fetchone()["cnt"]
    cur2.execute(
        """SELECT count(*) AS cnt FROM "shop_performance"
           WHERE "达标数" LIKE '6%%'"""
    )
    qualifiedCount = cur2.fetchone()["cnt"]
    cur2.execute(
        """SELECT
            COALESCE(AVG(NULLIF(regexp_replace("店铺表现-商责店铺差评率(目标值＜5%)", '%', '', 'g'), '')::numeric), 0) AS "avgBadReviewRate",
            COALESCE(AVG(NULLIF("店铺表现-违规分(目标＜12)", '')::numeric), 0) AS "avgViolationScore"
        FROM "shop_performance" """
    )
    avgs = cur2.fetchone()
    cur2.close()

    agg = {
        "todayGmv": todayGmv,
        "yesterdayGmv": yesterdayGmv,
        "todayOrders": todayOrders,
        "yesterdayOrders": yesterdayOrders,
        "todayVisitors": todayVisitors,
        "yesterdayVisitors": yesterdayVisitors,
        "todayBuyers": todayBuyers,
        "yesterdayBuyers": yesterdayBuyers,
        "shopCount": shopCount,
        "qualifiedCount": qualifiedCount,
        "avgBadReviewRate": round(float(avgs["avgBadReviewRate"] or 0), 2),
        "avgViolationScore": round(float(avgs["avgViolationScore"] or 0), 2),
    }

    cur.close(); conn.close()
    return {"code": 0, "data": agg}


print("🚀 API server ready: http://localhost:8000")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
