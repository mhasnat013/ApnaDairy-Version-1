"""Idempotent, connected local demo data. Privileged credentials come from env."""
import os
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from app.auth.security import hash_password
from app.config import get_settings
from app.database import Base, make_engine, make_session_factory
from app.models import (AIPrediction, AdminActionLog, AdminApplication, AdminFarmAssignment,
    BulkPurchaseRequest, Cart, ChatbotMessage, Complaint, Delivery,
    DeliveryTracking, Discount, EscalationCase, Farm, FarmAnalytics, IoTSensorReading,
    MilkBatch, Notification, Order, Payment, PlatformSetting, PriceHistory,
    Product, Quotation, Review, Subscription, User)

settings = get_settings()

def _now(): return datetime.now(timezone.utc)

def _one(db, model, defaults=None, **lookup):
    row = db.query(model).filter_by(**lookup).first()
    if row is None:
        row = model(**lookup, **(defaults or {})); db.add(row); db.flush()
    return row

def _user(db, email, password, name, phone, role, city):
    user = db.query(User).filter_by(email=email).first()
    if user is None:
        user = User(email=email, full_name=name, phone=phone, role=role); db.add(user)
    elif user.role != role:
        raise SystemExit(f"Refusing: {email} has role {user.role!r}, expected {role!r}.")
    user.full_name = name; user.phone = phone
    user.password_hash = hash_password(password)
    user.address_line = "Model Town, Lahore, Punjab"; user.city = city
    user.is_verified = True; user.status = "active"; db.flush()
    _one(db, Cart, user_id=user.user_id, defaults={"cart_data": {"items": []}})
    return user

def main():
    ae, ap = os.getenv("ADMIN_EMAIL") or settings.ADMIN_EMAIL, os.getenv("ADMIN_PASSWORD") or settings.ADMIN_PASSWORD
    se, sp = os.getenv("SUPERADMIN_EMAIL") or settings.SUPERADMIN_EMAIL, os.getenv("SUPERADMIN_PASSWORD") or settings.SUPERADMIN_PASSWORD
    if not all((ae, ap, se, sp)):
        raise SystemExit("Set ADMIN_EMAIL, ADMIN_PASSWORD, SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD.")
    engine = make_engine(settings.DATABASE_URL)
    if engine.dialect.name == "sqlite": Base.metadata.create_all(engine)
    # A stable reference time makes all seeded history deterministic and truly
    # idempotent. Live automation may still append newer simulated telemetry.
    db = make_session_factory(engine)(); now = datetime(2026, 9, 28, 8, 0, tzinfo=timezone.utc)
    try:
        admin = _user(db, ae.lower(), ap, "Ayesha Khan", "+923001110001", "admin", "Lahore")
        superadmin = _user(db, se.lower(), sp, "Hasnat Ali", "+923001110002", "superadmin", "Islamabad")
        farmer = _user(db, "demo.farmer@apnadairy.local", "DemoFarmer123!", "Muhammad Arslan", "+923001110003", "farmer", "Kasur")
        customer = _user(db, "demo.customer@apnadairy.local", "DemoCustomer123!", "Sara Ahmed", "+923001110004", "customer", "Lahore")
        business = _user(db, "demo.business@apnadairy.local", "DemoBusiness123!", "Bilal Foods Procurement", "+923001110005", "business", "Lahore")
        rider = _user(db, "demo.rider@apnadairy.local", "DemoRider123!", "Ali Raza", "+923001110006", "rider", "Lahore")

        farm = _one(db, Farm, user_id=farmer.user_id, defaults={
            "farm_name":"Green Valley Dairy Farm", "location":"Pattoki Road, Kasur, Punjab",
            "latitude":Decimal("31.1179"), "longitude":Decimal("74.4494"),
            "capacity_liters":Decimal("2400"), "established_date":date(2018,3,15),
            "description":"Family dairy using hygienic milking and monitored cold storage.",
            "verification_status":"verified", "rating_avg":Decimal("4.8"),
            "verification_documents":[{"name":"Punjab Livestock Certificate","status":"verified"}]})
        # Refresh legacy local rows as well as creating new ones, so an older
        # checkout becomes presentation-ready after one seed run.
        farm.farm_name="Green Valley Dairy Farm"; farm.location="Pattoki Road, Kasur, Punjab"
        farm.latitude=Decimal("31.1179"); farm.longitude=Decimal("74.4494")
        farm.capacity_liters=Decimal("2400"); farm.established_date=date(2018,3,15)
        farm.description="Family dairy using hygienic milking and monitored cold storage."
        farm.verification_status="verified"; farm.rating_avg=Decimal("4.8")
        farm.verification_documents=[{"name":"Punjab Livestock Certificate","status":"verified"}]
        legacy_batch=db.query(MilkBatch).filter_by(batch_code="DEMO-BATCH-001").first()
        if legacy_batch:
            legacy_batch.batch_code="GV-260925-PM"; legacy_batch.status="approved"
        legacy_product=db.query(Product).filter_by(name="Demo Fresh Milk 1L").first()
        if legacy_product:
            legacy_product.name="Buffalo Milk 1L"; legacy_product.category="milk"
            legacy_product.description="Rich full-cream buffalo milk from a verified farm."
            legacy_product.price=Decimal("250"); legacy_product.status="active"

        specs = [("GV-260928-AM",5,"approved","650","3.8","94.2","Fresh",False,"72"),
                 ("GV-260927-PM",18,"approved","580","4.1","89.6","Fresh",False,"64"),
                 ("GV-260926-AM",42,"testing","710","5.2","76.4","Medium",True,"36"),
                 ("GV-260925-PM",61,"approved","540","4.0","86.8","Fresh",False,"28"),
                 ("GV-260924-AM",83,"expired","490","6.4","41.5","Near Expiry",True,"0"),
                 ("GV-260923-PM",106,"rejected","430","7.1","28.7","Near Expiry",True,"0"),
                 ("GV-260922-AM",130,"approved","625","3.9","91.1","Fresh",False,"18"),
                 ("GV-260921-PM",154,"expired","515","5.8","55.4","Near Expiry",True,"0")]
        batches=[]
        for code,hours,status,qty,temp,score,quality,anomaly,shelf_life in specs:
            b=_one(db, MilkBatch, batch_code=code, defaults={"farm_id":farm.farm_id,
                "milking_time":now-timedelta(hours=hours), "collection_time":now-timedelta(hours=hours-1),
                "quantity_liters":Decimal(qty), "initial_storage_temp":Decimal(temp), "status":status})
            batches.append(b)
            for sensor,value,unit,minute in [("temperature",temp,"C",0),("temperature",str(Decimal(temp)+Decimal('.2')),"C",20),("pH","6.68","pH",40),("fat","3.9","%",50),("humidity","68.0","%",55)]:
                stamp=now-timedelta(hours=hours-1,minutes=minute)
                if not db.query(IoTSensorReading).filter_by(batch_id=b.batch_id,sensor_type=sensor,recorded_at=stamp).first():
                    db.add(IoTSensorReading(batch_id=b.batch_id,sensor_type=sensor,reading_value=Decimal(value),unit=unit,recorded_at=stamp))
            _one(db,AIPrediction,batch_id=b.batch_id,model_version="freshness-demo-v1",defaults={
                "predicted_shelf_life_hours":Decimal(shelf_life),
                "freshness_score":Decimal(score),"quality_class":quality,"anomaly_flag":anomaly,
                "predicted_at":now-timedelta(hours=max(1,hours-2))})

        ps=[("Farm Fresh Milk 1L","milk","Pure pasteurised milk from today's monitored batch.","litre","220","180",batches[0]),
            ("Creamy Yogurt 500g","yogurt","Naturally set yogurt with no artificial preservatives.","tub","260","85",batches[1]),
            ("Desi Ghee 500g","ghee","Slow-cooked clarified butter with a traditional aroma.","jar","1450","32",batches[1]),
            ("Buffalo Milk 1L","milk","Full-cream buffalo milk chilled immediately after collection.","litre","250","140",batches[0]),
            ("Salted Butter 250g","butter","Cultured farm butter made in small batches.","pack","620","48",batches[1]),
            ("Fresh Paneer 500g","paneer","Soft paneer prepared from traceable fresh milk.","pack","540","36",batches[0]),
            ("Lassi 1L","lassi","Traditional chilled sweet lassi prepared from farm yogurt.","bottle","290","64",batches[6]),
            ("Cream 200ml","cream","Fresh dairy cream for desserts, tea and home cooking.","pack","310","42",batches[6])]
        products=[]
        for name,cat,desc,unit,price,stock,batch in ps:
            p=_one(db,Product,farm_id=farm.farm_id,name=name,defaults={"batch_id":batch.batch_id,
                "category":cat,"description":desc,"unit_of_measure":unit,"price":Decimal(price),
                "quantity_available":Decimal(stock),"status":"active"}); products.append(p)
            _one(db,PriceHistory,product_id=p.product_id,reason="September market adjustment",defaults={
                "old_price":Decimal(price)-10,"new_price":Decimal(price),"changed_at":now-timedelta(days=7)})
        _one(db,Discount,product_id=products[1].product_id,reason="Weekend dairy special",defaults={
            "discount_percent":Decimal("10"),"valid_from":now-timedelta(days=1),"valid_until":now+timedelta(days=6)})

        order_specs = [
            (customer,"House 24, Model Town, Lahore", 4, "700", "in_transit", "cash_on_delivery", "pending", "AD-COD-92801",
             [(products[0], 2, 220), (products[1], 1, 260)], "in_transit", None),
            (customer,"House 82, Street 7, Gulberg III, Lahore", 52, "1120", "delivered", "card", "completed", "AD-CARD-92684",
             [(products[3], 2, 250), (products[4], 1, 620)], "delivered", now-timedelta(hours=49)),
            (customer,"Plot 16, Sector Y, DHA Phase 3, Lahore", 8, "980", "confirmed", "wallet", "completed", "AD-WALLET-92731",
             [(products[0], 2, 220), (products[5], 1, 540)], "scheduled", None),
            (customer,"Flat 7C, Askari 10, Lahore", 120, "1450", "cancelled", "bank_transfer", "refunded", "AD-BANK-92392",
             [(products[2], 1, 1450)], None, None),
            (business,"Bilal Foods Central Kitchen, Multan Road, Lahore", 72, "55680", "delivered", "bank_transfer", "completed", "AD-B2B-92518",
             [(products[1], 240, 232)], "delivered", now-timedelta(hours=68)),
            (business,"Bilal Foods Distribution Centre, Kot Lakhpat, Lahore", 16, "78000", "confirmed", "bank_transfer", "completed", "AD-B2B-92786",
             [(products[0], 400, 195)], "assigned", None),
        ]
        orders=[]
        deliveries=[]
        for buyer,address,hours,total,status,method,payment_status,ref,items,delivery_status,delivered_at in order_specs:
            order=_one(db,Order,user_id=buyer.user_id,delivery_address=address,defaults={
                "order_items":{"items":[{"product_id":p.product_id,"farm_id":p.farm_id,"name":p.name,"quantity":qty,"unit_price":price} for p,qty,price in items]},
                "order_date":now-timedelta(hours=hours),"total_amount":Decimal(total),"status":status})
            order.order_items={"items":[{"product_id":p.product_id,"farm_id":p.farm_id,"name":p.name,"quantity":qty,"unit_price":price} for p,qty,price in items]}
            order.order_date=now-timedelta(hours=hours); order.total_amount=Decimal(total); order.status=status
            orders.append(order)
            _one(db,Payment,order_id=order.order_id,defaults={"amount":Decimal(total),"method":method,
                "status":payment_status,"transaction_ref":ref,"paid_at":now-timedelta(hours=hours-1) if payment_status in ("completed","refunded") else None})
            if delivery_status:
                delivery=_one(db,Delivery,order_id=order.order_id,defaults={"delivery_person_id":rider.user_id,
                    "address":address,"scheduled_time":now+timedelta(hours=1) if delivery_status=="scheduled" else now-timedelta(hours=max(1,hours-2)),
                    "delivered_time":delivered_at,"status":delivery_status})
                deliveries.append(delivery)
                route = [("Order packed in temperature-controlled packaging",90,"31.1179","74.4494"),
                         ("Cold-chain vehicle departed from Kasur",55,"31.2361","74.3671"),
                         (("Order delivered and proof of delivery recorded" if delivery_status=="delivered" else "Rider is approaching the delivery address"),10,"31.4931","74.3198")]
                for msg,mins,lat,lng in route:
                    _one(db,DeliveryTracking,delivery_id=delivery.delivery_id,status_update=msg,defaults={
                        "latitude":Decimal(lat),"longitude":Decimal(lng),"timestamp":now-timedelta(hours=max(0,hours-3),minutes=mins)})

        subscription_specs=[(products[0],"daily","active"),(products[1],"weekly","active"),(products[2],"monthly","paused")]
        for product,frequency,status in subscription_specs:
            _one(db,Subscription,user_id=customer.user_id,farm_id=farm.farm_id,product_id=product.product_id,defaults={"frequency":frequency,"status":status})
        review_specs=[(products[0],5,"Milk arrived cold, sealed and within the promised delivery window."),
                      (products[1],4,"Yogurt was thick and fresh; packaging could be sturdier."),
                      (products[3],5,"Rich taste and clear freshness information on the product page."),
                      (products[4],4,"Butter quality was excellent and the pack stayed chilled.")]
        for product,rating,comment in review_specs:
            _one(db,Review,user_id=customer.user_id,product_id=product.product_id,defaults={"farm_id":farm.farm_id,"rating":rating,"comment":comment})
        complaint_specs=[
            ("Yogurt lid slightly damaged",orders[0],"Outer lid was dented; product seal remained intact.","in_review","packaging","normal",batches[1],"Replacement approved.",None),
            ("Delivery arrived twenty minutes late",orders[1],"Cold-chain temperature was safe, but the rider arrived after the selected window.","resolved","delivery","low",batches[0],"Route delay verified.","Delivery fee voucher issued."),
            ("Clarification needed on wallet receipt",orders[2],"The wallet was charged successfully but the receipt took several minutes to appear.","closed","payment","normal",batches[0],"Payment gateway log reviewed.","Receipt re-sent by email."),
        ]
        complaints=[]
        for subject,order,description,status,category,priority,batch,remarks,resolution in complaint_specs:
            complaint=_one(db,Complaint,user_id=customer.user_id,subject=subject,defaults={"order_id":order.order_id,
                "description":description,"status":status,"category":category,"priority":priority,"farm_id":farm.farm_id,
                "batch_id":batch.batch_id,"admin_remarks":remarks,"resolution_notes":resolution,
                "resolved_at":now-timedelta(hours=24) if status in ("resolved","closed") else None})
            complaints.append(complaint)

        bulk_specs=[(products[0],"500","195",3,"open","202","500","submitted"),
                    (products[1],"240","225",7,"fulfilled","232","240","accepted"),
                    (products[2],"80","1325",10,"open","1370","70","submitted"),
                    (products[4],"120","550",5,"cancelled","575","100","withdrawn")]
        bulk_requests=[]
        for product,quantity,target,days,status,bid,offered,quote_status in bulk_specs:
            bulk=_one(db,BulkPurchaseRequest,buyer_id=business.user_id,product_id=product.product_id,
                quantity_requested=Decimal(quantity),defaults={"target_price":Decimal(target),"deadline":now+timedelta(days=days),"status":status})
            bulk_requests.append(bulk)
            _one(db,Quotation,request_id=bulk.request_id,farm_id=farm.farm_id,defaults={"bid_price":Decimal(bid),"quantity_offered":Decimal(offered),"status":quote_status})

        monthly=[("milk",date(2026,7,1),date(2026,7,31),"18400","17620","310","3690200","2840000","850200"),
                 ("milk",date(2026,8,1),date(2026,8,31),"19250","18590","260","3918000","2965000","953000"),
                 ("milk",date(2026,9,1),date(2026,9,30),"20100","19380","235","4215000","3100000","1115000"),
                 ("yogurt",date(2026,7,1),date(2026,7,31),"2800","2670","54","1345680","992000","353680"),
                 ("yogurt",date(2026,8,1),date(2026,8,31),"3100","2965","48","1512230","1085000","427230"),
                 ("yogurt",date(2026,9,1),date(2026,9,30),"3350","3210","41","1664300","1150000","514300"),
                 ("ghee",date(2026,7,1),date(2026,7,31),"420","401","6","1122800","816000","306800"),
                 ("ghee",date(2026,8,1),date(2026,8,31),"455","438","5","1248300","872000","376300"),
                 ("ghee",date(2026,9,1),date(2026,9,30),"480","462","4","1339800","910000","429800")]
        for category,start,end,prod,sold,waste,rev,cost,profit in monthly:
            _one(db,FarmAnalytics,farm_id=farm.farm_id,product_category=category,period_start=start,period_end=end,defaults={
                "quantity_produced":Decimal(prod),"quantity_sold":Decimal(sold),"quantity_wasted":Decimal(waste),
                "revenue":Decimal(rev),"cost":Decimal(cost),"profit":Decimal(profit),"loss":Decimal("0")})
        notes=[
            (customer,"delivery","Your Model Town order is on the way in a monitored cold-chain vehicle."),
            (customer,"subscription","Your daily Farm Fresh Milk subscription is active."),
            (customer,"payment","Wallet payment of PKR 980 was confirmed."),
            (farmer,"pricing","Milk price recommendation updated to PKR 220 per litre."),
            (farmer,"system","Batch GV-260928-AM passed freshness checks with a score of 94.2."),
            (farmer,"order","A business buyer requested 500 litres of fresh milk."),
            (business,"system","A quotation was received for your 500 litre milk request."),
            (business,"pricing","The yogurt quotation of PKR 232 was accepted."),
            (business,"system","Your ghee procurement request remains open until 8 October."),
            (rider,"delivery","Delivery assigned: Model Town morning route."),
            (rider,"delivery","Gulberg order delivery was completed successfully."),
            (rider,"system","Cold-chain checklist is due before the next pickup."),
            (admin,"system","One packaging complaint awaits review."),
            (admin,"system","An AI anomaly was detected for batch GV-260926-AM."),
            (admin,"order","Three active customer orders are visible in operations."),
            (superadmin,"system","Platform health is normal and background jobs are active."),
            (superadmin,"system","Monthly farm profitability increased in September."),
            (superadmin,"system","Two governance cases require a decision."),
        ]
        for u,kind,msg in notes: _one(db,Notification,user_id=u.user_id,message=msg,defaults={"type":kind,"is_read":False,"sent_at":now-timedelta(minutes=20)})
        chats=[
            (customer,"customer-freshness-0928","user","How long will today's milk remain fresh?"),
            (customer,"customer-freshness-0928","bot","The current AI score is 94.2 and predicts about 72 hours refrigerated."),
            (customer,"customer-delivery-0928","user","When will my Model Town order arrive?"),
            (customer,"customer-delivery-0928","bot","The rider is approaching and the current estimate is within 15 minutes."),
            (farmer,"farmer-quality-0928","user","Why was batch GV-260926-AM marked for review?"),
            (farmer,"farmer-quality-0928","bot","Its temperature rose to 5.2 C and the anomaly detector recommends a manual quality check."),
            (business,"business-quote-0928","user","Which bulk quotation has the lowest accepted price?"),
            (business,"business-quote-0928","bot","The accepted yogurt quotation is PKR 232 per unit for 240 units."),
            (rider,"rider-route-0928","user","What is my next delivery area?"),
            (rider,"rider-route-0928","bot","Your next assigned stop is Model Town, Lahore."),
            (admin,"admin-alert-0928","user","Show the batch needing attention."),
            (admin,"admin-alert-0928","bot","Batch GV-260926-AM is under testing following an AI anomaly alert."),
            (superadmin,"superadmin-health-0928","user","Is the demonstration automation operating normally?"),
            (superadmin,"superadmin-health-0928","bot","Yes. Simulated sensor readings and AI predictions are being generated on schedule."),
        ]
        for u,session,sender,message in chats:
            _one(db,ChatbotMessage,session_id=session,sender=sender,message_text=message,defaults={"user_id":u.user_id,"sent_at":now-timedelta(minutes=15)})
        _one(db,AdminFarmAssignment,admin_id=admin.user_id,farm_id=farm.farm_id,defaults={"assigned_by_superadmin_id":superadmin.user_id,"is_active":True})
        admin_actions=[("review_complaint","complaint",complaints[0].complaint_id,"Reviewed packaging complaint and approved a replacement."),
                       ("resolve_complaint","complaint",complaints[1].complaint_id,"Verified route delay and issued a delivery voucher."),
                       ("review_batch","milk_batch",batches[2].batch_id,"Requested a manual quality check after an AI anomaly."),
                       ("approve_farm","farm",farm.farm_id,"Confirmed annual verification documents for Green Valley Dairy Farm."),
                       ("monitor_delivery","delivery",deliveries[0].delivery_id,"Reviewed live cold-chain delivery progress for Model Town.")]
        for action,entity_type,entity_id,description in admin_actions:
            _one(db,AdminActionLog,admin_id=admin.user_id,action=action,entity_type=entity_type,entity_id=entity_id,defaults={"description":description})

        application_specs=[
            (farmer,"Experienced farm operator requesting regional quality-review access.","pending",None),
            (admin,"Existing operations administrator requesting annual governance renewal.","approved","Approved for the existing administrator account."),
            (rider,"Senior cold-chain rider requesting delivery quality-review access.","rejected","Governance role requires additional compliance training."),
        ]
        for applicant,reason,status,review_notes in application_specs:
            _one(db,AdminApplication,applicant_user_id=applicant.user_id,requested_role="admin",reason=reason,defaults={
                "status":status,"reviewed_by_superadmin_id":superadmin.user_id if status!="pending" else None,
                "reviewed_at":now-timedelta(days=1) if status!="pending" else None,"review_notes":review_notes})
        escalation_specs=[
            ("ESC-2026-0928-01","batch","cold_chain","Temperature anomaly requires a quality decision","Batch GV-260926-AM exceeded the preferred cold-chain range.","high","in_review",batches[2],None),
            ("ESC-2026-0928-02","complaint","packaging","Repeated packaging concern requires supplier review","Customer reported a dented yogurt lid although the inner seal remained intact.","normal","pending",batches[1],complaints[0]),
            ("ESC-2026-0928-03","technical","automation","IoT scheduler health review","Routine governance review of simulated telemetry and prediction scheduling.","low","resolved",None,None),
        ]
        for code,case_type,category,title,description,priority,status,batch,complaint in escalation_specs:
            _one(db,EscalationCase,case_code=code,defaults={"case_type":case_type,"category":category,"title":title,
                "description":description,"priority":priority,"status":status,"raised_by_admin_id":admin.user_id,
                "assigned_to_superadmin_id":superadmin.user_id,"farm_id":farm.farm_id,
                "batch_id":batch.batch_id if batch else None,"complaint_id":complaint.complaint_id if complaint else None,
                "admin_remarks":"Evidence reviewed in the operations dashboard.",
                "resolution_notes":"Automation is operating within configured demonstration limits." if status=="resolved" else None,
                "resolved_at":now-timedelta(hours=2) if status=="resolved" else None})
        setting=_one(db,PlatformSetting,setting_key="demo_dashboard",defaults={"value_json":{"seed_version":2,"realistic_data":True},"updated_by":superadmin.user_id})
        setting.value_json={"seed_version":3,"realistic_data":True,"locale":"en-PK"}; setting.updated_by=superadmin.user_id
        for key,value in [("operations_thresholds",{"temperature_c_max":5.0,"freshness_score_min":70,"manual_review_on_anomaly":True}),
                          ("delivery_service_levels",{"lahore_minutes":90,"kasur_minutes":120,"cold_chain_required":True}),
                          ("marketplace_commission",{"consumer_percent":4.0,"business_percent":2.5}),
                          ("notification_preferences",{"ai_alerts":True,"iot_alerts":True,"daily_digest_hour":8})]:
            item=_one(db,PlatformSetting,setting_key=key,defaults={"value_json":value,"updated_by":superadmin.user_id})
            item.value_json=value; item.updated_by=superadmin.user_id
        db.commit(); print("Seed complete: six roles and expanded connected Pakistani demo records are ready.")
    except Exception:
        db.rollback(); raise
    finally: db.close()

if __name__ == "__main__": main()
