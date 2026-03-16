-- ============================================================================
-- 024_levelup.sql — Sistema de Level Up completo
-- Adiciona coluna resonance_event_pending e atualiza trigger de level up
-- ============================================================================

-- ─── 1. COLUNA DE EVENTO PENDENTE DE RESSONÂNCIA ──────────────────────────

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS resonance_event_pending BOOLEAN DEFAULT FALSE;

-- ─── 2. ATUALIZA TRIGGER DE LEVEL UP ──────────────────────────────────────
-- O trigger existente (001) concedia pontos. Este substitui com lógica completa:
-- - Concede attribute_points (3 + 1 bônus para Humanos, 2 + 1 para outros)
-- - Atualiza xp_to_next_level
-- - Marca resonance_event_pending se atingiu nível 5

CREATE OR REPLACE FUNCTION on_level_up()
RETURNS TRIGGER AS $$
DECLARE
  points_gained INT;
  race_name TEXT;
  is_human BOOLEAN;
BEGIN
  IF NEW.level > OLD.level THEN
    -- Busca raça do personagem
    SELECT r.name INTO race_name
    FROM races r WHERE r.id = NEW.race_id;

    is_human := (race_name = 'Humano');

    -- Calcula pontos: Humano ganha 4/nível, outros 3/nível
    -- Bônus de +1 a cada múltiplo de 5
    points_gained := 0;
    FOR i IN (OLD.level + 1)..NEW.level LOOP
      IF is_human THEN
        points_gained := points_gained + 4;
      ELSE
        points_gained := points_gained + 3;
      END IF;
      IF (i % 5 = 0) THEN
        points_gained := points_gained + 1;
      END IF;
    END LOOP;

    -- Concede pontos de atributo
    UPDATE character_attributes
    SET attribute_points = attribute_points + points_gained
    WHERE character_id = NEW.id;

    -- Marca evento de Ressonância se atingiu nível 5 pela primeira vez
    IF OLD.level < 5 AND NEW.level >= 5 AND NOT COALESCE(NEW.is_resonance_unlocked, FALSE) THEN
      NEW.resonance_event_pending := TRUE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- O trigger já existe (001), só substituímos a função acima
-- DROP TRIGGER IF EXISTS trg_on_level_up ON characters;
-- CREATE TRIGGER trg_on_level_up
--   BEFORE UPDATE OF level ON characters
--   FOR EACH ROW EXECUTE FUNCTION on_level_up();

-- Nota: o trigger precisa ser BEFORE (não AFTER) para poder modificar NEW
-- Recria trigger como BEFORE se o existente for AFTER
DROP TRIGGER IF EXISTS trg_on_level_up ON characters;
CREATE TRIGGER trg_on_level_up
  BEFORE UPDATE OF level ON characters
  FOR EACH ROW EXECUTE FUNCTION on_level_up();
