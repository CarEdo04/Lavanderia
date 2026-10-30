# Lavanderia

A booking app for a shared laundry room in an apartment building or dorm. It works like SuperSaaS or Skedda, but is self-hosted and only does what a shared laundry room needs. The interface is in Italian.

## Features

- **Registration** asks for first name, surname, email, password and room number, and the resident must accept the laundry rules. The registration date and the time the rules were accepted are stored.
- **Accounts live in Supabase Auth**, which stores the passwords and sends the emails:
  - after signing up, residents get a confirmation link and can only book once they've opened it; they can ask for a new one from the "check your email" page
  - *Password dimenticata?* on the login page sends a link to choose a new password
  - login works with either the email address or the username, which is always `surname.name` (lowercase, without accents, spaces or apostrophes; homonyms get a number, e.g. `rossi.mario2`)
  - the resident profile (name, room, role, rules acceptance) is stored in the app's own `User` table, linked by `authId`. A database trigger on `auth.users` creates it in the same transaction as the Supabase account, so there's never an account without a profile or the other way round. The app first validates the form (including the registration code) and saves it as a `PendingSignup` row, then passes that row's one-time token in the sign-up metadata; the trigger builds the profile from the row and refuses any sign-up without a valid token. So accounts can only be created through the app's form (or `npm run setup` for the first admin): **Add user** in the Supabase dashboard fails on purpose.
- **Brute-force protection**: failed logins are limited per IP address (20 in 15 minutes) and per account (10 in 15 minutes), and wrong registration codes per IP address (10 per hour). The failures are counted in the database (`src/lib/throttle.ts`), because Supabase sees every request coming from the server's address and can't tell residents apart.
- **Residents** book a free shift from a week grid (days × shifts, like a paper booking sheet). On phones the week shows as one card per day. By default there are four 4-hour shifts, Monday to Saturday. They can cancel their own bookings from the grid or from *Le mie prenotazioni* until the notice window starts (see below); after that the *Annulla* button explains that only an admin can cancel the shift.
- **Booked shifts show only the booker's first name and surname** to residents. Username, email and room are visible to admins only (and are not even loaded for residents).
- **Booking rules** are enforced on the server:
  - no double bookings (an overlap check, backed by a unique index)
  - a maximum number of active bookings per person
  - a limit on how many days ahead people can book (3 weeks by default)
  - a minimum notice before a shift starts (72 hours by default). The same window applies to cancelling: inside it a resident can neither book nor cancel, so a shift can't be dropped when nobody else could still take it.
  - no bookings in the past
  - only slots that match the current schedule
- **Booking history is kept**: past shifts are never deleted. A shift can't be cancelled once it has started, and the database refuses to delete a machine or user that has bookings. Residents see their whole history in *Le mie prenotazioni*.
- **Admins** (*Gestione* page) can:
  - set the slot length, opening hours, booking limits and an optional registration code (*Genera* creates a random one, e.g. `K7QM-3XPA`; residents can type it in lower case and without the dash)
  - add, rename, reorder, disable or delete machines (a machine with bookings can only be disabled)
  - see and cancel any booking until its shift starts, inside the notice window too, and browse the full booking history month by month (*Storico delle prenotazioni*)
  - book a shift for themselves or for a resident (by username, with suggestions) from the booking grid, inside the notice window too. Shifts inside the window are marked with a lock for admins. The resident's limit of active bookings still applies.
  - publish notices (information or problem) for a date range; they appear above the booking grid in the weeks they cover, until they end or are removed
  - edit the laundry rules shown at registration and on the *Regolamento* page
  - see every user's details, confirm an email by hand, and promote other users to admin
  
  On the booking grid, admins can click a booked slot to see the booker's username, email and room, and cancel the booking from there.
- All slot times use the `Europe/Rome` time zone (`src/lib/time.ts`), wherever the server runs. This includes the daylight-saving switch days.

## Stack

Next.js 15 (App Router, server actions) · TypeScript · Tailwind CSS 4 · Prisma 6 · Supabase (Postgres database + Auth, via `@supabase/ssr`).

## Getting started

### 1. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a project (the free plan is enough). Pick a region in Europe, and keep the database password: it goes into the connection strings.
2. **Connect** (top bar) → **ORMs** → **Prisma** shows `DATABASE_URL` (pooled, port 6543) and `DIRECT_URL` (direct, port 5432).
3. **Project Settings → API Keys** has the publishable key and the secret key. The project URL is `https://<project-ref>.supabase.co`.
4. **Authentication → URL Configuration**: set *Site URL* to `http://localhost:3000` (later, the public address) and add `http://localhost:3000/**` to *Redirect URLs*.
5. **Authentication → Emails → Templates** (recommended): so the links work even when opened on another device, change the link in two templates:
   - *Confirm signup*: `{{ .SiteURL }}/auth/conferma?token_hash={{ .TokenHash }}&type=email`
   - *Reset password*: `{{ .SiteURL }}/auth/conferma?token_hash={{ .TokenHash }}&type=recovery`

   You can also translate the email texts into Italian there.

**Emails:** Supabase's built-in email service only delivers to the members of your Supabase team and sends very few emails per hour. That is enough to try the app, but for residents set up custom SMTP under **Authentication → Emails → SMTP Settings** (any provider, e.g. Brevo, Resend or your own mailbox). While testing, you can also turn off *Confirm email* under **Authentication → Sign In / Providers → Email**.

### 2. Run the app

```bash
npm install
cp .env.example .env        # fill in the Supabase values and ADMIN_PASSWORD
npm run setup               # creates the tables and the first admin
npm run dev                 # http://localhost:3000
```

Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`. `npm run setup` creates the admin in Supabase Auth too, already confirmed.

The tables have row level security turned on with no policies, so Supabase's public Data API can't read them. The app reaches the database only through Prisma.

## Deploy on Vercel

The database and logins already live in Supabase, so Vercel only runs the Next.js app. `vercel.json` runs it in Frankfurt (`fra1`), next to a Supabase project in `eu-central-1`; change the region if your project is elsewhere. `package.json` pins Node.js 24, which the Supabase client needs.

1. On [vercel.com](https://vercel.com), sign up with **Continue with GitHub**, then **Add New → Project** and import this repository. Vercel detects Next.js; keep the default build settings.
2. Before the first deploy, open **Environment Variables** and add:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the **pooled** connection string (port **6543**, ending in `?pgbouncer=true&connection_limit=1`). Vercel opens many short-lived connections, which is what the pooler is for. |
   | `DIRECT_URL` | the direct connection string (port 5432) |
   | `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) | as in `.env` |
   | `SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) | as in `.env` |
   | `SUPABASE_SECRET_KEY` | as in `.env`. Keep it secret: it gives full access to the project. |
   | `APP_URL` | the Vercel address, e.g. `https://lavanderia.vercel.app` (no trailing slash) |

   `ADMIN_EMAIL` and `ADMIN_PASSWORD` are only used by `npm run setup` and aren't needed on Vercel.
3. Deploy. Then, in Supabase, **Authentication → URL Configuration**: set *Site URL* to the Vercel address and add `https://<your-address>/**` to *Redirect URLs* (keep the localhost entries to keep testing locally). If `APP_URL` changes later, update it in Vercel and redeploy.

Every push to `main` now redeploys the site, and pull requests get preview deployments. Database changes are not applied by the deploy: when a commit adds a migration, run `npx prisma migrate deploy` from your computer (it uses `DIRECT_URL`), preferably before pushing.

The `create_profile_on_signup` migration needs extra care, because the code and the database must change together. Before that migration, the app can't sign anyone up with the new code; after it, the old code can't. Run `npx prisma migrate deploy` and push right after each other: sign-ups fail only in the minute or two in between. The migration also adds a `private` schema, which Supabase's Data API doesn't expose, for the trigger's functions.

## Project layout

```
prisma/schema.prisma        data model: User, Machine, Booking, Notice, Settings, PendingSignup, AuthFailure
prisma/migrations/          SQL migrations, including the trigger that creates profiles on sign-up
prisma/seed.ts              default settings, first admin, one laundry ("Lavanderia")
src/lib/booking.ts          booking rules (createBooking, canCancel)
src/lib/throttle.ts         limits on failed logins and registration codes
src/lib/time.ts             time zone and slot helpers
src/lib/supabase.ts         Supabase clients (per-request and admin)
src/lib/session.ts          current user, requireUser / requireAdmin
src/middleware.ts           refreshes the Supabase session cookies
src/app/actions.ts          login, register, password reset, logout, book, cancel
src/app/auth/conferma/      where the links in Supabase's emails land
src/app/prenota/            weekly booking grid
src/app/mie-prenotazioni/   the user's own bookings
src/app/admin/              admin page and its actions
```

## Before putting it online

- Configure custom SMTP in Supabase (see above), otherwise residents won't receive emails.
- Set `APP_URL` and the Supabase *Site URL* to the public address and add it to the redirect URLs (see "Deploy on Vercel").
- Set a registration code in *Gestione* so only residents can sign up (use *Genera*).
- Ideas for later: email reminders, recurring bookings, closed days, and a "machine broken" report button.
