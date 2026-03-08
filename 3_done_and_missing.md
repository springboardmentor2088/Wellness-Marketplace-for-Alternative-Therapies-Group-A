# ✅ Wellness Platform — Done vs Missing

---

## ✅ BACKEND — Fully Implemented

### Controllers (12)
| Controller | Route Prefix | Status |
|---|---|---|
| `AuthController` | `/api/auth` | ✅ Complete (register, OTP verify, resend OTP, login, refresh, forgot/reset password) |
| `PractitionerController` | `/api/practitioners` | ✅ Complete |
| `PractitionerRequestController` | `/api/practitioners/requests` | ✅ Complete |
| `AvailabilityController` | `/api/availability` | ✅ Complete |
| `TherapySessionController` | `/api/sessions` | ✅ Complete |
| `NotificationController` | `/api/notifications` | ✅ Complete |
| `ProductController` | `/api/products` | ✅ Complete |
| `OrderController` | `/api/orders` | ✅ Complete |
| `WebSocketController` | `@MessageMapping` | ✅ Complete |
| `UserController` | `/api/users` | ✅ Complete (basic profile ops) |
| `HealthController` | `/api/health` | ✅ Complete (ping endpoint) |
| `GlobalExceptionHandler` | `@ControllerAdvice` | ✅ Complete |

### Services (13)
| Service | Status |
|---|---|
| `AuthService` | ✅ Register, OTP email verification, login, JWT, password reset |
| `PractitionerService` | ✅ Profile CRUD, documents, search, verify |
| `PractitionerRequestService` | ✅ Full lifecycle management |
| `AvailabilityService` | ✅ Weekly schedule CRUD |
| `TherapySessionService` | ✅ Book, cancel, reschedule, slot calc (passes `user.id` for practitioner notifications) |
| `SessionNotificationService` | ✅ Notification + WebSocket push (USER + PRACTITIONER topics using correct user IDs) |
| `SessionReminderScheduler` | ✅ 30-min + 1-hour auto-reminders (fixed: uses `practitioner.getUser().getId()`) |
| `NotificationCleanupService` | ✅ Scheduled cleanup of old notifications |
| `OrderService` | ✅ Order lifecycle, pay, cancel |
| `ProductService` | ✅ CRUD + search + category filter |
| `EmailService` | ✅ OTP emails + all transactional session emails |
| `UserService` | ✅ Get current user, profile basics |

### Models (13)
| Model | Notes |
|---|---|
| `User` | PATIENT / PRACTITIONER / ADMIN roles + `emailVerified` flag |
| `EmailVerificationOtp` | 6-digit OTP hash, expiry, attempts, resend cooldown |
| `PasswordResetToken` | One-time password reset token (30-min expiry) |
| `PractitionerProfile` | specialization, rating, verified |
| `PractitionerAvailability` | weekly schedule |
| `PractitionerRequest` | patient-to-practitioner request |
| `TherapySession` | full session lifecycle + `reminderSent` + `oneHourReminderSent` flags |
| `Notification` | in-app notification (`receiverId` = user ID, not profile ID) |
| `Product` | marketplace product |
| `Order` | order header |
| `OrderItem` | line item within order |
| `PractitionerDocument` | uploaded credential documents |
| `Role` (enum) | PATIENT, PRACTITIONER, ADMIN |

### Security Config
- ✅ JWT stateless authentication
- ✅ BCrypt password encoding
- ✅ CORS configured for `localhost:5173`, `5174`, `3000`
- ✅ Role-based URL-level rules
- ✅ `@EnableMethodSecurity` for `@PreAuthorize` annotations
- ✅ WebSocket endpoint (`/ws/**`) explicitly permitted

---

## ✅ FRONTEND — Fully Implemented

### Pages (15)
| Page | Route | Status |
|---|---|---|
| `Register.jsx` | `/register` | ✅ Complete (posts to backend, redirects to OTP page) |
| `VerifyEmail.jsx` | `/verify-email` | ✅ Complete (OTP input, resend, auto-redirect to dashboard on success) |
| `Login.jsx` | `/login` | ✅ Complete |
| `ForgotPassword.jsx` | `/forgot-password` | ✅ Complete |
| `ResetPassword.jsx` | `/reset-password` | ✅ Complete |
| `PractitionerOnboarding.jsx` | `/practitioner/onboarding` | ✅ Complete |
| `PractitionerDashboard.jsx` | `/practitioner/dashboard` | ✅ Complete + notification bell |
| `UserDashboard.jsx` | `/user/dashboard` | ✅ Complete + notification bell |
| `AdminDashboard.jsx` | `/admin/dashboard` | ✅ Complete |
| `BrowseSessions.jsx` | `/browse-sessions` | ✅ Complete |
| `MyBookings.jsx` | `/my-bookings` | ✅ Complete |
| `ProductMarketplace.jsx` | `/products` | ✅ Complete |
| `Cart.jsx` | `/cart` | ✅ Complete |
| `OrderHistory.jsx` | `/user/orders` | ✅ Complete |
| `Unauthorized.jsx` | `/unauthorized` | ✅ Complete |

### Components (6)
| Component | Purpose | Status |
|---|---|---|
| `RoleBasedRoute.jsx` | `AdminRoute` + `PractitionerRoute` guards | ✅ Complete |
| `NotificationDropdown.jsx` | Bell 🔔 icon + paginated notification list + mark-as-read | ✅ Complete |
| `BookingForm.jsx` | Book a session modal/form | ✅ Complete |
| `SessionCard.jsx` | Single session display card | ✅ Complete |
| `SessionCalendar.jsx` | Calendar view of sessions | ✅ Complete |
| `AvailabilityDayCard.jsx` | One day availability display | ✅ Complete |

### Context (1)
| Context | Purpose | Status |
|---|---|---|
| `NotificationContext.jsx` | Global WebSocket + notification state; `isInitializingRef` prevents duplicate inits; `seenNotificationIds` deduplicates incoming messages; subscribes practitioners to `/topic/practitioner/{id}` | ✅ Complete |

### Services (9)
| Service | Purpose | Status |
|---|---|---|
| `authService.js` | Register, OTP verify, login, refresh, password reset; dispatches `authChange` event on login for same-tab notification init | ✅ Complete |
| `sessionService.js` | Book, cancel, reschedule, slots | ✅ Complete |
| `notificationService.js` | Fetch, mark-read, unread count (axios interceptor attaches JWT) | ✅ Complete |
| `orderService.js` | Products + orders + localStorage cart | ✅ Complete |
| `requestService.js` | Practitioner request lifecycle | ✅ Complete |
| `documentService.js` | Upload documents | ✅ Complete |
| `userService.js` | Get current user profile | ✅ Complete |
| `websocketService.js` | STOMP connection with `isConnecting` guard; subscribes user/sessions/orders/practitioner topics | ✅ Complete |
| `jwtService.js` | Token decode, expiry check | ✅ Complete |

---

## ❌ MISSING / INCOMPLETE PARTS

### 1. Review / Rating System
- **Schema**: `review` table exists in `schema.sql` ✅
- **Backend**: ❌ No `ReviewController`, no `ReviewService`, no `ReviewRepository`
- **Frontend**: ❌ No UI to submit post-session reviews
- **Impact**: Practitioner `rating` field has no mechanism to be updated

### 2. Q&A / Community Forum
- **Schema**: `question` and `answer` tables exist in `schema.sql` ✅
- **Backend**: ❌ No `QuestionController`, no `AnswerController`
- **Frontend**: ❌ No Q&A page or component
- **Impact**: Entire feature not wired up

### 3. Session Detail Page
- **Backend**: ❌ `GET /api/sessions/{id}` endpoint missing — only list endpoints exist
- **Frontend**: ❌ No `SessionDetail.jsx` page, no `/sessions/:id` route in `App.jsx`
- **Impact**: Users cannot navigate to a specific session to view full details

### 4. Payment Integration
- **Backend**: `PUT /api/orders/{id}/pay` exists but only marks status as `PAID` in DB — no real payment gateway
- **Frontend**: No Razorpay / Stripe integration
- **Impact**: No actual money flow; payment is simulated

### 5. Recommendation System
- **Schema**: `recommendation` table exists ✅
- **Backend**: ❌ No `RecommendationController` or `RecommendationService`
- **Frontend**: ❌ No recommendation UI
- **Impact**: "Suggest therapy based on symptoms" feature not implemented

### 6. Patient Profile Update
- **Backend**: ❌ No endpoint for patients to update their own profile (name, bio, phone, address, DOB)
- **Impact**: Patients cannot edit their own details through the app

### 7. Admin Cannot Manage Products from Dashboard
- `POST`, `PUT`, `DELETE /api/products` endpoints require ADMIN role ✅
- **Frontend**: ❌ No product management section in `AdminDashboard.jsx`
- **Impact**: Admin must use Postman/Swagger to add/update products

### 8. Video/Chat for Online Sessions
- `meeting_link` column exists in `therapy_session` table ✅ (auto-generated UUID URL on booking)
- **Backend**: No Jitsi / Zoom / WebRTC integration
- **Frontend**: No in-app video call
- **Impact**: Online sessions rely on an external meeting link

### 9. No Profile Picture / Avatar Upload
- Users have `bio`, `phone`, `address` but no avatar/photo column or upload API

### 10. No Pagination on Frontend Lists
- Backend returns paginated notifications ✅ (with infinite scroll in `NotificationDropdown`)
- **Frontend**: Most lists (bookings, practitioners, orders) don't implement pagination/infinite scroll

---

## 🔑 Priority of Missing Items

| Priority | Missing Item | Effort |
|---|---|---|
| 🔴 High | `GET /api/sessions/{id}` + `SessionDetail.jsx` | Low |
| 🔴 High | Patient profile update endpoint + UI | Low |
| 🟡 Medium | Review/Rating system (controller + UI) | Medium |
| 🟡 Medium | Admin product management in dashboard | Medium |
| 🟢 Low | Q&A / Forum feature | High |
| 🟢 Low | Real payment gateway (Razorpay/Stripe) | High |
| 🟢 Low | Video call integration | Very High |
