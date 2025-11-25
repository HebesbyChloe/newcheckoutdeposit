-- Migration to create deposit_plans table and update deposit_sessions table

-- Create deposit_plans table
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

-- Add plan_id column to deposit_sessions table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deposit_sessions' AND column_name = 'plan_id') THEN
        ALTER TABLE deposit_sessions ADD COLUMN plan_id VARCHAR(255) REFERENCES deposit_plans(id);
        RAISE NOTICE 'Column plan_id added to deposit_sessions table.';
    ELSE
        RAISE NOTICE 'Column plan_id already exists in deposit_sessions table.';
    END IF;
END $$;

-- Add draft_order_ids JSONB column to store all draft order IDs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deposit_sessions' AND column_name = 'draft_order_ids') THEN
        ALTER TABLE deposit_sessions ADD COLUMN draft_order_ids JSONB;
        RAISE NOTICE 'Column draft_order_ids added to deposit_sessions table.';
    ELSE
        RAISE NOTICE 'Column draft_order_ids already exists in deposit_sessions table.';
    END IF;
END $$;

-- Create index on deposit_plans for active and is_default
CREATE INDEX IF NOT EXISTS idx_deposit_plans_active ON deposit_plans(active);
CREATE INDEX IF NOT EXISTS idx_deposit_plans_default ON deposit_plans(is_default);
CREATE INDEX IF NOT EXISTS idx_deposit_sessions_plan_id ON deposit_sessions(plan_id);

-- Update trigger for deposit_plans.updated_at
CREATE TRIGGER update_deposit_plans_updated_at BEFORE UPDATE ON deposit_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

