# Lavanderia

A booking app for shared laundry machines (washers and dryers) in an apartment building or dorm. It works like SuperSaaS or Skedda, but is self-hosted and only does what a shared laundry room needs. The interface is in Italian.

## Features

- **Residents** sign up and log in, pick a day, and book a free slot on any machine from a grid of time slots × machines. They can cancel their own upcoming bookings from the grid or from *Le mie prenotazioni*.
- **Booking rules** are enforced on the server:
  - no double bookings (an overlap check, backed by a unique index)
  - a maximum number of active bookings per person
  - a limit on how many days ahead people can book
  - no bookings in the past
  - only slots that match the current schedule
- **Admins** (*Gestione* page) can:
  - set the slot length, opening hours, booking limits and an optional registration code
  - add, rename, reorder, disable or delete machines
  - see and cancel upcoming bookings
  - promote other users to admin
  
  On the booking grid, admins also see who booked each slot. Residents only see "Occupato".
- All slot times use the `Europe/Rome` time zone (`src/lib/time.ts`), wherever the server runs. This includes the daylight-saving switch days.

## Stack

Next.js 15 (App Router, server actions) · TypeScript · Tailwind CSS 4 · Prisma 6 + SQLite · signed-cookie sessions (`jose`) · `bcryptjs` password hashing.

## Getting started

```bash
npm install
cp .env.example .env        # then set SESSION_SECRET and ADMIN_PASSWORD
npm run setup               # creates the database and the first admin
npm run dev                 # http://localhost:3000
```

Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`. In this checkout, a random admin password has already been generated in `.env`.

## Project layout

```
prisma/schema.prisma        data model: User, Machine, Booking, Settings
prisma/seed.ts              default settings, first admin, three sample machines
src/lib/booking.ts          booking rules (createBooking)
src/lib/time.ts             time zone and slot helpers
src/lib/session.ts          login sessions, requireUser / requireAdmin
src/app/actions.ts          login, register, logout, book, cancel
src/app/prenota/            booking grid
src/app/mie-prenotazioni/   the user's own bookings
src/app/admin/              admin page and its actions
```

## Before putting it online

- Use PostgreSQL instead of SQLite on a hosted server: change the `provider` in `schema.prisma` and set `DATABASE_URL`. SQLite is fine for a single small server.
- Use a long random `SESSION_SECRET` and serve the app over HTTPS.
- Set a registration code in *Gestione* so only residents can sign up.
- Ideas for later: email reminders, password reset, recurring bookings, closed days, and a "machine broken" report button.
