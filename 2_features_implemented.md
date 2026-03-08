# 🚀 Wellness Platform — Implemented Features

---

## Feature 1: Authentication & User Management

### What it does
Full JWT-based auth with register, OTP email verification, login, session refresh, and secure password reset.

### How it works

**Backend:**
- `AuthController` → `/api/auth/**`
- `AuthService` handles BCrypt password hashing, JWT generation (access + refresh tokens), OTP generation and verification
- `JwtAuthenticationFilter` intercepts every request and validates the Bearer token
- `PasswordResetToken` model stores one-time tokens for forgotten passwords
- `EmailVerificationOtp` model stores 6-digit OTP hash (BCrypt), expiry, attempt count, resend cooldown

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/register` | POST | Creates new user → sends OTP email; does NOT return tokens yet |
| `/api/auth/verify-email` | POST | Validates OTP → marks email verified → returns JWT tokens (auto-login) |
| `/api/auth/resend-otp` | POST | Sends new OTP (60 s cooldown, generic message for security) |
| `/api/auth/login` | POST | Returns `accessToken` + `refreshToken` + `user` (blocked if email unverified) |
| `/api/auth/refresh` | POST | Issues new access token using refresh token |
| `/api/auth/forgot-password` | POST | Sends reset link to email (generic message for security) |
| `/api/auth/reset-password` | POST | Validates token + sets new BCrypt-hashed password |

**OTP Rules:**
- Expires in **5 minutes**
- Maximum **5 wrong attempts** before lockout
- Resend cooldown: **60 seconds**
- Admin users are **exempt** from email verification

**Frontend:**
- `Register.jsx` → submits form → redirects to `VerifyEmail.jsx`
- `VerifyEmail.jsx` → OTP input + resend → on success, stores auth data and navigates directly to role-based dashboard
- `Login.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`
- `authService.js` — all HTTP calls + `storeAuthData()` dispatches `window.dispatchEvent(new Event('authChange'))` to trigger same-tab notification init

---

## Feature 2: Practitioner Profiles

### What it does
Practitioners create and manage their professional profiles. Admins verify them. Patients browse verified practitioners.

### How it works

**Backend:**
- `PractitionerController` → `/api/practitioners/**`
- `PractitionerService` handles CRUD, verification flag toggling, document upload to disk (`/uploads/`)
- `PractitionerProfile` model stores specialization, rating, qualifications, experience, verified status

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `GET /api/practitioners` | GET | Public | All practitioners |
| `GET /api/practitioners/verified` | GET | Public | Only verified practitioners |
| `GET /api/practitioners/{id}` | GET | Public | Get one practitioner |
| `POST /api/practitioners` | POST | Authenticated | Create profile |
| `PUT /api/practitioners/{id}` | PUT | PRACTITIONER | Update profile |
| `PUT /api/practitioners/{id}/verify` | PUT | ADMIN | Toggle verified flag |
| `GET /api/practitioners/search?specialization=` | GET | Public | Filter by specialization |
| `POST /api/practitioners/{id}/documents/upload` | POST | PRACTITIONER | Upload credentials (PDF/images) |
| `GET /api/practitioners/{id}/documents` | GET | ADMIN | View uploaded docs |
| `GET /api/practitioners/me/documents` | GET | PRACTITIONER | View own docs |
| `GET /api/practitioners/documents/{id}/download` | GET | PRACTITIONER/ADMIN | Stream file |

**Frontend:**
- `PractitionerOnboarding.jsx` — multi-step form: create profile + upload documents
- `BrowseSessions.jsx` — lists verified practitioners with filters
- `PractitionerDashboard.jsx` — practitioner's own profile management

---

## Feature 3: Practitioner Availability

### What it does
Practitioners define their weekly schedule (day, start time, end time, slot duration). The system uses this to compute available booking slots.

### How it works

**Backend:**
- `AvailabilityController` → `/api/availability/**`
- `AvailabilityService` saves day-of-week slots per practitioner
- `PractitionerAvailability` model stores: day (MONDAY–SUNDAY), start/end time, slot duration (default 60 min)

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/availability/{practitionerId}` | GET | Returns all weekly slots |
| `POST /api/availability/{practitionerId}` | POST | Set/update a day's schedule |

**Frontend:**
- `AvailabilityDayCard.jsx` — renders one day's schedule
- `SessionCalendar.jsx` — calendar view of availability
- `PractitionerDashboard.jsx` — practitioner sets their availability

---

## Feature 4: Therapy Session Booking

### What it does
Patients book time slots with practitioners. Sessions can be cancelled or rescheduled. Double-booking is prevented for both patient and practitioner.

### How it works

**Backend:**
- `TherapySessionController` → `/api/sessions/**`
- `TherapySessionService` calculates available slots, creates session, fires notifications using **practitioner's user ID** (not profile ID) to ensure correct `receiverId` in notifications
- `TherapySession` model: status (`BOOKED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `RESCHEDULED`), type (`ONLINE`/`OFFLINE`), payment status, notes, cancellation reason, `reminderSent`, `oneHourReminderSent` flags

| Endpoint | Method | Description |
|---|---|---|
| `POST /api/sessions/book` | POST | Create booking (practitionerId, date, startTime, type, notes) |
| `PUT /api/sessions/{id}/cancel` | PUT | Cancel with reason + who cancelled |
| `PUT /api/sessions/{id}/reschedule` | PUT | Reschedule to new date/time |
| `GET /api/sessions/user/{userId}` | GET | All sessions for a patient |
| `GET /api/sessions/practitioner/{id}` | GET | All sessions for a practitioner |
| `GET /api/sessions/{id}/slots?date=` | GET | Free slots on a given date |

**Overlap / Double-booking Prevention:**
- Practitioner overlap check: no two BOOKED sessions can overlap in time
- User overlap check: same patient cannot have two sessions at the same time

**Frontend:**
- `BookingForm.jsx` — takes practitioner + date + slot
- `BrowseSessions.jsx` — browse practitioners, open booking modal
- `MyBookings.jsx` — view, cancel, reschedule existing bookings
- `sessionService.js` — all API calls for sessions

---

## Feature 5: Practitioner Request System

### What it does
Patients send consultation requests to practitioners before booking. Practitioners can accept, reject, complete, or cancel these requests.

### How it works

**Backend:**
- `PractitionerRequestController` → `/api/practitioners/requests/**`
- `PractitionerRequestService` manages status transitions and sends notifications on changes
- `PractitionerRequest` model: status (`pending`, `accepted`, `rejected`, `completed`, `cancelled`), priority, description

| Endpoint | Method | Who |
|---|---|---|
| `POST /create/{practitionerId}` | POST | PATIENT to create |
| `GET /practitioner/{id}` | GET | Get all requests for practitioner |
| `GET /practitioner/{id}/pending` | GET | Only pending requests |
| `PUT /{id}/accept` | PUT | PRACTITIONER accepts |
| `PUT /{id}/reject?reason=` | PUT | PRACTITIONER rejects |
| `PUT /{id}/complete` | PUT | PRACTITIONER marks done |
| `PUT /{id}/cancel` | PUT | Any party cancels |
| `GET /practitioner/{id}/pending-count` | GET | Count of pending |

**Frontend:**
- `PractitionerDashboard.jsx` — shows incoming requests with accept/reject buttons
- `UserDashboard.jsx` — shows sent requests and their status
- `requestService.js` — wraps all request API calls

---

## Feature 6: Product Marketplace

### What it does
An online store where patients can browse wellness products, filter by category, search, add to cart, and place orders.

### How it works

**Backend:**
- `ProductController` → `/api/products/**`
- `OrderController` → `/api/orders/**`
- `ProductService` → CRUD for products, stock validation
- `OrderService` → creates orders from cart items, tracks status, handles cancellation and payment

| Endpoint | Description |
|---|---|
| `GET /api/products` | All products |
| `GET /api/products/available` | In-stock only |
| `GET /api/products/search?query=` | Keyword search |
| `GET /api/products/category/{cat}` | By category |
| `POST /api/products` | ADMIN create product |
| `POST /api/orders` | Create order from cart items |
| `GET /api/orders/history` | User's order history |
| `PUT /api/orders/{id}/pay` | Mark as paid |
| `PUT /api/orders/{id}/cancel` | Cancel order |
| `PUT /api/orders/{id}/status` | ADMIN update status |

**Cart is 100% localStorage** — `orderService.js` has full cart CRUD functions stored in `localStorage['cart']`.

**Frontend:**
- `ProductMarketplace.jsx` — browse products with filters
- `Cart.jsx` — review cart items, checkout
- `OrderHistory.jsx` — view past orders

---

## Feature 7: Real-time In-App Notifications

### What it does
Users and practitioners receive in-app notifications for session events: booking confirmed, cancelled, rescheduled, reminders. Unread count badge updates in real-time via WebSocket. Notifications persist in DB and are loaded on login.

### How it works

**Backend:**
- `NotificationController` → `/api/notifications/**`
- `SessionNotificationService` creates `Notification` DB records and pushes WebSocket messages
- `Notification` model: `receiverId` (**= user ID**, not profile ID), `receiverRole` (USER/PRACTITIONER), `sessionId`, `type`, `message`, `isRead`, `emailSent`
- `NotificationCleanupService` — `@Scheduled` task cleans old read notifications

| Endpoint | Description |
|---|---|
| `GET /api/notifications?page=&size=` | Paginated notifications for logged-in user |
| `GET /api/notifications/unread-count` | Count of unread notifications |
| `PUT /api/notifications/{id}/read` | Mark one as read (ownership verified) |

**WebSocket Topics:**
| Topic | Who receives |
|---|---|
| `/topic/user/{userId}` | Patient — all session/order events |
| `/topic/practitioner/{userId}` | Practitioner — session booked/cancelled/reminders |
| `/topic/sessions/{userId}` | Session updates |
| `/topic/orders/{userId}` | Order status changes |

**Frontend:**
- `NotificationContext.jsx` — global React context; connects WebSocket on login, fetches DB notifications, deduplicates by message ID (prevents double unread count from duplicate subscriptions)
- `NotificationDropdown.jsx` — bell 🔔 icon in navbar with unread badge, paginated list, click-to-mark-as-read, infinite scroll
- `notificationService.js` — fetches and marks notifications via axios (JWT attached via interceptor)
- `websocketService.js` — STOMP client with `isConnecting` guard to prevent concurrent connection race conditions

**Key fix applied:** `receiverId` in DB is stored as `user.id` (not `practitioner_profile.id`) so the `NotificationController` can query correctly using `currentUser.getId()`.

---

## Feature 8: WebSocket Real-time Updates

### What it does
Provides real-time push updates to patients and practitioners for session changes, without requiring page reload.

### How it works

**Backend:**
- `WebSocketController` handles STOMP `/app/` message mappings
- `SimpMessagingTemplate` pushes to topic queues

| STOMP Topic | Who/When |
|---|---|
| `/topic/user/{userId}` | Patient — on booking, cancellation, reschedule, order events |
| `/topic/practitioner/{userId}` | Practitioner — on booking by patient, cancellation, reminders |
| `/topic/sessions/{userId}` | Session updates |
| `/topic/orders/{userId}` | Order updates |

**Frontend (`websocketService.js`):**
- `isConnecting` flag prevents concurrent connection attempts (race condition fix)
- Single STOMP client shared across subscriptions
- `disconnectWebSocket()` unsubscribes all topics and resets flags
- Practitioners auto-subscribe to `/topic/practitioner/{userId}` in `NotificationContext` after login

---

## Feature 9: Email Notifications

### What it does
Sends transactional emails to users and practitioners for OTP verification, booking confirmation, cancellation, rescheduling, and reminders.

### How it works

**Backend:**
- `EmailService` — Spring `JavaMailSender` connected to Gmail SMTP
- Called by `AuthService`, `TherapySessionService`, `SessionNotificationService`, `SessionReminderScheduler`

Email types implemented:
- **OTP verification** (sent on register and resend-OTP)
- Booking confirmation (to both user and practitioner)
- Session cancellation
- Session rescheduled
- **30-minute reminder** (with email + in-app notification)
- **1-hour reminder** (in-app notification only)

---

## Feature 10: Session Reminder Scheduler

### What it does
Automatically monitors upcoming sessions and sends push + email reminders at 30 minutes and 1 hour before the session starts.

### How it works

**Backend:**
- `SessionReminderScheduler` — two `@Scheduled(fixedRate = 60000)` jobs run every 60 seconds
- Queries DB for sessions with `status=BOOKED` and `reminderSent=false` and `sessionDate=CURRENT_DATE` within the next 30-minute window
- Notifications are sent to **practitioner's user ID** (fixed from profile ID mismatch)
- Sets `reminderSent=true` (30-min) or `oneHourReminderSent=true` (1-hour) to prevent duplicates

Config via `application.properties`:
```
app.session.reminder.enabled=true
app.session.reminder.interval-minutes=30
app.session.reminder.one-hour-enabled=true
```

---

## Feature 11: Role-Based Access Control

### What it does
Three roles (PATIENT, PRACTITIONER, ADMIN) with different access rights enforced at both HTTP and method level.

### How it works

**Backend:**
- `SecurityConfig` — `@EnableMethodSecurity` + `authorizeHttpRequests()` rules
- Public: auth endpoints, GET practitioners/verified, GET availability, WebSocket (`/ws/**`)
- Authenticated: sessions, notifications
- PRACTITIONER only: profile creation, document upload, availability setup
- ADMIN only: verify practitioner, update order status, manage all requests

**Frontend:**
- `RoleBasedRoute.jsx` — `AdminRoute` and `PractitionerRoute` wrappers
- Reads `userRole` from localStorage, redirects to `/unauthorized` if wrong role

---

## Feature 12: Admin Dashboard

### What it does
Centralized panel for the admin to manage all platform entities.

### How it works

**Frontend:**
- `AdminDashboard.jsx` — multi-tab dashboard
- Tabs: Users list, Practitioners (verify/reject), Orders management, Practitioner requests overview
- All calls protected by `AdminRoute` wrapper
