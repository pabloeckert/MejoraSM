-- 028_archive_historical_inbox.sql
-- Archivar masivamente todas las conversaciones históricas en inbox_items.
-- Deja la bandeja de entrada ('/conversaciones') con 0 pendientes (lienzo en blanco)
-- marcando archived = true y asegurando replied_at con timestamp para todos
-- los mensajes previos, preservando su consulta bajo el filtro "Archivadas".

UPDATE inbox_items
SET
  archived = true,
  replied_at = COALESCE(replied_at, now())
WHERE archived = false OR replied_at IS NULL;
