-- Migration: Add missing fields to carts table
-- id_tenant, total_amount, shopify_cart_url

-- Add id_tenant column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'carts' AND column_name = 'id_tenant'
    ) THEN
        ALTER TABLE carts ADD COLUMN id_tenant INTEGER;
    END IF;
END $$;

-- Add total_amount column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'carts' AND column_name = 'total_amount'
    ) THEN
        ALTER TABLE carts ADD COLUMN total_amount DECIMAL(10, 2) DEFAULT 0;
    END IF;
END $$;

-- Add shopify_cart_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'carts' AND column_name = 'shopify_cart_url'
    ) THEN
        ALTER TABLE carts ADD COLUMN shopify_cart_url TEXT;
    END IF;
END $$;

