# Features Implemented

## 1. User Registration

- Users can register as **PATIENT** or **PRACTITIONER**
- Fields: name, email, phone, password, role
- Passwords are hashed using **BCrypt** before storage
- Duplicate email/phone detection prevents conflicts
- On successful registration:
  - JWT access and refresh tokens are generated
  - Auth data is stored in `localStorage`
  - A role-based welcome email is sent via Gmail SMTP
- Practitioner accounts are automatically marked as **unverified** and require admin approval

## 2. User Login

- Login supports both **email** and **phone number** as identifiers
- Password verification using BCrypt matching
- Practitioner accounts are blocked from login until **admin verifies** them
- On success: JWT tokens returned, user redirected to role-based dashboard
  - `PATIENT` → User Dashboard
  - `PRACTITIONER` → Practitioner Dashboard (with onboarding check)
  - `ADMIN` → Admin Dashboard

## 3. JWT Authentication

- **Access Token**: Short-lived, used for API authorization
- **Refresh Token**: Long-lived, used to generate new access tokens
- `JwtAuthenticationFilter` intercepts all requests, validates the token, and sets the security context
- Protected endpoints require `Authorization: Bearer <token>` header
- Token refresh endpoint: `POST /api/auth/refresh`

## 4. Password Reset (Forgot Password)

- User submits email on the Forgot Password page
- Backend generates a UUID token, stores it with 30-minute expiry
- Reset email with link (`/reset-password?token=...`) is sent via SMTP
- Reset Password page validates token, enforces password strength rules:
  - Minimum 8 characters, uppercase, lowercase, digit, special character
- Token is marked as used after successful reset

## 5. Email Notifications

- Built with **Spring Boot Mail** using Gmail SMTP
- HTML email templates for:
  - **Welcome Email** — sent to patients on registration
  - **Practitioner Registration Confirmation** — informs pending verification
  - **Practitioner Verified Email** — sent when admin approves
  - **Password Reset Email** — contains secure one-time reset link
- Emails are sent asynchronously; failures are logged but don't break the flow

## 6. Role-Based Access Control

- Three roles: `PATIENT`, `PRACTITIONER`, `ADMIN`
- Spring Security enforces role-based endpoint access:
  - `/api/auth/**` — public (register, login, password reset)
  - `/api/practitioners` (GET) — public
  - `/api/sessions/**` — authenticated users only
  - `/api/practitioner/**` — `PRACTITIONER` role only
  - `/api/user/**` — `PATIENT` role only
- Frontend uses `RoleBasedRoute` components (`AdminRoute`, `PractitionerRoute`) to protect client-side routes

## 7. Admin Dashboard

- View and manage all practitioner verification requests
- Approve or reject practitioners with status tracking
- View all registered users and manage the platform
- Uses `requestService.js` to communicate with `PractitionerRequestController`

## 8. Practitioner Management

- **Onboarding Flow**: After registration, practitioners complete their profile (specialization, experience, documents)
- **Document Upload**: Practitioners can upload verification documents (stored in `uploads/practitioner_documents/`)
- **Profile Management**: View and update practitioner profile details
- **Verification System**: Admin reviews and verifies/rejects practitioner accounts
- **Availability Management**: Practitioners set their available time slots for booking

## 9. Therapy Session Booking

- Patients can view practitioner availability via `SessionCalendar` component
- Book sessions using `BookingForm` with date, time, and session type
- Session lifecycle: `SCHEDULED` → `COMPLETED` / `CANCELLED` / `RESCHEDULED`
- Both patients and practitioners can view their sessions via `SessionCard` components
- Backend handles session creation, status updates, and cancellation

## 10. Product Marketplace

- Browse wellness products (Ayurvedic, Herbal, Supplements, Massage Oils, Yoga & Fitness)
- Products are seeded on startup via `DataSeeder` (20 sample products)
- Shopping cart functionality (`Cart.jsx`)
- Order placement and order history (`OrderHistory.jsx`)
- Backend: `ProductController` → `ProductService` → `ProductRepository`

## 11. Real-Time Notifications (WebSocket)

- WebSocket connection via STOMP over SockJS at `/ws` endpoint
- `WebSocketController` handles session notifications
- `SessionNotificationService` sends real-time updates for:
  - New session bookings
  - Session status changes
  - Session reminders
- Frontend `websocketService.js` manages connection lifecycle and message subscriptions

## 12. Automated Session Reminders

- `SessionReminderScheduler` runs on a configurable schedule
- Sends email reminders 15 minutes and 1 hour before sessions
- Configurable via `application.properties`:
  - `app.session.reminder.interval-minutes=15`
  - `app.session.reminder.one-hour-enabled=true`

## 13. Data Seeding

- `DataSeeder` runs on application startup:
  - Creates an **admin user** (`admin@wellness.com` / `admin123`) if not exists
  - Seeds **20 sample products** across 5 categories if database is empty

## 14. Health Check Endpoint

- `GET /` returns API status, version, and available endpoints
- Useful for monitoring and quick verification that the backend is running
