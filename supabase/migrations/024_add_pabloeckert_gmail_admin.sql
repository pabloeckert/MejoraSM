-- 024_add_pabloeckert_gmail_admin.sql
-- Registra a pabloeckert@gmail.com como administrador soberano en app_admins

INSERT INTO app_admins (email)
VALUES ('pabloeckert@gmail.com')
ON CONFLICT (email) DO NOTHING;
