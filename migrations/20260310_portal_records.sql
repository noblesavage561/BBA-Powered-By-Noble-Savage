-- Migration: portal interaction records
-- Safe to run multiple times.

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

CREATE INDEX IF NOT EXISTS idx_portal_documents_client_case
    ON portal_documents(client_id, case_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS portal_thread_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    case_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('client', 'assistant', 'advisor', 'admin')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_thread_messages_case
    ON portal_thread_messages(client_id, case_id, created_at ASC);
