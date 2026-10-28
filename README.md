# Lavanderia

A booking app for a shared laundry room in an apartment building or dorm. It works like SuperSaaS or Skedda, but is self-hosted and only does what a shared laundry room needs. The interface is in Italian.

## Features

- **Registration** asks for first name, surname, email, an optional username, password and room number, and the resident must accept the laundry rules. The registration date and the time the rules were accepted are stored.
- **Accounts live in Supabase Auth**, which stores the passwords and sends the emails:
  - after signing up, residents get a confirmation link and can only book once they've opened it; they can ask for a new one from the "check your email" page
  - *Password dimenticata?* on the login page sends a link to choose a new password
  - login works with either the email address or the username
  - the resident profile (name, room, role, rules acceptance) is stored in the app's own `User` table, linked by `authId`
- **Residents** book a free shift from a week grid (days × shifts, like a paper booking sheet). On phones the week shows as one card per day. By default there are four 4-hour shifts, Monday to Saturday. They can cancel their own upcoming bookings from the grid or from *Le mie prenotazioni*.
- **Booking rules** are enforced on the server:
  - no double bookings (an overlap check, backed by a unique index)
  - a maximum number of active bookings per person
  - a limit on how many days ahead people can book (3 weeks by default)
  - a minimum notice before a shift starts (72 hours by default)
  - no bookings in the past
  - only slots that match the current schedule
- **Admins** (*Gestione* page) can:
  - set the slot length, opening hours, booking limits and an optional registration code
  - add, rename, reorder, disable or delete machines
  - see and cancel upcoming bookings
  - publish notices (information or problem) for a date range; they appear above the booking grid in the weeks they cover, until they end or are removed
  - edit the laundry rules shown at registration and on the *Regolamento* page
  - see every user's details, confirm an email by hand, and promote other users to admin
  
  On the booking grid, admins also see who booked each slot. Residents only see "Occupato".
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

## Project layout

```
prisma/schema.prisma        data model: User, Machine, Booking, Notice, Settings
prisma/seed.ts              default settings, first admin, one laundry ("Lavanderia")
src/lib/booking.ts          booking rules (createBooking)
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
- Set `APP_URL` and the Supabase *Site URL* to the public address, add it to the redirect URLs, and serve the app over HTTPS.
- Set a registration code in *Gestione* so only residents can sign up.
- Ideas for later: email reminders, recurring bookings, closed days, and a "machine broken" report button.
