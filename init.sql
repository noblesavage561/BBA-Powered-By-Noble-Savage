CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- TENANTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan_tier TEXT CHECK (plan_tier IN ('startup', 'growth', 'enterprise')) DEFAULT 'startup',
    subscription_status TEXT DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- ============================================================================
-- CLIENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    business_name TEXT NOT NULL,
    business_type TEXT CHECK (business_type IN ('LLC', 'S-Corp', 'C-Corp', 'Sole Prop', 'Partnership')),
    ein_encrypted TEXT,
    state_of_incorporation TEXT,
    naics_code TEXT,
    incorporation_date DATE,
    health_score INTEGER DEFAULT 0,
    funding_score INTEGER DEFAULT 0,
    onboarding_step INTEGER DEFAULT 1,
    current_treatment_plan JSONB DEFAULT '{}',
    last_audit_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_health_score ON clients(health_score) WHERE health_score < 70;

-- ============================================================================
-- BANK ACCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    plaid_item_id TEXT NOT NULL DEFAULT 'local_item',
    account_id TEXT NOT NULL DEFAULT 'local_account',
    account_name TEXT NOT NULL DEFAULT 'Operating Account',
    account_type TEXT,
    account_subtype TEXT,
    current_balance DECIMAL(15,2),
    available_balance DECIMAL(15,2),
    iso_currency_code TEXT DEFAULT 'USD',
    last_synced_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    plaid_transaction_id TEXT UNIQUE,
    amount DECIMAL(15,2) NOT NULL,
    iso_currency_code TEXT DEFAULT 'USD',
    date DATE NOT NULL,
    description TEXT,
    merchant_name TEXT,
    category_level1 TEXT,
    category_level2 TEXT,
    category_level3 TEXT,
    personal_finance_category TEXT,
    pending BOOLEAN DEFAULT false,
    ai_category TEXT,
    ai_confidence FLOAT,
    ai_tax_deductible BOOLEAN,
    ai_tax_category TEXT,
    requires_review BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_client ON transactions(client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_ai_category ON transactions(ai_category) WHERE ai_category IS NULL;

-- ============================================================================
-- DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    s3_key TEXT NOT NULL DEFAULT 'local/s3/key',
    original_filename TEXT,
    file_type TEXT CHECK (file_type IN ('pdf', 'png', 'jpg', 'csv', 'xml')),
    file_size INTEGER,
    doc_category TEXT CHECK (doc_category IN ('tax_return', 'irs_notice', 'bank_statement', 'invoice', 'contract', 'financial_statement', 'other')),
    ocr_status TEXT DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
    extraction_payload JSONB,
    intelligence_payload JSONB,
    confidence_score FLOAT,
    requires_human_review BOOLEAN DEFAULT false,
    review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'modified')),
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_ocr_status ON documents(ocr_status) WHERE ocr_status != 'completed';

-- ============================================================================
-- FUNDING PARTNERS / APPLICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS funding_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    display_name TEXT,
    type TEXT CHECK (type IN ('CDFI', 'SBA_Lender', 'Credit_Union', 'Fintech', 'Bank')),
    lending_mandate JSONB,
    min_loan_amount INTEGER,
    max_loan_amount INTEGER,
    min_credit_score INTEGER,
    min_time_in_business INTEGER,
    geographic_focus TEXT[],
    interest_rate_min DECIMAL(5,2),
    interest_rate_max DECIMAL(5,2),
    term_length_min INTEGER,
    term_length_max INTEGER,
    application_url TEXT,
    referral_email TEXT,
    api_available BOOLEAN DEFAULT false,
    active_status BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funding_partners_type ON funding_partners(type);
CREATE INDEX IF NOT EXISTS idx_funding_partners_active ON funding_partners(active_status) WHERE active_status = true;

CREATE TABLE IF NOT EXISTS funding_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES funding_partners(id),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'underwriting', 'approved', 'denied', 'funded', 'withdrawn')),
    loan_amount_requested INTEGER,
    loan_amount_approved INTEGER,
    interest_rate DECIMAL(5,2),
    term_length INTEGER,
    submitted_at TIMESTAMPTZ,
    decision_at TIMESTAMPTZ,
    funded_at TIMESTAMPTZ,
    denial_reason TEXT,
    ai_recommendation_score FLOAT,
    ai_match_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AGENT / TREATMENT / AUDIT
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    reasoning TEXT,
    payload JSONB,
    impact_level TEXT CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    confidence_score FLOAT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'requires_human')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_client ON agent_logs(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_impact ON agent_logs(impact_level) WHERE impact_level IN ('high', 'critical');

CREATE TABLE IF NOT EXISTS treatment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    plan_data JSONB NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS treatment_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    treatment_plan_id UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    due_date DATE,
    completed_at TIMESTAMPTZ,
    assigned_to TEXT,
    ai_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID,
    user_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supporting local funding calculations.
CREATE TABLE IF NOT EXISTS client_credit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    credit_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portal interaction records.
CREATE TABLE IF NOT EXISTS portal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    case_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, client_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_portal_documents_client_case ON portal_documents(client_id, case_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS portal_thread_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    case_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('client', 'assistant', 'advisor', 'admin')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_thread_messages_case ON portal_thread_messages(client_id, case_id, created_at ASC);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_clients ON clients;
DROP POLICY IF EXISTS tenant_isolation_documents ON documents;
DROP POLICY IF EXISTS tenant_isolation_transactions ON transactions;
DROP POLICY IF EXISTS tenant_isolation_bank_accounts ON bank_accounts;
DROP POLICY IF EXISTS tenant_isolation_agent_logs ON agent_logs;
DROP POLICY IF EXISTS tenant_isolation_treatment_plans ON treatment_plans;
DROP POLICY IF EXISTS tenant_isolation_funding_applications ON funding_applications;
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;

CREATE POLICY tenant_isolation_clients ON clients
    USING (tenant_id::text = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY tenant_isolation_documents ON documents
    USING (tenant_id::text = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY tenant_isolation_transactions ON transactions
    USING (tenant_id::text = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY tenant_isolation_bank_accounts ON bank_accounts
    USING (tenant_id::text = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY tenant_isolation_agent_logs ON agent_logs
    USING (tenant_id::text = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY tenant_isolation_treatment_plans ON treatment_plans
    USING (tenant_id::text = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY tenant_isolation_funding_applications ON funding_applications
    USING (tenant_id::text = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    USING (tenant_id::text = current_setting('app.current_tenant_id', true)::text);

-- ============================================================================
-- LOCAL SEED DATA
-- ============================================================================

INSERT INTO tenants (id, company_name, slug, plan_tier, subscription_status, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'BBA Demo Tenant',
    'bba-demo',
    'growth',
    'active',
    '{"naics_code":"541611"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (
    id, tenant_id, owner_name, email, business_name, business_type,
    incorporation_date, health_score, funding_score
)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'Demo Owner',
    'owner@demo.test',
    'Demo Business LLC',
    'LLC',
    '2020-01-15',
    78,
    72
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO bank_accounts (
    id, tenant_id, client_id, plaid_item_id, account_id, account_name,
    account_type, account_subtype, current_balance, available_balance
)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'demo_item',
    'demo_account',
    'Main Operating',
    'depository',
    'checking',
    25000.00,
    24500.00
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO transactions (
    tenant_id, client_id, bank_account_id, amount, date, description, merchant_name
)
VALUES
    ('00000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',12000.00,CURRENT_DATE - INTERVAL '40 days','Client payment','ACME Corp'),
    ('00000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',-2500.00,CURRENT_DATE - INTERVAL '35 days','Office rent','Landlord Inc'),
    ('00000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',14000.00,CURRENT_DATE - INTERVAL '10 days','Consulting revenue','Beta LLC'),
    ('00000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',-3200.00,CURRENT_DATE - INTERVAL '5 days','Payroll','Payroll Provider')
ON CONFLICT DO NOTHING;

INSERT INTO documents (tenant_id, client_id, s3_key, original_filename, file_type, doc_category, ocr_status)
VALUES
    ('00000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','local/demo/tax_return_2024.pdf','tax_return_2024.pdf','pdf','tax_return','completed'),
    ('00000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','local/demo/financial_statement_q1.pdf','financial_statement_q1.pdf','pdf','financial_statement','completed')
ON CONFLICT DO NOTHING;

INSERT INTO client_credit (client_id, credit_score)
VALUES ('11111111-1111-1111-1111-111111111111', 690)
ON CONFLICT DO NOTHING;

INSERT INTO funding_partners (
    id, name, display_name, type, min_loan_amount, max_loan_amount,
    min_credit_score, min_time_in_business, geographic_focus, active_status
)
VALUES
    ('33333333-3333-3333-3333-333333333333', 'Community Capital CDFI', 'Community Capital', 'CDFI', 10000, 250000, 600, 1, ARRAY['TX', 'CA', 'NY'], true),
    ('44444444-4444-4444-4444-444444444444', 'Growth SBA Lender', 'Growth SBA', 'SBA_Lender', 50000, 500000, 680, 2, ARRAY['US'], true)
ON CONFLICT (id) DO NOTHING;
