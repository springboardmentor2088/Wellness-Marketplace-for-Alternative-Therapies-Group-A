# 🏥 Wellness Platform — Full Project Workflow

## Overview

The Wellness Platform is a **Spring Boot + React** full-stack application that connects **patients** with **wellness practitioners** for therapy session booking, practitioner discovery, product purchasing, and real-time notifications.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3, Spring Security (JWT), Spring Data JPA |
| Database | MySQL (`wellness_db`) |
| Frontend | React 18 + Vite, React Router v6, Vanilla CSS |
| Real-time | WebSocket (Native browser implementation) |
| Payments | Razorpay Integration (Live Signature Verification) |
| Email | Spring Mail (Gmail SMTP) |
| Auth | JWT Access + Refresh Tokens + OTP Email Verification |
| Scheduler | Spring `@Scheduled` |

---

## Architecture

```
wellness-frontend (React/Vite :5173)
        │
        │ HTTP REST + WebSocket (STOMP/SockJS)
        ▼
wellness-backend (Spring Boot :8081)
        │
        │ JPA / Hibernate
        ▼
  MySQL wellness_db
```

---

## Database Schema — Tables Built

| # | Table | Purpose |
|---|---|---|
| 1 | `users` | Stores all users (PATIENT, PRACTITIONER, ADMIN roles) with `email_verified` flag |
| 2 | `email_verification_otp` | 6-digit OTP records for email verification (expires in 5 min, max 5 attempts) |
| 3 | `password_reset_token` | One-time tokens for forgot-password flow (expires in 30 min) |
| 4 | `practitioner_profile` | Extended profile linked to PRACTITIONER user |
| 5 | `practitioner_availability` | Weekly schedule slots per practitioner |
| 6 | `practitioner_request` | Patient-to-practitioner consultation requests |
| 7 | `therapy_session` | Booked/confirmed/cancelled sessions with `reminder_sent` + `one_hour_reminder_sent` flags |
| 8 | `notifications` | System-generated in-app notifications (stored by user ID, receiver role) |
| 9 | `product` | Wellness products for marketplace |
| 10 | `orders` | Customer orders |
| 11 | `order_item` | Line items within an order |
| 12 | `review` | Post-session reviews linked to specific therapy sessions |
| 13 | `wallet` | Stores user wallet balance |
| 14 | `wallet_transaction` | Ledger of all wallet credits/debits |
| 15 | `question` | Q&A from users |
| 16 | `answer` | Practitioner answers to questions |

---

## Development Workflow (Done in This Order)

```
1.  Database Schema Design (schema.sql - 14 tables)
2.  Backend Models + Repos (JPA Entities & Repositories)
3.  Auth System (JWT Register/Login/Refresh, Forgot & Reset Password)
4.  OTP Email Verification (register → verify OTP → auto-login)
5.  Practitioner Module (Profile CRUD, Verification, Document Upload)
6.  Availability Module (Weekly Slot Setup)
7.  Therapy Session Module (Book / Cancel / Reschedule, Slot calculation)
8.  Practitioner Request Module (Patient sends request, Practitioner accepts/rejects)
9.  Product Marketplace (Product CRUD, Categories, Search & Filter)
10. Orders + Cart (Create Order, History, Cancel, Pay, Status Update)
11. Email Service (OTP verification, booking confirmations, reminders)
12. WebSocket / Real-time (SockJS + STOMP subscriptions)
13. Notification System (In-app notifications, Automatic cleanup, practitioner fix)
14. Session Reminder Scheduler (30-min and 1-hour auto-reminders)
15. Admin Dashboard (User mgmt, Practitioner verify, Order management)
16. Frontend Pages & Routing (All pages + React Router v6)
17. Bug Fixes (Booking 500 errors, 403 Notification errors, duplicate WebSocket subscriptions,
    OTP redirect, same-tab auth change event, practitioner notification ID mismatch)
18. Real-time Razorpay Integration (Order creation, Signature verification, auto-booking)
19. Mandatory Document Upload (Practitioners must upload prescribed docs to complete sessions)
20. Practitioner Earnings System (Real-time Pending vs. Ready for Payout logic)
21. Real-time Dashboard Synchronization (WebSocket-triggered state refreshes)
22. Wallet & Transaction System (Balance, Deposit, Withdrawal, Payment via Wallet)
23. Advanced Order Tracking (Delivery address, tracking ID, courier partner, status updates)
24. User Profile Management (Patients can now update name, bio, phone, address, etc.)
25. Community Forum System (Threads, multi-level Answers, Likes, Solution Acceptance, Moderation & Reporting)
26. Product Review System (Ratings, comments, and average rating calculation)
27. Session Review System (Post-therapy feedback for practitioners)
28. Server-side Cart Persistence (Synchronized cart across sessions/devices)
29. Enhanced Wallet System (Transaction history and balance management)
```

---

## User Journey Flows

### 🧑‍💼 Patient Journey
1. **Register** → `POST /api/auth/register` (role: PATIENT) → receives OTP email
2. **Verify Email** → `/verify-email` page → `POST /api/auth/verify-email` → auto-login with JWT
3. **Browse Practitioners** → `GET /api/practitioners/verified`
4. **Check Availability** → `GET /api/availability/{practitionerId}`
5. **See Available Slots** → `GET /api/sessions/{practitionerId}/slots?date=YYYY-MM-DD`
6. **Book Session** → `POST /api/sessions/book` → status: HOLD, payment: PENDING
7. **Pay Now** → Razorpay Checkout Modal → `POST /api/payments/webhook` → verification → status: BOOKED, payment: PAID
8. **View My Bookings** → `GET /api/sessions/user/{userId}`
9. **Cancel/Reschedule** → `PUT /api/sessions/{id}/cancel` or `/reschedule` → notification fires; refunds auto-trigger if paid
10. **Leave Review** → `POST /api/reviews` → provides feedback for a specific completed session
11. **Browse Products** → `GET /api/products/available`
12. **Add to Cart** → localStorage cart management
13. **Checkout** → `POST /api/orders`
14. **View Order History** → `GET /api/orders/history`
15. **Receive Notifications** → WebSocket real-time + in-app bell badge (deduped)

### 🧑‍⚕️ Practitioner Journey
1. **Register** → `POST /api/auth/register` (role: PRACTITIONER) → OTP email sent
2. **Verify Email** → OTP → auto-login
3. **Onboard** → `/practitioner/onboarding` → create profile, upload documents
4. **Set Availability** → `POST /api/availability/{practitionerId}`
5. **Wait for Admin Verification** → Admin calls `PUT /api/practitioners/{id}/verify`
6. **Login** → JWT issued, WebSocket connects and subscribes to `/topic/practitioner/{userId}`
7. **View Dashboard** → `/practitioner/dashboard` with real-time notification bell
8. **See Upcoming Sessions** → `GET /api/sessions/practitioner/{practitionerId}` (Only paid sessions visible)
9. **Complete Session** → `PUT /api/sessions/{id}/complete` → **Mandatory** document upload required
10. **Manage Earnings** → Real-time tracking of Pending vs. Ready for Payout amounts
11. **Handle Patient Requests** → Accept/Reject via `PUT /api/practitioners/requests/{id}/accept`
12. **Receive Notifications** → Session booked/paid/cancelled, 30-min + 1-hour reminders

### 🛠️ Admin Journey
1. **Login** (hardcoded admin or admin role in DB) — exempt from OTP verification
2. **View Admin Dashboard** → `/admin/dashboard`
3. **Verify Practitioners** → `PUT /api/practitioners/{id}/verify?verified=true`
4. **Manage Users** → View all users
5. **Manage Orders** → `PUT /api/orders/{id}/status`
6. **View All Requests** → `GET /api/practitioners/requests/all`
