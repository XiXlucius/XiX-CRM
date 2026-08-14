-- Punto de partida configurable por agente para la ruta de cobro (HANDOFF-RUTA-COBRO.md, Fase 2.2).
DO $$ BEGIN
  ALTER TABLE team_members ADD COLUMN origin_lat numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE team_members ADD COLUMN origin_lng numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
