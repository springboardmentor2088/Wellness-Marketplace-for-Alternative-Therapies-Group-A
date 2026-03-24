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
- `UserProfile.jsx` — Patients and practitioners can update their profile information.
- `authService.js` — all HTTP calls + `storeAuthData()` dispatches `window.dispatchEvent(new Event('authChange'))` to trigger same-tab notification init
- `userService.js` — `updateUser()` handles profile updates.

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
| `PUT /api/sessions/{id}/complete` | PUT | PRACTITIONER | **Mandatory** document upload to complete session |
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
| `POST /api/sessions/book` | POST | Create booking (status: HOLD, payment: PENDING) |
| `PUT /api/sessions/{id}/cancel` | PUT | Cancel with reason + refund trigger |
| `PUT /api/sessions/{id}/reschedule` | PUT | Reschedule to new date/time |
| `GET /api/sessions/user/{userId}` | GET | All sessions for a patient |
| `GET /api/sessions/practitioner/{id}` | GET | All sessions for a practitioner (Only PAID) |
| `GET /api/sessions/{id}/slots?date=` | GET | Free slots on a given date |
| `POST /api/payments/initiate` | POST | Initialize Razorpay Order |
| `POST /api/payments/webhook` | POST | Verify Signature & Confirm Booking |

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
**Real-time Sync:** Dashboard counts (bookings, earnings) are auto-refreshed via WebSocket triggers (PAYMENT_RECEIVED, SESSION_BOOKED).

---

## Feature 13: Razorpay Payment Integration

### What it does
Replaced mock payments with a real-time Razorpay flow. Supports order creation, live signature verification (HMAC SHA256), and automated booking confirmation upon payment success.

### How it works
- **Backend:** `RazorpayPaymentGateway` implements `PaymentGateway`. Uses Razorpay Java SDK for `client.orders.create()` and `Utils.verifyPaymentSignature()`.
- **Frontend:** Includes `checkout.js`. `SessionCard.jsx` opens the Razorpay modal.
- **Security:** Strict server-side verification of `razorpay_signature` before flipping status to `BOOKED`.

---

## Feature 14: Practitioner Earnings System

### What it does
Tracks session-wise earnings for practitioners. Different logic for "Pending" (completed but not paid out) and "Ready for Payout" (payout eligible).

### How it works
- **Logic:** `DoctorEarningController` calculates totals based on `DoctorEarning` table.
- **Trigger:** Completing a session (with mandatory doc) creates an earning record.
- **Frontend:** Earnings tab on Practitioner Dashboard updates in real-time.

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
- **Native Implementation:** Removed `sockjs-client` in favor of standard browser `WebSocket` for better stability.
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
 
 ---
 
 ## Feature 15: Community Forum
 
 ### What it does
 A robust Q&A and discussion system where patients can ask wellness-related questions, and practitioners/admins can provide expert answers. Supports likes, accepted solutions, comments, and a reporting system for moderation.
 
 ### How it works
 
 **Backend:**
 - `ForumController` → `/api/forum/**`
 - `ForumService` handles threads, answers, likes, comments, and reports.
 - `Thread`, `Answer`, `Comment`, `AnswerLike`, `AnswerReport` models.
 
 | Endpoint | Method | Description |
 |---|---|---|
 | `POST /api/forum/threads` | POST | Create a new discussion thread |
 | `GET /api/forum/threads` | GET | List all threads (paginated, optional category filter) |
 | `GET /api/forum/threads/{id}` | GET | Get thread details with all answers and comments |
 | `POST /api/forum/threads/{id}/answers` | POST | Practitioners/Admins add an answer |
 | `POST /api/forum/answers/{id}/like` | POST | Like an answer |
 | `PUT /api/forum/answers/{id}/accept` | PUT | Mark an answer as the accepted solution |
 | `POST /api/forum/answers/{id}/comments` | POST | Add a comment to an answer |
 | `POST /api/forum/answers/{id}/report` | POST | Report an answer for moderation |
 | `GET /api/forum/reports` | GET | (Admin) View all reported answers |
 
 **Frontend:**
 - `CommunityForum.jsx` — Browse threads, search, filter by category.
 - `ForumThreadDetail.jsx` — View thread, post answers/comments, like/accept solutions.
 - `forumService.js` — All API calls for the forum.
 
 ---
 
 ## Feature 16: Product & Session Reviews
 
 ### What it does
 Users can leave reviews and ratings for both products they've purchased and practitioners they've had sessions with.
 
 ### How it works
 
 **Backend:**
 - `ProductReviewController` → `/api/product-reviews/**`
 - `ReviewController` → `/api/reviews/**` (for Practitioner sessions)
 
 | Endpoint | Method | Description |
 |---|---|---|
 | `POST /api/product-reviews` | POST | Submit product review (1-5 star + comment) |
 | `GET /api/product-reviews/{productId}` | GET | Get all reviews + average rating for a product |
 | `POST /api/reviews` | POST | Submit practitioner review linked to a specific `sessionId` |
 | `GET /api/reviews/practitioner/{id}` | GET | Get all reviews for a practitioner |

**Session Reviews Logic:**
- Each review is linked to a unique `TherapySession`.
- Multiple reviews for the same practitioner are allowed as long as they belong to different completed sessions.
- The "Leave Review" button is automatically hidden once a session has been reviewed.
 
 **Frontend:**
 - Included in `UserDashboard.jsx`, `MyBookings.jsx`, and `SessionCard.jsx`.
 - `ReviewForm.jsx` handles state and submission logic, passing the `sessionId` to the backend.
 - `reviewService.js` manages API calls for both products and practitioners.
 
 ---
 
 ## Feature 17: Server-side Cart Management
 
 ### What it does
 Replaced local-only cart with a server-side persistent cart, allowing users to keep their items across different devices and sessions.
 
 ### How it works
 
 **Backend:**
 - `CartController` → `/api/cart/**`
 - `CartService` manages `CartItem` entities linked to the user.
 
 | Endpoint | Method | Description |
 |---|---|---|
 | `GET /api/cart` | GET | Fetch all items in the user's cart |
 | `POST /api/cart/add` | POST | Add a product to the cart |
 | `PUT /api/cart/{productId}/update` | PUT | Update quantity of a cart item |
 | `DELETE /api/cart/{productId}/remove` | DELETE | Remove item from cart |
 | `DELETE /api/cart/clear` | DELETE | Empty the entire cart |
 
 **Frontend:**
 - `orderService.js` now uses these API endpoints instead of just `localStorage`.
 - `Cart.jsx` UI remains consistent but syncs with the database.
 
 ---
 
 ## Feature 18: Enhanced Wallet & Transactions
 
 ### What it does
 A complete digital wallet system for users and practitioners. Supports deposits, withdrawals, and a detailed transaction ledger.
 
 ### How it works
 
 **Backend:**
 - `WalletController` → `/api/wallet/**`
 - `WalletService` handles balance updates and transaction logging.
 - `UserWallet` and `WalletTransaction` models.
 
 | Endpoint | Method | Description |
 |---|---|---|
 | `GET /api/wallet/balance` | GET | Get current wallet balance |
 | `GET /api/wallet/transactions` | GET | Get paginated transaction history |
 | `POST /api/wallet/deposit` | POST | Add funds to wallet |
 | `POST /api/wallet/withdraw` | POST | Request withdrawal of funds |
 
 **Frontend:**
 - `WalletPage.jsx` — View balance, deposit/withdraw, see transaction history.
 - `walletService.js` — All API integrations for wallet.
