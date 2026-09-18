-- Additive migration: single-row lock table + atomic create/reactivate functions.
-- Advisory locks are unreliable through Neon's connection pooler (transaction
-- mode can route concurrent statements to different backends). Row-level
-- FOR UPDATE locks are server-global and serialize correctly everywhere.

-- CreateTable
CREATE TABLE IF NOT EXISTS "_sub_admin_lock" (
    "id" INTEGER NOT NULL,
    CONSTRAINT "_sub_admin_lock_pkey" PRIMARY KEY ("id")
);

INSERT INTO "_sub_admin_lock" ("id") VALUES (1);

-- Atomically create a Sub-Admin, strictly capped at p_limit ACTIVE accounts.
CREATE OR REPLACE FUNCTION "create_sub_admin_atomically"(
    p_user_id TEXT,
    p_admin_id TEXT,
    p_email TEXT,
    p_name TEXT,
    p_password_hash TEXT,
    p_department TEXT,
    p_limit INT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT;
BEGIN
    PERFORM 1 FROM "_sub_admin_lock" WHERE "id" = 1 FOR UPDATE;

    SELECT count(*)::int INTO v_count
    FROM "users" u
    WHERE u.role = 'SUB_ADMIN'
      AND EXISTS (SELECT 1 FROM "admins" a WHERE a."userId" = u.id AND a.status = 'ACTIVE');

    IF v_count >= p_limit THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Only ' || p_limit || ' active Sub-Admins are allowed.');
    END IF;

    INSERT INTO "users" ("id", "email", "name", "image", "role", "provider", "passwordHash", "emailVerified", "lastLoginAt", "lastActiveAt", "createdAt", "updatedAt")
    VALUES (p_user_id, p_email, p_name, NULL, 'SUB_ADMIN', 'credentials', p_password_hash, NULL, NULL, NULL, now(), now());

    INSERT INTO "admins" ("id", "userId", "permissions", "department", "status")
    VALUES (p_admin_id, p_user_id, '[]', p_department, 'ACTIVE');

    RETURN jsonb_build_object('ok', true, 'userId', p_user_id, 'email', p_email, 'name', p_name);
END;
$$;

-- Atomically adjust a Sub-Admin's status. Suspending is unconditional; reactivating
-- is held to the global cap (the account being reactivated is excluded from the count).
CREATE OR REPLACE FUNCTION "set_sub_admin_status_atomically"(
    p_user_id TEXT,
    p_admin_id TEXT,
    p_target_status TEXT,
    p_limit INT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT;
BEGIN
    IF p_target_status = 'SUSPENDED' THEN
        UPDATE "admins" SET "status" = 'SUSPENDED' WHERE "id" = p_admin_id;
        RETURN jsonb_build_object('ok', true);
    END IF;

    PERFORM 1 FROM "_sub_admin_lock" WHERE "id" = 1 FOR UPDATE;

    SELECT count(*)::int INTO v_count
    FROM "users" u
    WHERE u.role = 'SUB_ADMIN'
      AND u.id <> p_user_id
      AND EXISTS (SELECT 1 FROM "admins" a WHERE a."userId" = u.id AND a.status = 'ACTIVE');

    IF v_count >= p_limit THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Only ' || p_limit || ' active Sub-Admins are allowed.');
    END IF;

    UPDATE "admins" SET "status" = 'ACTIVE' WHERE "id" = p_admin_id;
    RETURN jsonb_build_object('ok', true);
END;
$$;