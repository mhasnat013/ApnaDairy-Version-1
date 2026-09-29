"""Retest part 2: admin-gated flows + rider lifecycle + auto-pricing. Uses the
harness admin (retest_admin@t.io) ONLY for setup actions an admin would do;
every product flow is exercised through the real API."""
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
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else f" — {str(detail)[:200]}"))

def login(email, pw="Pass12345"):
    s, b = call("POST", "/auth/login", {"email": email, "password": pw})
    assert s == 200, (s, b)
    return b["accessToken"]

s, b = call("POST", "/auth/login", {"email": "retest_admin@t.io", "password": "AdminPass123"})
ATOK = b["accessToken"]
TS = str(int(time.time()))
_seq = [int(time.time() * 1000) % 100000]
def phone():
    _seq[0] += 1
    return f"+93{_seq[0]:010d}"[:13]
def reg(email, role, name="T"):
    s, b = call("POST", "/auth/register", {"email": email, "password": "Pass12345", "confirmPassword": "Pass12345", "fullName": name, "phone": phone(), "role": role})
    assert s in (200, 201), (s, b)
    return b["accessToken"], b.get("user", {}).get("id")

# --- admin overview has real nonzero values
s, ov = call("GET", "/admin/analytics/overview", None, ATOK)
check("admin overview 200", s == 200, (s,))
for k in ("totalUsers", "totalFarms", "totalOrders", "totalRevenue"):
    check(f"overview.{k} present", k in ov, list(ov.keys())[:12])
check("overview.totalUsers > 0", (ov.get("totalUsers") or 0) > 0, ov.get("totalUsers"))
check("overview.totalFarms > 0", (ov.get("totalFarms") or 0) > 0, ov.get("totalFarms"))

# --- rider lifecycle: register (pending) -> login blocked -> admin activates -> login works
rtok_raw, rider_uid = reg(f"r{TS}@t.io", "rider", "Rider")
s, me = call("GET", "/auth/me", None, rtok_raw)
check("pending rider token issued but /me blocked", s == 403, (s, me))
s, b = call("POST", "/auth/login", {"email": f"r{TS}@t.io", "password": "Pass12345"})
check("pending rider login blocked with message", s == 403 and "approv" in str(b).lower(), (s, b))
s, u = call("PATCH", f"/admin/users/{rider_uid}/status", {"status": "active"}, ATOK)
check("admin activates rider", s == 200 and u.get("status") == "active", (s, u))
RTOK = login(f"r{TS}@t.io")
check("rider login works after activation", bool(RTOK))
s, notifs = call("GET", "/notifications", None, RTOK)
check("rider got approval notification", any("approv" in (n.get("message") or "").lower() for n in notifs), str(notifs)[:150])

# --- farmer farm verified by admin, then subscription + notifications work
ftok, farmer_uid = reg(f"f{TS}@t.io", "farmer", "Farmer")
s, farm = call("POST", "/farms", {"farmName": "Verify Farm", "location": "Lahore"}, ftok)
fid = farm["id"]
s, vf = call("POST", f"/admin/farms/{fid}/verify", {"verificationStatus": "verified"}, ATOK)
check("admin verifies farm", s == 200 and vf.get("verificationStatus") == "verified", (s, vf))
ctok, cust_uid = reg(f"c{TS}@t.io", "customer", "Cust")
s, sub = call("POST", "/subscriptions", {"farmId": fid, "frequency": "weekly"}, ctok)
check("subscribe to verified farm", s == 201, (s, sub))
sub_id = sub["id"]
s, batch = call("POST", "/batches", {"farmId": fid, "batchCode": f"VB-{TS}", "quantityLiters": 80, "milkingTime": "2026-09-27T06:00:00Z"}, ftok)
s, notifs = call("GET", "/notifications", None, ctok)
check("subscriber notified of new batch", any(f"VB-{TS}" in (n.get("message") or "") for n in notifs), str(notifs)[:200])

# --- admin cancels subscription (was 403)
s, cancelled = call("PATCH", f"/subscriptions/{sub_id}", {"status": "cancelled"}, ATOK)
check("admin cancels subscription", s == 200, (s, cancelled))

# --- complaint: customer creates, admin resolves -> notification + audit log
s, comp = call("POST", "/complaints", {"subject": "Late delivery", "description": "Milk arrived late", "category": "delivery"}, ctok)
check("customer creates complaint", s == 201, (s, comp))
cid = comp["id"]
s, comp2 = call("PATCH", f"/complaints/{cid}", {"status": "resolved"}, ATOK)
check("admin resolves complaint", s == 200 and comp2.get("status") == "resolved", (s, comp2))
s, notifs = call("GET", "/notifications", None, ctok)
check("complainant notified", any("resolved" in (n.get("message") or "") for n in notifs))
s, logs = call("GET", "/admin/action-logs", None, ATOK)
logged = any(l.get("entityType") == "complaint" and str(l.get("entityId")) == str(cid) for l in (logs if isinstance(logs, list) else []))
check("complaint update audit-logged", logged, str(logs)[:200])

# --- admin chat oversight
s, sess = call("GET", "/admin/chat/sessions", None, ATOK)
check("admin chat sessions oversight", s == 200 and isinstance(sess, list), (s, str(sess)[:100]))

# --- delivery lifecycle with rider: assign -> transitions -> invalid rejected
s, prod = call("POST", "/products", {"farmId": fid, "name": "V Milk", "category": "milk", "unitOfMeasure": "litre", "price": 200, "quantityAvailable": 30, "status": "active"}, ftok)
pid = prod["id"]
s, _ = call("PUT", "/cart", {"items": [{"productId": pid, "quantity": 1}]}, ctok)
s, order = call("POST", "/orders", {"deliveryAddress": "9 Test Rd"}, ctok)
oid = order["id"]
s, _ = call("POST", f"/orders/{oid}/pay", {"method": "card"}, ctok)
s, ord1 = call("GET", f"/orders/{oid}", None, ctok)
did = ord1["delivery"]["id"]
s, a = call("PATCH", f"/deliveries/{did}/assign", {"riderId": rider_uid}, ATOK)
check("admin assigns rider (scheduled->assigned)", s == 200, (s, a))
rh = RTOK
s, b = call("PATCH", f"/deliveries/{did}/status", {"status": "delivered"}, rh)
check("invalid assigned->delivered rejected", s == 400, (s, b))
for nxt, expect in (("picked_up", 200), ("in_transit", 200), ("delivered", 200)):
    s, b = call("PATCH", f"/deliveries/{did}/status", {"status": nxt}, rh)
    check(f"transition -> {nxt}", s == expect, (s, b))
s, b = call("PATCH", f"/deliveries/{did}/status", {"status": "assigned"}, rh)
check("terminal delivered rejects backward move", s == 400, (s, b))

# --- auto dynamic pricing: score a batch Near Expiry via extreme-temp IoT
s, batch3 = call("POST", "/batches", {"farmId": fid, "batchCode": f"PX-{TS}", "quantityLiters": 40, "milkingTime": "2026-09-27T05:00:00Z"}, ftok)
b3id = batch3["id"]
s, prod3 = call("POST", "/products", {"farmId": fid, "batchId": b3id, "name": "PX Milk", "category": "milk", "unitOfMeasure": "litre", "price": 300, "quantityAvailable": 20, "status": "active"}, ftok)
p3id = prod3["id"]
# ingest very warm readings to push spoilage risk high
readings = [{"batchId": b3id, "temperatureC": 28.0, "recordedAt": f"2026-09-27T0{i}:00:00Z"} for i in range(6, 9)]
s, ing = call("POST", "/iot/readings/bulk", {"readings": readings}, ftok)
if s not in (200, 201):
    s, ing = call("POST", "/iot/readings", {"batchId": b3id, "temperatureC": 28.0}, ftok)
s, score = call("POST", f"/batches/{b3id}/score", None, ftok)
print("   score result:", score.get("quality_class"), score.get("freshness_score"))
s, discs = call("GET", f"/products/{p3id}/discounts", None, ftok)
auto = [d for d in (discs if isinstance(discs, list) else []) if (d.get("reason") or "").startswith("auto: freshness")]
check("auto freshness discount created", len(auto) > 0, str(discs)[:200])
if auto:
    s, _ = call("PUT", "/cart", {"items": [{"productId": p3id, "quantity": 2}]}, ctok)
    s, order2 = call("POST", "/orders", {"deliveryAddress": "9 Test Rd"}, ctok)
    total = order2.get("totalAmount")
    check("checkout applies auto discount (2x300x0.85=510)", abs((total or 0) - 510.0) < 0.01, total)

# --- farms list with verification_status=all (public endpoint used by admin UI)
s, farms = call("GET", "/farms?verification_status=all", None, ATOK)
check("farms all filter", s == 200 and isinstance(farms, list) and len(farms) > 0, (s, type(farms)))
s, farmsv = call("GET", "/farms?verification_status=verified", None, ATOK)
check("farms verified filter narrower", s == 200 and len(farmsv) <= len(farms), (len(farmsv), len(farms)))

print("\n%d/%d passed" % (sum(1 for _, ok in results if ok), len(results)))
for n, ok in results:
    if not ok: print("FAILED:", n)
