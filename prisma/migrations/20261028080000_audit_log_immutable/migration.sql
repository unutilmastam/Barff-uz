-- Audit jurnali TAHRIRLANMAYDI (CLAUDE.md §23, S38).
--
-- Ilova kodida yozuvni o'zgartiradigan joy yo'q, lekin bu yetarli emas:
-- kelajakdagi xato yoki to'g'ridan-to'g'ri SQL jurnalni "tuzatib" qo'yishi
-- mumkin. Shuning uchun himoya bazaning o'zida — stock trigger'lari
-- (S28) bilan bir xil yondashuv.
--
-- RUXSAT ETILGAN YAGONA o'zgarish: `actorId` ning NULL ga aylanishi. Bu
-- `ON DELETE SET NULL` (foydalanuvchi o'chirilganda) dan keladi va
-- bajaruvchining emaili `actorEmail` da qoladi. Boshqa har qanday UPDATE rad etiladi.
--
-- DELETE ataylab ruxsat etilgan: saqlash muddati tugagan yozuvlarni
-- tozalash siyosati `docs/AUDIT-POLICY.md` da.

CREATE OR REPLACE FUNCTION audit_logs_block_update() RETURNS trigger AS $$
BEGIN
  IF OLD."actorId" IS NOT NULL
     AND NEW."actorId" IS NULL
     AND NEW."id" = OLD."id"
     AND NEW."actorEmail" IS NOT DISTINCT FROM OLD."actorEmail"
     AND NEW."action" = OLD."action"
     AND NEW."entity" = OLD."entity"
     AND NEW."entityId" IS NOT DISTINCT FROM OLD."entityId"
     AND NEW."before" IS NOT DISTINCT FROM OLD."before"
     AND NEW."after" IS NOT DISTINCT FROM OLD."after"
     AND NEW."ip" IS NOT DISTINCT FROM OLD."ip"
     AND NEW."userAgent" IS NOT DISTINCT FROM OLD."userAgent"
     AND NEW."requestId" IS NOT DISTINCT FROM OLD."requestId"
     AND NEW."createdAt" = OLD."createdAt"
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'audit_logs tahrirlanmaydi' USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_no_update
  BEFORE UPDATE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_update();
