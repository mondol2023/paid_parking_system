# Paid Parking System

A parking reservation platform: find a nearby lot, pick an open slot, book it against one of your
registered vehicles, check out when you leave, and settle the bill.

Django REST Framework serves a JWT-authenticated API; a React + Vite single-page app consumes it.

---

## Stack

**Backend** — Django 5.1, Django REST Framework, SimpleJWT, PostgreSQL, Pillow (vehicle photos),
python-dotenv, django-cors-headers.

**Frontend** — React 19, React Router 7, Vite 8, Tailwind CSS v4, Motion (Framer Motion),
react-hook-form, axios, lucide-react.

---

## Getting started

### 1. Backend

```bash
python -m venv venv
venv\Scripts\activate            # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env             # then fill in SECRET_KEY, DB_PASSWORD, DJANGO_SUPERUSER_PASSWORD
python manage.py migrate
python manage.py ensure_admin    # creates a superuser from .env, only if none exists
python manage.py runserver
```

The API listens on `http://127.0.0.1:8000/`. `GET /` is an unauthenticated health check.

PostgreSQL must be running and the database named in `DB_NAME` must already exist:

```sql
CREATE DATABASE paid_parking_system;
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite serves on `http://localhost:5173/` and proxies `/api` and `/media` to `127.0.0.1:8000`, so the
browser stays on one origin and uploaded vehicle images resolve without CORS. If you run Django on a
different port, change the proxy targets in [vite.config.js](frontend/vite.config.js) — not the
`baseURL` in [axios.js](frontend/src/api/axios.js).

### 3. Seed data before testing money

Through `/admin/`, create a **ParkingLot**, some **Slots** on it, and — critically — a
**ParkingRate** whose `vehicle_type` matches the vehicle you book with. Booking and checkout look up
the rate by lot + vehicle type; **with no matching rate every amount computes as `0.00`.**

---

## Environment variables

All read by [settings.py](paid_parking_system_backend/settings.py) at startup via python-dotenv. See
[.env.example](.env.example) for the annotated template.

| Variable | Notes |
|---|---|
| `SECRET_KEY` | Required. Generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DEBUG` | `True` enables debug mode; anything else (including unset) means production |
| `ALLOWED_HOSTS` | Comma-separated. Required when `DEBUG=False` |
| `DB_NAME` `DB_USER` `DB_PASSWORD` `DB_HOST` `DB_PORT` | PostgreSQL connection |
| `DJANGO_SUPERUSER_USERNAME` / `_EMAIL` / `_PASSWORD` | Consumed by `manage.py ensure_admin` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins allowed to call the API |
| `JWT_ACCESS_MINUTES` `JWT_REFRESH_DAYS` | Token lifetimes |

`.env` is never committed.

---

## API

All routes are prefixed `/api/`. Everything except register, login, and token refresh requires
`Authorization: Bearer <access>`. Querysets are scoped to the requesting user — you can only see and
act on your own vehicles, bookings, and payments.

| Method | Endpoint | Body / query | Returns |
|---|---|---|---|
| `POST` | `/auth/register/` | `username, email, password, password2` | created user; errors come back per-field |
| `POST` | `/auth/login/` | `username, password` | `{access, refresh}` (throttled) |
| `POST` | `/auth/token/refresh/` | `refresh` | `{access}` |
| `GET` `PUT` | `/auth/profile/` | email / first / last (`username` is read-only) | user object |
| `GET` `POST` | `/vehicles/` | `?type=` filter | `{count, results}` |
| `GET` `PUT` `DELETE` | `/vehicles/<id>/` | | vehicle |
| `GET` | `/vehicles/search/` | `?license=` | `{count, results}` |
| `GET` | `/parking-lots/` | | `{count, results}` |
| `GET` | `/parking-lots/nearest/` | `?lat&lng` | `{count, search, results}` with `distance_km` |
| `GET` | `/parking-lots/<id>/slots/` | `?available=true` | `{lot, slots}` — note: **not** `{results}` |
| `GET` | `/bookings/` | | `{count, results}` — **active bookings only** |
| `POST` | `/bookings/create/` | `vehicle, slot, reserve_time` | booking with nested vehicle/slot |
| `POST` | `/bookings/<id>/checkout/` | | `{booking_id, actual_hours, final_amount, payment_id, paid}` |
| `GET` | `/payments/history/` | | `{count, results}` — includes unpaid |
| `POST` | `/payments/<booking_id>/pay/` | `payment_method`, `transaction_id` (mobile banking) | payment |

Two behaviours worth knowing before you build against this:

1. **`GET /bookings/` returns only `is_active=True`.** After checkout a booking disappears from that
   list while its Payment may still be unpaid — which is why the outstanding balance lives on the
   Payments page, driven by `/payments/history/`, rather than on Bookings.
2. **Booking and checkout take a row lock** (`select_for_update`) on the slot. A second user racing
   for the same slot gets a `409` with `Slot is already booked`, not a double booking.

---

## Data model

- **VehicleRegistration** — owned by a user; unique `vehicle_license`, a type (`car`, `bike`, …),
  an optional photo, and required numeric `vehicle_length` / `width` / `height` plus `driver_license`.
- **ParkingLot** — name, address, `latitude` / `longitude`, `total_slots`. Nearest-lot search is
  Haversine over these coordinates.
- **Slot** — belongs to a lot; `slot_number`, `size`, `is_available`.
- **ParkingRate** — `rate_per_hour` per (lot, vehicle_type). The pricing lookup.
- **Booking** — vehicle + slot, `check_in` / `check_out`, reserved hours, status.
- **Payment** — one per booking; amount, method, `paid`, `paid_at`, `transaction_id`.

---

## Frontend architecture

```
src/
  lib/          motion presets · cn · format (money/date/hours) · errors · constants
  api/          axios (auth interceptors) · services (one module per resource)
  hooks/        useResource · useAsync · useDebouncedValue · useGeolocation · useNow · useServerErrors
  components/
    ui/         Button Input Field Card Badge Modal Alert Feedback CountUp
    layout/     AppShell PageHeader AnimatedRoutes navItems
    common/     AsyncBoundary ProtectedRoute ConfirmDialog
  features/     auth · vehicles · lots · bookings · payments   (each: components + its own hook)
  pages/        Login Register Dashboard Vehicles Lots Bookings Payments Profile NotFound
  context/      AuthContext · ThemeContext · ToastContext
```

The layering is the point: `api/` transports, `hooks/` hold state, `components/ui/` only render, and
`features/` compose the three. No component calls axios directly.

- **`useResource(fetcher)`** returns `{data, loading, error, refetch}` and guards against a slow
  first request resolving after a fast second one. **`<AsyncBoundary>`** renders the matching
  loading / error / empty state, so no page hand-rolls that block.
- **`Button`, `Badge`, and the field components resolve styles from a `variants` lookup** — a new
  variant is a new key, never an edit to the JSX. Every field takes the same
  `{name, label, error, ...register}` contract, which is what lets `VehicleForm` render itself from a
  config array.
- **`AuthContext` receives an `authService`** rather than importing axios, so it can be driven by a
  fake in tests.
- **[axios.js](frontend/src/api/axios.js)** attaches the bearer token, refreshes a `401` exactly once
  (single-flight — concurrent 401s share one refresh), retries the original request, and broadcasts
  an `auth:expired` event when the refresh itself fails.

### Design system

Tokens live in [index.css](frontend/src/index.css) under Tailwind v4's `@theme`. The palette is drawn
from parking wayfinding: concrete neutrals with a faint green bias, signage yellow (`--accent`) spent
only on the primary action and the occupancy meter, and separate semantic colors for slot state
(`--open` / `--taken` / `--alert`). Type is Barlow Semi Condensed for display, Public Sans for body,
IBM Plex Mono with tabular numerals for plates, money, and timers — all self-hosted via
`@fontsource`, no CDN. Both themes are defined; the theme is stamped on `<html>` before first paint
by an inline script in `index.html`, so there is no flash.

### Motion

`<MotionConfig reducedMotion="user">` wraps the app and every duration and easing comes from
[lib/motion.js](frontend/src/lib/motion.js) — no animation hardcodes numbers. Motion is used to show
state change, not for ambience: routes cross-fade, card grids stagger, and the selected parking slot
carries a shared `layoutId` into the booking panel so the tile visibly becomes the confirmation card.
With "reduce motion" enabled, everything degrades to instant.

---

## Commands

| | |
|---|---|
| `python manage.py migrate` | apply migrations |
| `python manage.py ensure_admin` | create the superuser from `.env` if none exists |
| `python manage.py test` | run the backend test suite |
| `npm run dev` | Vite dev server with the API proxy |
| `npm run build` | production build |
| `npm run lint` | ESLint (React Compiler rules are errors, not warnings) |

---

## Troubleshooting

**`404` on `/api/auth/register/` with an unfamiliar framework's error page** — something other than
Django owns port 8000. Django sets `allow_reuse_address`, so on Windows a second process can bind an
already-bound port without an error and the last binder wins. Check with
`Get-NetTCPConnection -LocalPort 8000 -State Listen` and cross-reference the PID against
`Get-CimInstance Win32_Process`. Stop the other server, or move Django to another port and update the
proxy targets in [vite.config.js](frontend/vite.config.js).

**Every amount is `0.00`** — no `ParkingRate` matches the lot and vehicle type. Add one in `/admin/`.

**Vehicle images 404** — reach the app through the Vite dev server (`:5173`), not by opening the
build output directly; `/media` only resolves through the proxy. In production, `MEDIA_URL` is served
by Django only while `DEBUG=True`.

**Booking rejected with 409** — either the slot was taken by a concurrent booker, or the vehicle you
deactivated still has an active booking. The message says which.
