-- ApnaDairy — Supabase schema (core + Super Admin governance tables)
-- Generated offline: alembic upgrade base:head --sql  (no live connection used)
-- HOW TO APPLY: Supabase Dashboard -> SQL Editor -> paste this file -> Run.
-- Run ONCE on a fresh project. CREATE TABLE/INDEX use IF NOT EXISTS, ADD COLUMN
-- and ADD CONSTRAINT are wrapped in DO blocks, and alembic_version inserts use
-- ON CONFLICT DO NOTHING, so a re-run is safe.
-- After this: create your .env from .env.example, then run
--   SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... python -m app.seed
-- Never paste secrets into this file.

BEGIN;

CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> fae0062d7af9

CREATE TABLE IF NOT EXISTS "user" (
    user_id SERIAL NOT NULL, 
    full_name VARCHAR(255) NOT NULL, 
    email VARCHAR(255) NOT NULL, 
    phone VARCHAR(32) NOT NULL, 
    password_hash VARCHAR(255) NOT NULL, 
    role VARCHAR(40) NOT NULL, 
    address_line VARCHAR(512), 
    city VARCHAR(128), 
    is_verified BOOLEAN NOT NULL, 
    status VARCHAR(40) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    PRIMARY KEY (user_id), 
    UNIQUE (phone)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_user_email ON "user" (email);

CREATE INDEX IF NOT EXISTS ix_user_role ON "user" (role);

CREATE TABLE IF NOT EXISTS admin_action_log (
    log_id SERIAL NOT NULL, 
    admin_id INTEGER NOT NULL, 
    action VARCHAR(128) NOT NULL, 
    entity_type VARCHAR(64) NOT NULL, 
    entity_id INTEGER, 
    description TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    PRIMARY KEY (log_id), 
    FOREIGN KEY(admin_id) REFERENCES "user" (user_id)
);

CREATE INDEX IF NOT EXISTS ix_admin_action_log_action ON admin_action_log (action);

CREATE INDEX IF NOT EXISTS ix_admin_action_log_admin_id ON admin_action_log (admin_id);

CREATE TABLE IF NOT EXISTS cart (
    cart_id SERIAL NOT NULL, 
    user_id INTEGER NOT NULL, 
    cart_data JSONB NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    PRIMARY KEY (cart_id), 
    FOREIGN KEY(user_id) REFERENCES "user" (user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_cart_user_id ON cart (user_id);

CREATE TABLE IF NOT EXISTS chatbot_message (
    message_id SERIAL NOT NULL, 
    user_id INTEGER, 
    session_id VARCHAR(64) NOT NULL, 
    sender VARCHAR(40) NOT NULL, 
    message_text TEXT NOT NULL, 
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    PRIMARY KEY (message_id), 
    FOREIGN KEY(user_id) REFERENCES "user" (user_id)
);

CREATE INDEX IF NOT EXISTS ix_chatbot_message_session_id ON chatbot_message (session_id);

CREATE INDEX IF NOT EXISTS ix_chatbot_message_user_id ON chatbot_message (user_id);

CREATE TABLE IF NOT EXISTS farm (
    farm_id SERIAL NOT NULL, 
    user_id INTEGER NOT NULL, 
    farm_name VARCHAR(255) NOT NULL, 
    location VARCHAR(512) NOT NULL, 
    latitude NUMERIC(10, 7), 
    longitude NUMERIC(10, 7), 
    capacity_liters NUMERIC(12, 2), 
    established_date DATE, 
    description TEXT, 
    verification_status VARCHAR(40) NOT NULL, 
    rating_avg NUMERIC(3, 2), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    PRIMARY KEY (farm_id), 
    FOREIGN KEY(user_id) REFERENCES "user" (user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_farm_user_id ON farm (user_id);

CREATE INDEX IF NOT EXISTS ix_farm_verification_status ON farm (verification_status);

CREATE TABLE IF NOT EXISTS notification (
    notification_id SERIAL NOT NULL, 
    user_id INTEGER NOT NULL, 
    type VARCHAR(40) NOT NULL, 
    message TEXT NOT NULL, 
    is_read BOOLEAN NOT NULL, 
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    PRIMARY KEY (notification_id), 
    FOREIGN KEY(user_id) REFERENCES "user" (user_id)
);

CREATE INDEX IF NOT EXISTS ix_notification_user_id ON notification (user_id);

CREATE TABLE IF NOT EXISTS "order" (
    order_id SERIAL NOT NULL, 
    user_id INTEGER NOT NULL, 
    order_items JSONB NOT NULL, 
    order_date TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    total_amount NUMERIC(12, 2) NOT NULL, 
    status VARCHAR(40) NOT NULL, 
    delivery_address TEXT, 
    PRIMARY KEY (order_id), 
    FOREIGN KEY(user_id) REFERENCES "user" (user_id)
);

CREATE INDEX IF NOT EXISTS ix_order_status ON "order" (status);

CREATE INDEX IF NOT EXISTS ix_order_user_id ON "order" (user_id);

CREATE TABLE IF NOT EXISTS complaint (
    complaint_id SERIAL NOT NULL, 
    user_id INTEGER NOT NULL, 
    order_id INTEGER, 
    subject VARCHAR(255) NOT NULL, 
    description TEXT NOT NULL, 
    status VARCHAR(40) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    resolved_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (complaint_id), 
    FOREIGN KEY(order_id) REFERENCES "order" (order_id), 
    FOREIGN KEY(user_id) REFERENCES "user" (user_id)
);

CREATE INDEX IF NOT EXISTS ix_complaint_order_id ON complaint (order_id);

CREATE INDEX IF NOT EXISTS ix_complaint_status ON complaint (status);

CREATE INDEX IF NOT EXISTS ix_complaint_user_id ON complaint (user_id);

CREATE TABLE IF NOT EXISTS delivery (
    delivery_id SERIAL NOT NULL, 
    order_id INTEGER NOT NULL, 
    delivery_person_id INTEGER, 
    address VARCHAR(512), 
    scheduled_time TIMESTAMP WITH TIME ZONE, 
    delivered_time TIMESTAMP WITH TIME ZONE, 
    status VARCHAR(40) NOT NULL, 
    PRIMARY KEY (delivery_id), 
    FOREIGN KEY(delivery_person_id) REFERENCES "user" (user_id), 
    FOREIGN KEY(order_id) REFERENCES "order" (order_id)
);

CREATE INDEX IF NOT EXISTS ix_delivery_delivery_person_id ON delivery (delivery_person_id);

CREATE UNIQUE INDEX IF NOT EXISTS ix_delivery_order_id ON delivery (order_id);

CREATE INDEX IF NOT EXISTS ix_delivery_status ON delivery (status);

CREATE TABLE IF NOT EXISTS farm_analytics (
    analytics_id SERIAL NOT NULL, 
    farm_id INTEGER NOT NULL, 
    product_category VARCHAR(128) NOT NULL, 
    period_start DATE NOT NULL, 
    period_end DATE NOT NULL, 
    quantity_produced NUMERIC(12, 2) NOT NULL, 
    quantity_sold NUMERIC(12, 2) NOT NULL, 
    quantity_wasted NUMERIC(12, 2) NOT NULL, 
    revenue NUMERIC(14, 2) NOT NULL, 
    cost NUMERIC(14, 2) NOT NULL, 
    profit NUMERIC(14, 2) NOT NULL, 
    loss NUMERIC(14, 2) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    PRIMARY KEY (analytics_id), 
    FOREIGN KEY(farm_id) REFERENCES farm (farm_id)
);

CREATE INDEX IF NOT EXISTS ix_farm_analytics_farm_id ON farm_analytics (farm_id);

CREATE TABLE IF NOT EXISTS milk_batch (
    batch_id SERIAL NOT NULL, 
    farm_id INTEGER NOT NULL, 
    batch_code VARCHAR(64) NOT NULL, 
    milking_time TIMESTAMP WITH TIME ZONE NOT NULL, 
    collection_time TIMESTAMP WITH TIME ZONE, 
    quantity_liters NUMERIC(12, 2) NOT NULL, 
    initial_storage_temp NUMERIC(6, 2), 
    status VARCHAR(40) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    PRIMARY KEY (batch_id), 
    FOREIGN KEY(farm_id) REFERENCES farm (farm_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_milk_batch_batch_code ON milk_batch (batch_code);

CREATE INDEX IF NOT EXISTS ix_milk_batch_farm_id ON milk_batch (farm_id);

CREATE TABLE IF NOT EXISTS payment (
    payment_id SERIAL NOT NULL, 
    order_id INTEGER NOT NULL, 
    amount NUMERIC(12, 2) NOT NULL, 
    method VARCHAR(40) NOT NULL, 
    status VARCHAR(40) NOT NULL, 
    transaction_ref VARCHAR(128), 
    paid_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (payment_id), 
    FOREIGN KEY(order_id) REFERENCES "order" (order_id), 
    UNIQUE (transaction_ref)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_payment_order_id ON payment (order_id);

CREATE TABLE IF NOT EXISTS ai_prediction (
    prediction_id SERIAL NOT NULL, 
    batch_id INTEGER NOT NULL, 
    predicted_shelf_life_hours NUMERIC(10, 2), 
    freshness_score NUMERIC(6, 2), 
    quality_class VARCHAR(40), 
    anomaly_flag BOOLEAN NOT NULL, 
    model_version VARCHAR(64), 
    predicted_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    PRIMARY KEY (prediction_id), 
    FOREIGN KEY(batch_id) REFERENCES milk_batch (batch_id)
);

CREATE INDEX IF NOT EXISTS ix_ai_prediction_batch_id ON ai_prediction (batch_id);

CREATE TABLE IF NOT EXISTS delivery_tracking (
    tracking_id SERIAL NOT NULL, 
    delivery_id INTEGER NOT NULL, 
    status_update VARCHAR(512) NOT NULL, 
    latitude NUMERIC(10, 7), 
    longitude NUMERIC(10, 7), 
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    PRIMARY KEY (tracking_id), 
    FOREIGN KEY(delivery_id) REFERENCES delivery (delivery_id)
);

CREATE INDEX IF NOT EXISTS ix_delivery_tracking_delivery_id ON delivery_tracking (delivery_id);

CREATE TABLE IF NOT EXISTS iot_sensor_reading (
    reading_id SERIAL NOT NULL, 
    batch_id INTEGER NOT NULL, 
    sensor_type VARCHAR(64) NOT NULL, 
    reading_value NUMERIC(12, 4) NOT NULL, 
    unit VARCHAR(32), 
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    PRIMARY KEY (reading_id), 
    FOREIGN KEY(batch_id) REFERENCES milk_batch (batch_id)
);

CREATE INDEX IF NOT EXISTS ix_iot_sensor_reading_batch_id ON iot_sensor_reading (batch_id);

CREATE INDEX IF NOT EXISTS ix_iot_sensor_reading_recorded_at ON iot_sensor_reading (recorded_at);

CREATE INDEX IF NOT EXISTS ix_iot_sensor_reading_sensor_type ON iot_sensor_reading (sensor_type);

CREATE TABLE IF NOT EXISTS product (
    product_id SERIAL NOT NULL, 
    farm_id INTEGER NOT NULL, 
    batch_id INTEGER, 
    name VARCHAR(255) NOT NULL, 
    category VARCHAR(128) NOT NULL, 
    description TEXT, 
    unit_of_measure VARCHAR(32) NOT NULL, 
    price NUMERIC(12, 2) NOT NULL, 
    quantity_available NUMERIC(12, 2) NOT NULL, 
    status VARCHAR(40) NOT NULL, 
    image_url VARCHAR(1024), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    PRIMARY KEY (product_id), 
    FOREIGN KEY(batch_id) REFERENCES milk_batch (batch_id), 
    FOREIGN KEY(farm_id) REFERENCES farm (farm_id)
);

CREATE INDEX IF NOT EXISTS ix_product_batch_id ON product (batch_id);

CREATE INDEX IF NOT EXISTS ix_product_category ON product (category);

CREATE INDEX IF NOT EXISTS ix_product_farm_id ON product (farm_id);

CREATE INDEX IF NOT EXISTS ix_product_name ON product (name);

CREATE TABLE IF NOT EXISTS bulk_purchase_request (
    request_id SERIAL NOT NULL, 
    buyer_id INTEGER NOT NULL, 
    product_id INTEGER NOT NULL, 
    quantity_requested NUMERIC(12, 2) NOT NULL, 
    target_price NUMERIC(12, 2), 
    deadline TIMESTAMP WITH TIME ZONE, 
    status VARCHAR(40) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    PRIMARY KEY (request_id), 
    FOREIGN KEY(buyer_id) REFERENCES "user" (user_id), 
    FOREIGN KEY(product_id) REFERENCES product (product_id)
);

CREATE INDEX IF NOT EXISTS ix_bulk_purchase_request_buyer_id ON bulk_purchase_request (buyer_id);

CREATE INDEX IF NOT EXISTS ix_bulk_purchase_request_product_id ON bulk_purchase_request (product_id);

CREATE INDEX IF NOT EXISTS ix_bulk_purchase_request_status ON bulk_purchase_request (status);

CREATE TABLE IF NOT EXISTS discount (
    discount_id SERIAL NOT NULL, 
    product_id INTEGER NOT NULL, 
    discount_percent NUMERIC(5, 2) NOT NULL, 
    reason VARCHAR(512), 
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL, 
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (discount_id), 
    FOREIGN KEY(product_id) REFERENCES product (product_id)
);

CREATE INDEX IF NOT EXISTS ix_discount_product_id ON discount (product_id);

CREATE TABLE IF NOT EXISTS price_history (
    history_id SERIAL NOT NULL, 
    product_id INTEGER NOT NULL, 
    old_price NUMERIC(12, 2) NOT NULL, 
    new_price NUMERIC(12, 2) NOT NULL, 
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    reason VARCHAR(512), 
    PRIMARY KEY (history_id), 
    FOREIGN KEY(product_id) REFERENCES product (product_id)
);

CREATE INDEX IF NOT EXISTS ix_price_history_product_id ON price_history (product_id);

CREATE TABLE IF NOT EXISTS review (
    review_id SERIAL NOT NULL, 
    user_id INTEGER NOT NULL, 
    farm_id INTEGER, 
    product_id INTEGER, 
    rating INTEGER NOT NULL, 
    comment TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    PRIMARY KEY (review_id), 
    FOREIGN KEY(farm_id) REFERENCES farm (farm_id), 
    FOREIGN KEY(product_id) REFERENCES product (product_id), 
    FOREIGN KEY(user_id) REFERENCES "user" (user_id)
);

CREATE INDEX IF NOT EXISTS ix_review_farm_id ON review (farm_id);

CREATE INDEX IF NOT EXISTS ix_review_product_id ON review (product_id);

CREATE INDEX IF NOT EXISTS ix_review_user_id ON review (user_id);

CREATE TABLE IF NOT EXISTS subscription (
    subscription_id SERIAL NOT NULL, 
    user_id INTEGER NOT NULL, 
    farm_id INTEGER NOT NULL, 
    product_id INTEGER, 
    frequency VARCHAR(40) NOT NULL, 
    status VARCHAR(40) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    PRIMARY KEY (subscription_id), 
    FOREIGN KEY(farm_id) REFERENCES farm (farm_id), 
    FOREIGN KEY(product_id) REFERENCES product (product_id), 
    FOREIGN KEY(user_id) REFERENCES "user" (user_id)
);

CREATE INDEX IF NOT EXISTS ix_subscription_farm_id ON subscription (farm_id);

CREATE INDEX IF NOT EXISTS ix_subscription_status ON subscription (status);

CREATE INDEX IF NOT EXISTS ix_subscription_user_id ON subscription (user_id);

CREATE TABLE IF NOT EXISTS quotation (
    quotation_id SERIAL NOT NULL, 
    request_id INTEGER NOT NULL, 
    farm_id INTEGER NOT NULL, 
    bid_price NUMERIC(12, 2) NOT NULL, 
    quantity_offered NUMERIC(12, 2) NOT NULL, 
    status VARCHAR(40) NOT NULL, 
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP) NOT NULL, 
    PRIMARY KEY (quotation_id), 
    FOREIGN KEY(farm_id) REFERENCES farm (farm_id), 
    FOREIGN KEY(request_id) REFERENCES bulk_purchase_request (request_id)
);

CREATE INDEX IF NOT EXISTS ix_quotation_farm_id ON quotation (farm_id);

CREATE INDEX IF NOT EXISTS ix_quotation_request_id ON quotation (request_id);

CREATE INDEX IF NOT EXISTS ix_quotation_status ON quotation (status);

INSERT INTO alembic_version (version_num) VALUES ('fae0062d7af9') ON CONFLICT (version_num) DO NOTHING;

-- Running upgrade fae0062d7af9 -> b7c3a1f0e4d2

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='farm' AND column_name='verification_documents') THEN
        ALTER TABLE farm ADD COLUMN verification_documents JSONB;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_ai_prediction_quality_class_enum') THEN
        ALTER TABLE ai_prediction ADD CONSTRAINT ck_ai_prediction_quality_class_enum CHECK (quality_class IN ('Fresh', 'Medium', 'Near Expiry'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_bulk_purchase_request_status_enum') THEN
        ALTER TABLE bulk_purchase_request ADD CONSTRAINT ck_bulk_purchase_request_status_enum CHECK (status IN ('open', 'fulfilled', 'expired', 'cancelled'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_chatbot_message_sender_enum') THEN
        ALTER TABLE chatbot_message ADD CONSTRAINT ck_chatbot_message_sender_enum CHECK (sender IN ('user', 'bot'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_complaint_status_enum') THEN
        ALTER TABLE complaint ADD CONSTRAINT ck_complaint_status_enum CHECK (status IN ('open', 'in_review', 'resolved', 'closed'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_delivery_status_enum') THEN
        ALTER TABLE delivery ADD CONSTRAINT ck_delivery_status_enum CHECK (status IN ('scheduled', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_farm_verification_status_enum') THEN
        ALTER TABLE farm ADD CONSTRAINT ck_farm_verification_status_enum CHECK (verification_status IN ('pending', 'verified', 'rejected'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_milk_batch_status_enum') THEN
        ALTER TABLE milk_batch ADD CONSTRAINT ck_milk_batch_status_enum CHECK (status IN ('recorded', 'testing', 'approved', 'rejected', 'expired'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_notification_type_enum') THEN
        ALTER TABLE notification ADD CONSTRAINT ck_notification_type_enum CHECK (type IN ('order', 'payment', 'delivery', 'promotion', 'system', 'subscription', 'pricing'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_order_status_enum') THEN
        ALTER TABLE "order" ADD CONSTRAINT ck_order_status_enum CHECK (status IN ('pending', 'paid', 'confirmed', 'preparing', 'in_transit', 'delivered', 'cancelled', 'refunded'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_payment_method_enum') THEN
        ALTER TABLE payment ADD CONSTRAINT ck_payment_method_enum CHECK (method IN ('card', 'bank_transfer', 'wallet', 'cash_on_delivery'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_payment_status_enum') THEN
        ALTER TABLE payment ADD CONSTRAINT ck_payment_status_enum CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_product_status_enum') THEN
        ALTER TABLE product ADD CONSTRAINT ck_product_status_enum CHECK (status IN ('draft', 'active', 'out_of_stock', 'archived'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_quotation_status_enum') THEN
        ALTER TABLE quotation ADD CONSTRAINT ck_quotation_status_enum CHECK (status IN ('submitted', 'accepted', 'rejected', 'withdrawn'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_subscription_frequency_enum') THEN
        ALTER TABLE subscription ADD CONSTRAINT ck_subscription_frequency_enum CHECK (frequency IN ('daily', 'weekly', 'monthly'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_subscription_status_enum') THEN
        ALTER TABLE subscription ADD CONSTRAINT ck_subscription_status_enum CHECK (status IN ('active', 'paused', 'cancelled'));
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_user_role_enum') THEN
        ALTER TABLE "user" DROP CONSTRAINT ck_user_role_enum;
    END IF;
    ALTER TABLE "user" ADD CONSTRAINT ck_user_role_enum CHECK (role IN ('customer', 'farmer', 'business', 'rider', 'admin', 'superadmin'));
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_user_status_enum') THEN
        ALTER TABLE "user" ADD CONSTRAINT ck_user_status_enum CHECK (status IN ('active', 'pending', 'suspended', 'deactivated'));
    END IF;
END $$;

-- Super Admin governance upgrade (c9e4f2a7d1b3)
ALTER TABLE complaint ADD COLUMN IF NOT EXISTS category VARCHAR(128);
ALTER TABLE complaint ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'normal';
ALTER TABLE complaint ADD COLUMN IF NOT EXISTS farm_id INTEGER;
ALTER TABLE complaint ADD COLUMN IF NOT EXISTS batch_id INTEGER;
ALTER TABLE complaint ADD COLUMN IF NOT EXISTS escalated_by_admin_id INTEGER;
ALTER TABLE complaint ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE complaint ADD COLUMN IF NOT EXISTS admin_remarks TEXT;
ALTER TABLE complaint ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE complaint ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_complaint_farm') THEN
        ALTER TABLE complaint ADD CONSTRAINT fk_complaint_farm FOREIGN KEY (farm_id) REFERENCES farm (farm_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_complaint_batch') THEN
        ALTER TABLE complaint ADD CONSTRAINT fk_complaint_batch FOREIGN KEY (batch_id) REFERENCES milk_batch (batch_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_complaint_escalated_by') THEN
        ALTER TABLE complaint ADD CONSTRAINT fk_complaint_escalated_by FOREIGN KEY (escalated_by_admin_id) REFERENCES "user" (user_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_complaint_category ON complaint (category);
CREATE INDEX IF NOT EXISTS ix_complaint_priority ON complaint (priority);
CREATE INDEX IF NOT EXISTS ix_complaint_farm_id ON complaint (farm_id);
CREATE INDEX IF NOT EXISTS ix_complaint_batch_id ON complaint (batch_id);
CREATE INDEX IF NOT EXISTS ix_complaint_escalated_by_admin_id ON complaint (escalated_by_admin_id);

CREATE TABLE IF NOT EXISTS admin_application (
    application_id SERIAL PRIMARY KEY,
    applicant_user_id INTEGER NOT NULL REFERENCES "user" (user_id),
    requested_role VARCHAR(40) NOT NULL DEFAULT 'admin',
    reason TEXT,
    status VARCHAR(40) NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by_superadmin_id INTEGER REFERENCES "user" (user_id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    CONSTRAINT ck_admin_application_status_enum CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn'))
);
CREATE INDEX IF NOT EXISTS ix_admin_application_applicant_user_id ON admin_application (applicant_user_id);
CREATE INDEX IF NOT EXISTS ix_admin_application_status ON admin_application (status);

CREATE TABLE IF NOT EXISTS admin_farm_assignment (
    assignment_id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES "user" (user_id),
    farm_id INTEGER NOT NULL REFERENCES farm (farm_id),
    assigned_by_superadmin_id INTEGER NOT NULL REFERENCES "user" (user_id),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_admin_farm_assignment UNIQUE (admin_id, farm_id)
);
CREATE INDEX IF NOT EXISTS ix_admin_farm_assignment_admin_id ON admin_farm_assignment (admin_id);
CREATE INDEX IF NOT EXISTS ix_admin_farm_assignment_farm_id ON admin_farm_assignment (farm_id);
CREATE INDEX IF NOT EXISTS ix_admin_farm_assignment_assigned_by_superadmin_id ON admin_farm_assignment (assigned_by_superadmin_id);
CREATE INDEX IF NOT EXISTS ix_admin_farm_assignment_is_active ON admin_farm_assignment (is_active);

CREATE TABLE IF NOT EXISTS escalation_case (
    case_id SERIAL PRIMARY KEY,
    case_code VARCHAR(64) NOT NULL UNIQUE,
    case_type VARCHAR(40) NOT NULL,
    category VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(40) NOT NULL DEFAULT 'normal',
    status VARCHAR(40) NOT NULL DEFAULT 'pending',
    raised_by_admin_id INTEGER NOT NULL REFERENCES "user" (user_id),
    assigned_to_superadmin_id INTEGER REFERENCES "user" (user_id),
    farm_id INTEGER REFERENCES farm (farm_id),
    batch_id INTEGER REFERENCES milk_batch (batch_id),
    user_id INTEGER REFERENCES "user" (user_id),
    complaint_id INTEGER REFERENCES complaint (complaint_id),
    admin_remarks TEXT,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT ck_escalation_case_case_type_enum CHECK (case_type IN ('farm', 'batch', 'account', 'technical', 'complaint')),
    CONSTRAINT ck_escalation_case_priority_enum CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    CONSTRAINT ck_escalation_case_status_enum CHECK (status IN ('pending', 'in_review', 'awaiting_admin', 'resolved', 'closed'))
);
CREATE INDEX IF NOT EXISTS ix_escalation_case_case_code ON escalation_case (case_code);
CREATE INDEX IF NOT EXISTS ix_escalation_case_case_type ON escalation_case (case_type);
CREATE INDEX IF NOT EXISTS ix_escalation_case_category ON escalation_case (category);
CREATE INDEX IF NOT EXISTS ix_escalation_case_priority ON escalation_case (priority);
CREATE INDEX IF NOT EXISTS ix_escalation_case_status ON escalation_case (status);
CREATE INDEX IF NOT EXISTS ix_escalation_case_raised_by_admin_id ON escalation_case (raised_by_admin_id);
CREATE INDEX IF NOT EXISTS ix_escalation_case_farm_id ON escalation_case (farm_id);
CREATE INDEX IF NOT EXISTS ix_escalation_case_batch_id ON escalation_case (batch_id);
CREATE INDEX IF NOT EXISTS ix_escalation_case_user_id ON escalation_case (user_id);
CREATE INDEX IF NOT EXISTS ix_escalation_case_complaint_id ON escalation_case (complaint_id);
CREATE INDEX IF NOT EXISTS ix_escalation_case_created_at ON escalation_case (created_at);

CREATE TABLE IF NOT EXISTS platform_setting (
    setting_key VARCHAR(128) PRIMARY KEY,
    value_json JSONB,
    updated_by INTEGER NOT NULL REFERENCES "user" (user_id),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_platform_setting_updated_by ON platform_setting (updated_by);

INSERT INTO alembic_version (version_num) VALUES ('c9e4f2a7d1b3') ON CONFLICT (version_num) DO NOTHING;
DELETE FROM alembic_version WHERE version_num NOT IN ('c9e4f2a7d1b3');

COMMIT;

