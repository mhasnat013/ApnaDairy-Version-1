"""Local browser verification v2 — clicks role cards on the register form."""
import time, sys
from playwright.sync_api import sync_playwright

TS = str(int(time.time()))
results = []
def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else f" — {str(detail)[:250]}"))

errors = []
def fill_register(pg, email, name, phone, role_text):
    pg.goto("http://127.0.0.1:4173/register", wait_until="networkidle", timeout=30000)
    pg.fill('input[type="email"]', email)
    nm = pg.query_selector('input[name="fullName"], input[name="full_name"]')
    if nm: nm.fill(name)
    ph = pg.query_selector('input[name="phone"]')
    if ph: ph.fill(phone)
    pg.get_by_text(role_text, exact=True).first.click(timeout=5000)
    pws = pg.query_selector_all('input[type="password"]')
    if len(pws) >= 1: pws[0].fill("Verify123!")
    if len(pws) >= 2: pws[1].fill("Verify123!")
    pg.query_selector('button[type="submit"]').click()
    pg.wait_for_timeout(4000)

with sync_playwright() as p:
    b = p.firefox.launch(headless=True)
    pg = b.new_page()
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))

    email = f"ffx2{TS}@test.pk"
    fill_register(pg, email, "Firefox Verify", "+93000004444", "Customer")
    check("customer registration lands in portal (CORS OK)", "/app" in pg.url, pg.url)
    pg.screenshot(path="/tmp/ffx2_portal.png")

    # logout then login
    done = False
    for txt in ["Log out", "Logout", "Sign out"]:
        try:
            pg.get_by_text(txt, exact=False).first.click(timeout=3000); done = True; break
        except Exception: pass
    if not done:
        pg.context.clear_cookies()
    pg.wait_for_timeout(1500)
    pg.goto("http://127.0.0.1:4173/login", wait_until="networkidle", timeout=30000)
    pg.fill('input[type="email"]', email)
    pg.query_selector('input[type="password"]').fill("Verify123!")
    pg.query_selector('button[type="submit"]').click()
    pg.wait_for_timeout(4000)
    check("login works, portal loads", "/app" in pg.url, pg.url)
    body = pg.inner_text("body")
    check("no [object Object] rendering glitch", "[object Object]" not in body)

    # public farms
    pg.goto("http://127.0.0.1:4173/farms", wait_until="networkidle", timeout=30000)
    pg.wait_for_timeout(2000)
    fbody = pg.inner_text("body")
    check("public farms page loads content", len(fbody) > 200)

    # rider registration -> pending approval
    fill_register(pg, f"ffxr2{TS}@test.pk", "Rider Fox", "+93000005555", "Delivery rider")
    rbody = pg.inner_text("body").lower()
    check("rider sees pending-approval message", "approv" in rbody, pg.url)
    pg.screenshot(path="/tmp/ffx2_rider.png")
    b.close()

net_errs = [e for e in errors if "net::" in e or "CORS" in e or "Failed to fetch" in e]
check("no network/CORS console errors", len(net_errs) == 0, net_errs[:3])
print(f"\n{sum(1 for _, ok in results if ok)}/{len(results)} browser checks passed")
sys.exit(0 if all(ok for _, ok in results) else 1)
