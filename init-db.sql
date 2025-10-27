CREATE TABLE IF NOT EXISTS mappings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    source_schema_hash VARCHAR(255) NOT NULL,
    target_schema TEXT NOT NULL,
    mapping_json JSONB NOT NULL,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
