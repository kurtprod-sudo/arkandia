-- ============================================================================
-- FASE 18 — Pagamentos PIX (Mercado Pago)
-- Referência: GDD_Sistemas §4.1 (Gemas)
-- ============================================================================

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  mp_payment_id   TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  amount_brl      NUMERIC(10,2) NOT NULL,
  gemas_amount    INTEGER NOT NULL,
  qr_code         TEXT,
  qr_code_base64  TEXT,
  ticket_url      TEXT,
  approved_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_owner_read" ON payments
  FOR SELECT USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );
CREATE POLICY "payments_owner_insert" ON payments
  FOR INSERT WITH CHECK (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );
CREATE POLICY "payments_system_update" ON payments
  FOR UPDATE USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

-- Índices
CREATE INDEX idx_payments_character ON payments(character_id, created_at DESC);
CREATE INDEX idx_payments_mp_id ON payments(mp_payment_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Trigger updated_at
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
