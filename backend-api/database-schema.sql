-- Database Schema for Cart, Checkout, and Deposit Sessions
-- Run this SQL to create the required tables

-- Carts table
CREATE TABLE IF NOT EXISTS carts (
    id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(255),
    total_quantity INTEGER DEFAULT 0,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    id_tenant INTEGER,
    shopify_cart_id VARCHAR(255),
    shopify_cart_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
    id VARCHAR(255) PRIMARY KEY,
    cart_id VARCHAR(255) NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL CHECK (source IN ('shopify', 'external')),
    variant_id VARCHAR(255),
    external_id VARCHAR(255),
    product_handle VARCHAR(255),
    title VARCHAR(500),
    image_url TEXT,
    price_amount DECIMAL(10, 2),
    price_currency VARCHAR(10) DEFAULT 'USD',
    quantity INTEGER DEFAULT 1,
    attributes JSONB,
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Deposit sessions table
CREATE TABLE IF NOT EXISTS deposit_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    cart_id VARCHAR(255) NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    customer_id VARCHAR(255),
    total_amount DECIMAL(10, 2) NOT NULL,
    deposit_amount DECIMAL(10, 2) NOT NULL,
    remaining_amount DECIMAL(10, 2) NOT NULL,
    draft_order_id VARCHAR(255),
    plan_id VARCHAR(255) REFERENCES deposit_plans(id),
    draft_order_ids JSONB,
    checkout_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('DEPOSIT', 'REMAINING', 'FULL')),
    amount DECIMAL(10, 2) NOT NULL,
    transaction_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- External variants table (tracks Shopify variants created for external diamonds)
CREATE TABLE IF NOT EXISTS external_variants (
    external_id VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    product_id VARCHAR(255),
    variant_id VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2),
    last_synced_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (external_id, source_type)
);

-- Deposit plans table
CREATE TABLE IF NOT EXISTS deposit_plans (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('PERCENTAGE', 'FIXED', 'HYBRID')),
    percentage DECIMAL(5, 2),
    fixed_amount DECIMAL(10, 2),
    number_of_instalments INTEGER NOT NULL DEFAULT 1,
    min_deposit DECIMAL(10, 2),
    max_deposit DECIMAL(10, 2),
    is_default BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_external_id ON cart_items(external_id);
CREATE INDEX IF NOT EXISTS idx_deposit_sessions_cart_id ON deposit_sessions(cart_id);
CREATE INDEX IF NOT EXISTS idx_deposit_sessions_customer_id ON deposit_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_external_variants_variant_id ON external_variants(variant_id);
CREATE INDEX IF NOT EXISTS idx_deposit_plans_active ON deposit_plans(active);
CREATE INDEX IF NOT EXISTS idx_deposit_plans_default ON deposit_plans(is_default);
CREATE INDEX IF NOT EXISTS idx_deposit_sessions_plan_id ON deposit_sessions(plan_id);

-- Update trigger for carts.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deposit_plans_updated_at BEFORE UPDATE ON deposit_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

