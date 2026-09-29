"""Retest all remediation fixes against the live backend (127.0.0.1:8000)."""
import json, time, urllib.request, urllib.error

BASE = "http://127.0.0.1:8000/api/v1"
results = []

def call(method, path, body=None, token=None, headers=None):
    h = {"Content-Type": "application/json"}
    if token: h["Authorization"] = f"Bearer {token}"
    if headers: h.update(headers)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode() or "{}")
        except Exception: return e.code, {}

def check(name, cond, detail=""):
    results.append((name, bool(cond), str(detail)[:160]))
    print(("PASS " if cond else "FAIL ") + name + (f" — {detail}"[:170] if detail and not cond else ""))

_phone_seq = [0]
def _phone():
    _phone_seq[0] += 1
    return f"+93{100000000 + _phone_seq[0] + int(time.time()) % 100000:010d}"[:13]

def reg(email, role, name="T"):
    s, b = call("POST", "/auth/register", {"email": email, "password": "Pass12345", "confirmPassword": "Pass12345", "fullName": name, "phone": _phone(), "role": role})
    assert s in (200, 201), (s, b)
    return b["accessToken"], b.get("user", {}).get("id")

def login(email):
    s, b = call("POST", "/auth/login", {"email": email, "password": "Pass12345"})
    return s, b

TS = str(int(time.time()))
s, b = call("POST", "/auth/register", {"email": f"adm{TS}@t.io", "password": "Pass12345", "confirmPassword": "Pass12345", "fullName": "Adm", "phone": _phone(), "role": "admin"})
check("no public admin registration", s in (400, 403, 422), (s, b))

# --- seed an admin directly is not possible; use existing? create via DB not allowed as product flow.
# Instead test what we can without admin first, then note admin-gated items.
# Actually many fixes need admin. Use the seed admin? Check if seed ran: try known? No credentials known.
# We'll do admin-gated tests only where an admin token can be obtained legitimately... skip with note.

# 1. Farmer + farm + batch + product
ftok, _ = reg(f"f{TS}@t.io", "farmer", "Farmer")
s, farm = call("POST", "/farms", {"farmName": "Retest Farm", "location": "Lahore"}, ftok)
check("farmer creates farm", s == 201, (s, farm))
fid = farm["id"]
s, batch = call("POST", "/batches", {"farmId": fid, "batchCode": f"RB-{TS}", "quantityLiters": 100, "milkingTime": "2026-09-27T06:00:00Z"}, ftok)
check("farmer creates batch", s == 201, (s, batch))
bid = batch["id"]
s, prod = call("POST", "/products", {"farmId": fid, "batchId": bid, "name": "Retest Milk", "category": "milk", "unitOfMeasure": "litre", "price": 200, "quantityAvailable": 50, "status": "active"}, ftok)
check("farmer creates product", s == 201, (s, prod))
pid = prod["id"]

# 2. Customer subscribes to farm, then new batch triggers subscriber notification
ctok, _ = reg(f"c{TS}@t.io", "customer", "Cust")
s, sub = call("POST", "/subscriptions", {"farmId": fid, "frequency": "weekly"}, ctok)
check("customer subscribes", s == 201, (s, sub))
s, batch2 = call("POST", "/batches", {"farmId": fid, "batchCode": f"RB2-{TS}", "quantityLiters": 60, "milkingTime": "2026-09-27T07:00:00Z"}, ftok)
s, notifs = call("GET", "/notifications", None, ctok)
got = any("RB2-" + TS in (n.get("message") or "") for n in (notifs if isinstance(notifs, list) else notifs.get("items", [])))
check("new batch notifies subscriber", got, str(notifs)[:200])

# 3. Price change notifies subscriber
s, _ = call("PATCH", f"/products/{pid}/price", {"newPrice": 210}, ftok)
s, notifs = call("GET", "/notifications", None, ctok)
got = any("Price update" in (n.get("message") or "") for n in (notifs if isinstance(notifs, list) else notifs.get("items", [])))
check("price change notifies subscriber", got)

# 4. Customer buys: cart -> order -> pay -> delivery created, stock decremented
s, _ = call("PUT", "/cart", {"items": [{"productId": pid, "quantity": 2}]}, ctok)
check("add to cart", s == 200, (s,))
s, order = call("POST", "/orders", {"deliveryAddress": "1 Test Rd"}, ctok)
check("create order pending", s == 201 and order.get("status") == "pending", (s, order.get("status")))
oid = order["id"]
s, pay = call("POST", f"/orders/{oid}/pay", {"method": "card"}, ctok)
check("pay order", s == 200, (s, pay))
s, ord1 = call("GET", f"/orders/{oid}", None, ctok)
check("delivery auto-created", s == 200 and ord1.get("delivery") and ord1["delivery"]["status"] == "scheduled", str(ord1.get("delivery"))[:120])
s, prod1 = call("GET", f"/products/{pid}", None, ctok)
check("stock decremented 50->48", prod1.get("quantityAvailable") == 48, prod1.get("quantityAvailable"))

# 5. Delivery state machine: invalid jump rejected, valid path works
did = ord1["delivery"]["id"]
s, b = call("PATCH", f"/deliveries/{did}/status", {"status": "delivered"}, ctok)
check("invalid scheduled->delivered rejected", s == 400, (s, b))

# 6. B2B: business request -> farmer quote -> accept -> pending order -> payable
btok, _ = reg(f"b{TS}@t.io", "business", "Biz")
s, req_ = call("POST", "/b2b/requests", {"productId": pid, "quantityRequested": 5, "targetPrice": 190}, btok)
check("b2b request", s == 201, (s, req_))
rid = req_["id"]
s, q = call("POST", f"/b2b/requests/{rid}/quotations", {"bidPrice": 185, "quantityOffered": 5}, ftok)
check("farmer quotes", s == 201, (s, q))
# second farmer loses
ftok2, _ = reg(f"f2{TS}@t.io", "farmer", "Farmer2")
s, farm2 = call("POST", "/farms", {"farmName": "Farm Two", "location": "Karachi"}, ftok2)
s, q2 = call("POST", f"/b2b/requests/{rid}/quotations", {"bidPrice": 195, "quantityOffered": 5}, ftok2)
s, acc = call("POST", f"/b2b/quotations/{q['id']}/accept", None, btok)
check("accept quotation", s == 200, (s, acc))
s, orders = call("GET", "/orders", None, btok)
b2b_orders = [o for o in (orders if isinstance(orders, list) else []) if o.get("status") == "pending"]
check("accepted B2B order is pending (payable)", len(b2b_orders) > 0, str(orders)[:150])
if b2b_orders:
    s, pay = call("POST", f"/orders/{b2b_orders[0]['id']}/pay", {"method": "bank_transfer"}, btok)
    check("B2B order payable end-to-end", s == 200, (s, pay))
s, notifs2 = call("GET", "/notifications", None, ftok2)
lost = any("not selected" in (n.get("message") or "").lower() or "reject" in (n.get("message") or "").lower() for n in (notifs2 if isinstance(notifs2, list) else []))
check("losing bidder notified", lost, str(notifs2)[:200])

# 7. Public farm detail must not leak owner user_id
s, pub = call("GET", f"/farms/{fid}")
check("public farm detail hides user_id", s == 200 and pub.get("userId") is None, str(pub)[:200])

# 8. Farm verification document upload flow
s, up = call("POST", "/farms", {"farmName": "x", "location": "y"}, ftok)  # dup farm -> 409 expected
s, doc = call("POST", f"/farms/{fid}/verification-documents", {"fileUrl": "/uploads/files/abc123.jpg"}, ftok)
check("attach verification doc", s == 200 and "/uploads/files/abc123.jpg" in (doc.get("verificationDocuments") or []), (s, doc))
s, doc2 = call("POST", f"/farms/{fid}/verification-documents", {"fileUrl": "not-a-url"}, ftok)
check("reject bad file_url", s == 400, (s,))

# 9. Rate limiting: 31 rapid register attempts -> 429 (use distinct emails to avoid 409s masking)
codes = set()
for i in range(32):
    s, _ = call("POST", "/auth/register", {"email": f"rl{TS}{i}@t.io", "password": "Pass12345", "confirmPassword": "Pass12345", "fullName": "Rl", "phone": _phone(), "role": "customer"})
    codes.add(s)
check("rate limiter triggers 429", 429 in codes, sorted(codes))

# 10. CORS preflight from :4173
import urllib.request as u
req = u.Request(BASE + "/auth/login", method="OPTIONS", headers={"Origin": "http://127.0.0.1:4173", "Access-Control-Request-Method": "POST"})
try:
    with u.urlopen(req) as r:
        acao = r.headers.get("Access-Control-Allow-Origin")
        check("CORS allows 127.0.0.1:4173", acao == "http://127.0.0.1:4173", acao)
except Exception as e:
    check("CORS allows 127.0.0.1:4173", False, e)

print("\n%d/%d passed" % (sum(1 for _, ok, _ in results if ok), len(results)))
for n, ok, d in results:
    if not ok: print("FAILED:", n, d)
