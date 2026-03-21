# 📖 Wellness Platform — Features & Usage Guide

This guide provides a step-by-step walkthrough of the platform's features, categorized by the technical layer (Backend/Frontend).

---

## 🖥️ Backend (Java / Spring Boot)

The backend provides a RESTful API and WebSocket support. Base URL: `http://localhost:8081`

### 1. Authentication & Security
- **Step 1: Registration**: Use `POST /api/auth/register` with user details and role (`PATIENT` or `PRACTITIONER`). This triggers an OTP email.
- **Step 2: OTP Verification**: Use `POST /api/auth/verify-email` with the 6-digit OTP received via email to activate the account.
- **Step 3: Login**: Use `POST /api/auth/login` to receive an `accessToken` and `refreshToken`.
- **Step 4: Token Refresh**: Use `POST /api/auth/refresh` with the refresh token to get a new access token when it expires.

### 2. Practitioner Management
- **Step 1: Profile Creation**: Practitioners use `POST /api/practitioners` to set up their professional profile.
- **Step 2: Document Upload**: Practitioners upload credentials via `POST /api/practitioners/{id}/documents/upload`.
- **Step 3: Admin Verification**: Admins toggle the `verified` status via `PUT /api/practitioners/{id}/verify?verified=true`.
- **Step 4: Set Availability**: Practitioners define their weekly slots via `POST /api/availability/{practitionerId}`.

### 3. Therapy Sessions
- **Step 1: Check Slots**: Patients fetch free slots for a date via `GET /api/sessions/{practitionerId}/slots?date=YYYY-MM-DD`.
- **Step 2: Booking**: Use `POST /api/sessions/book` to create a session (default status: `HOLD`).
- **Step 3: Payment**: After Razorpay payment, `POST /api/payments/webhook` or `PUT /api/orders/{id}/pay` confirms the booking.
- **Step 4: Completion**: Practitioners mark sessions as done via `PUT /api/sessions/{id}/complete`, which requires a mandatory document upload.

### 4. Community Forum
- **Step 1: Create Thread**: Any user can start a discussion via `POST /api/forum/threads`.
- **Step 2: Add Answer**: Practitioners/Admins provide expert answers via `POST /api/forum/threads/{id}/answers`.
- **Step 3: Interaction**: Users can like answers (`POST /api/forum/answers/{id}/like`) or accept an answer as the solution (`PUT /api/forum/answers/{id}/accept`).
- **Step 4: Moderation**: Report inappropriate content via `POST /api/forum/answers/{id}/report`.

### 5. Wallet & Transactions
- **Step 1: Fetch Balance**: Use `GET /api/wallet/balance` to see current funds.
- **Step 2: Transactions**: Use `GET /api/wallet/transactions` for a paginated history of credits and debits.
- **Step 3: Funds Management**: Use `POST /api/wallet/deposit` to add funds or `POST /api/wallet/withdraw` to request a transfer.

---

## 🌐 Frontend (React / Vite)

The frontend provides an interactive UI for all users. Base URL: `http://localhost:5173`

### 1. Patient Experience
- **Step 1: Onboarding**: Sign up and verify your email via the OTP screen.
- **Step 2: Booking a Session**:
    - Browse practitioners on the `/browse-sessions` page.
    - Click "Book Now", select a date from the calendar, and choose a time slot.
    - Complete the payment via the Razorpay modal.
- **Step 3: Managing Bookings**: View, reschedule, or cancel your sessions on the `My Bookings` page.
- **Step 4: Leaving a Review**: After a session is marked as `COMPLETED`, click the "Leave a Review" button in your dashboard or booking history to provide feedback. Each session can be reviewed once.
- **Step 5: Shopping**:
    - Browse wellness products on the `/products` page.
    - Add items to your cart and checkout.
    - Track your order status in `Order History`.

### 2. Practitioner Experience
- **Step 1: Professional Setup**: Complete the onboarding form and upload your certifications.
- **Step 2: Managing Schedule**: Go to the `Dashboard` and set your weekly available hours.
- **Step 3: Handling Sessions**:
    - View upcoming paid sessions on the dashboard.
    - To finish a session, click "Complete" and upload the prescribed document.
- **Step 4: Forum Engagement**: Answer patient questions in the `Community Forum` to build your reputation and rating.

### 3. Admin Control
- **Step 1: Verifying Practitioners**: Review pending applications and documents in the `Admin Dashboard`.
- **Step 2: Order Management**: Update product order statuses (Placed -> Shipped -> Delivered).
- **Step 3: Inventory Control**: Add new products or update stock levels directly from the dashboard.
- **Step 4: Forum Moderation**: Review and resolve reported content to keep the community safe.

---

## 🔔 Real-time Notifications

The platform uses WebSockets for instant updates:
- **Patients**: Receive alerts for booking confirmations, reminders (30m/1h before), and order status changes.
- **Practitioners**: Receive alerts for new bookings and session reminders.
- **Global**: A real-time notification bell in the navbar shows the unread count and a quick-view list of recent events.
