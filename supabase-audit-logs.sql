-- ============================================
-- Migración incremental: Audit Logs
-- Ejecutar en el SQL Editor de Supabase
-- (Segura para proyectos ya migrados)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  actor_user_id BIGINT,
  actor_username TEXT,
  ip TEXT,
  user_agent TEXT,
  path TEXT,
  method TEXT,
  meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Si ya existe la policy, esto evita error al re-ejecutar
DROP POLICY IF EXISTS "Solo servicio puede gestionar audit logs" ON audit_logs;
CREATE POLICY "Solo servicio puede gestionar audit logs" ON audit_logs
  FOR ALL USING (false);
