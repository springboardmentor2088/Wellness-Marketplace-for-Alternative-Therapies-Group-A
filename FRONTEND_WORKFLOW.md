# Frontend Workflow

## Tech Stack

- **React 18** with functional components and hooks
- **Vite** for fast development builds
- **React Router v6** for client-side routing
- **Tailwind CSS** for styling (with custom CSS for specific pages)
- **React Hot Toast** for notification toasts
- **SockJS + STOMP** for WebSocket real-time updates

## Routing Structure

All routes are defined in `App.jsx` using React Router:

```
/                          → Register (default landing page)
/register                  → Register
/login                     → Login
/forgot-password           → ForgotPassword
/reset-password            → ResetPassword

/user/dashboard            → UserDashboard
/user/orders               → OrderHistory

/practitioner/onboarding   → PractitionerOnboarding  (PractitionerRoute protected)
/practitioner/dashboard    → PractitionerDashboard   (PractitionerRoute protected)

/admin/dashboard           → AdminDashboard          (AdminRoute protected)

/products                  → ProductMarketplace
/cart                      → Cart
/unauthorized              → Unauthorized

/*                         → Redirect to /
```

### Route Protection

`RoleBasedRoute.jsx` provides two wrapper components:

- **`AdminRoute`**: Checks `localStorage` for `userRole === "ADMIN"`, redirects to `/unauthorized` otherwise
- **`PractitionerRoute`**: Checks for `userRole === "PRACTITIONER"`, redirects to `/unauthorized` otherwise

## Component Hierarchy

```
main.jsx
└── ErrorBoundary
    └── App.jsx (BrowserRouter + Routes)
        ├── Pages (12)
        │   ├── Register.jsx
        │   ├── Login.jsx
        │   ├── ForgotPassword.jsx
        │   ├── ResetPassword.jsx
        │   ├── UserDashboard.jsx
        │   ├── PractitionerOnboarding.jsx
        │   ├── PractitionerDashboard.jsx
        │   ├── AdminDashboard.jsx
        │   ├── ProductMarketplace.jsx
        │   ├── Cart.jsx
        │   ├── OrderHistory.jsx
        │   └── Unauthorized.jsx
        │
        └── Shared Components (5)
            ├── RoleBasedRoute.jsx  (AdminRoute, PractitionerRoute)
            ├── SessionCalendar.jsx (practitioner availability calendar)
            ├── BookingForm.jsx     (session booking form)
            ├── SessionCard.jsx     (session display card)
            └── AvailabilityDayCard.jsx (availability slot card)
```

## API Communication

The frontend communicates with the backend using **service modules** in `src/services/`. All API calls use `fetch()` or `axios`.

### Service Modules (8 total)

| Service | Purpose | HTTP Client |
|---------|---------|-------------|
| `authService.js` | Register, login, refresh token, forgot/reset password, localStorage helpers | `fetch` |
| `jwtService.js` | Token management, auto-refresh, authenticated request helper | `fetch` |
| `userService.js` | User profile operations | `fetch` |
| `sessionService.js` | Therapy session CRUD (book, cancel, reschedule, list) | `fetch` |
| `requestService.js` | Practitioner verification requests (admin/practitioner) | `axios` |
| `documentService.js` | Practitioner document upload/download | `fetch` |
| `orderService.js` | Order placement and history | `axios` |
| `websocketService.js` | WebSocket connection, STOMP subscriptions, real-time notifications | SockJS/STOMP |

### Authentication Pattern

```javascript
// On login/register → store tokens
storeAuthData(data);  // saves to localStorage: user, accessToken, refreshToken, userRole

// On API calls → attach token
headers: {
  "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
  "Content-Type": "application/json"
}
```

### Error Handling Pattern

```javascript
try {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw { response: { data: result } };
  return result;
} catch (err) {
  const errorMsg = err.response?.data?.message || err.message || "Something went wrong";
  toast.error(errorMsg);
}
```

## State Management

The application uses **React's built-in state management**:

- **`useState`**: Local component state for form data, loading flags, error messages, UI toggles
- **`useEffect`**: Data fetching on mount, URL parameter extraction, WebSocket setup
- **`useNavigate`**: Programmatic navigation after login/register/actions
- **`useSearchParams`**: Extract query parameters (e.g., reset password token)
- **`localStorage`**: Persistent auth state across page refreshes (user, tokens, role)

There is no global state library (Redux, Zustand, etc.). Auth state is stored in `localStorage` and read directly by components and services that need it.

## Key UI Patterns

### Toast Notifications
All user-facing success/error messages use `react-hot-toast`:
```javascript
toast.success("Registration successful!");
toast.error("Invalid credentials");
```

### Role-Based Navigation
After login, the user is redirected based on their role:
```
PATIENT      → /user/dashboard
PRACTITIONER → /practitioner/onboarding (if not onboarded) or /practitioner/dashboard
ADMIN        → /admin/dashboard
```

### Error Boundary
`ErrorBoundary.jsx` wraps the entire app in `main.jsx` to catch and display React rendering errors gracefully instead of showing a blank page.
