-- Sign-ups validated by the app, waiting for Supabase Auth to create the account.
CREATE TABLE "PendingSignup" (
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "room" TEXT,
    "rulesAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingSignup_pkey" PRIMARY KEY ("token")
);

-- Like the other tables: invisible to Supabase's public Data API.
ALTER TABLE "PendingSignup" ENABLE ROW LEVEL SECURITY;

-- The functions live in their own schema, which the Data API doesn't expose,
-- so nobody can call them from outside.
CREATE SCHEMA IF NOT EXISTS private;

-- Lowercase letters and digits only: "D'Amico" → "damico", "Nicolò" → "nicolo".
-- Must match slug() in src/lib/people.ts, which previews the username.
CREATE FUNCTION private.slug(t text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(lower(regexp_replace(normalize(coalesce(t, ''), NFD), '[̀-ͯ]', '', 'g')), '[^a-z0-9]', '', 'g')
$$;

-- surname.name, or surname.name2, surname.name3… when it's already taken.
-- Must match baseUsername() in src/lib/people.ts.
CREATE FUNCTION private.available_username(first_name text, last_name text) RETURNS text
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  base text := coalesce(
    nullif(concat_ws('.', nullif(private.slug(last_name), ''), nullif(private.slug(first_name), '')), ''),
    'utente'
  );
  n int := 2;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."User" WHERE username = base) THEN
    RETURN base;
  END IF;
  WHILE EXISTS (SELECT 1 FROM public."User" WHERE username = base || n) LOOP
    n := n + 1;
  END LOOP;
  RETURN base || n;
END
$$;

-- Runs inside the transaction that creates the Supabase Auth account, so the
-- account and its User row are created together or not at all.
--
-- The profile comes from the PendingSignup row whose token the app put in the
-- account's metadata, never from the metadata itself. A sign-up that didn't go
-- through the app's form (and its registration code) has no valid token and is
-- refused, so no Auth account can exist without a profile.
CREATE FUNCTION private.create_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  now_utc timestamp := now() AT TIME ZONE 'UTC'; -- Prisma stores UTC in "timestamp" columns
  signup public."PendingSignup";
  attempt int := 0;
  violated text;
BEGIN
  DELETE FROM public."PendingSignup"
  WHERE token = NEW.raw_user_meta_data ->> 'signup_token'
    AND email = lower(NEW.email)
    AND "createdAt" > now_utc - interval '1 hour'
  RETURNING * INTO signup;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sign-up without a valid token: residents must register through the app';
  END IF;

  -- If a homonym takes the same username at the same moment, try the next one.
  LOOP
    BEGIN
      INSERT INTO public."User"
        ("authId", "firstName", "lastName", email, username, room, "rulesAcceptedAt", "emailVerifiedAt", "createdAt")
      VALUES (
        NEW.id::text,
        signup."firstName",
        signup."lastName",
        signup.email,
        private.available_username(signup."firstName", signup."lastName"),
        signup.room,
        signup."rulesAcceptedAt",
        NEW.email_confirmed_at AT TIME ZONE 'UTC',
        now_utc
      );
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS violated = CONSTRAINT_NAME;
      attempt := attempt + 1;
      IF violated <> 'User_username_key' OR attempt >= 3 THEN
        RAISE;
      END IF;
    END;
  END LOOP;

  -- Forget sign-ups that were abandoned (e.g. Supabase refused the email).
  DELETE FROM public."PendingSignup" WHERE "createdAt" < now_utc - interval '1 day';
  RETURN NEW;
END
$$;

-- auth.users only exists on Supabase, not in a plain Postgres (such as
-- Prisma's shadow database).
DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    CREATE TRIGGER create_profile_on_signup
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION private.create_profile();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT USAGE ON SCHEMA private TO supabase_auth_admin;
  END IF;
END
$$;
