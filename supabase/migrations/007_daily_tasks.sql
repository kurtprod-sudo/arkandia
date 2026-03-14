-- ===========================================================================
-- Fase 8 — Daily Tasks e Login Streak
-- Referência: GDD_Sistemas §5
-- ===========================================================================

-- Tasks diárias por personagem (5 sorteadas de pool de 7)
CREATE TABLE daily_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  task_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  tasks         JSONB NOT NULL DEFAULT '[]',
  completed_count INTEGER NOT NULL DEFAULT 0,
  ticket_granted  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, task_date)
);

-- Streak de login consecutivo
CREATE TABLE login_streak (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE,
  total_logins   INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id)
);

-- RLS
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_tasks_owner" ON daily_tasks
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE login_streak ENABLE ROW LEVEL SECURITY;
CREATE POLICY "login_streak_owner" ON login_streak
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

-- Índices
CREATE INDEX idx_daily_tasks_character_date
  ON daily_tasks(character_id, task_date DESC);
CREATE INDEX idx_login_streak_character
  ON login_streak(character_id);

-- Triggers
CREATE TRIGGER trg_daily_tasks_updated_at
  BEFORE UPDATE ON daily_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_login_streak_updated_at
  BEFORE UPDATE ON login_streak
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
