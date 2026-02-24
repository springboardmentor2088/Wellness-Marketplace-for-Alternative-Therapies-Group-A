# Backend Workflow

## Architecture Pattern

The backend follows the standard **Spring Boot layered architecture**:

```
HTTP Request
     │
     ▼
┌─────────────────┐
│   Controller    │  ← Receives request, validates input (@Valid)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Service      │  ← Business logic, data mapping, JWT generation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Repository    │  ← Spring Data JPA queries
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   MySQL (JPA)   │  ← Hibernate ORM, auto DDL
└─────────────────┘
```

## Controller → Service → Repository Flow

### Example: User Registration

```
POST /api/auth/register  (JSON body: name, email, phone, password, role)
         │
         ▼
AuthController.registerUser(@Valid UserRegisterDTO)
         │
         ▼
AuthService.registerUser(dto)
  ├── Check if email/phone already exists (UserRepository)
  ├── Hash password (BCryptPasswordEncoder)
  ├── Save User entity (UserRepository.save())
  ├── If PRACTITIONER: create PractitionerProfile (PractitionerProfileRepository)
  ├── Send welcome/registration email (EmailService)
  ├── Generate JWT access + refresh tokens (JwtService)
  └── Return AuthResponseDTO { user, accessToken, refreshToken }
```

## Controllers (11 total)

| Controller | Endpoint Prefix | Purpose |
|-----------|----------------|---------|
| `AuthController` | `/api/auth` | Register, login, refresh token, forgot/reset password |
| `UserController` | `/api/user` | User profile CRUD |
| `PractitionerController` | `/api/practitioners` | Practitioner profiles, verification, search |
| `PractitionerRequestController` | `/api/practitioners/requests` | Verification request lifecycle (submit, accept, reject) |
| `AvailabilityController` | `/api/availability` | Practitioner time slot management |
| `TherapySessionController` | `/api/sessions` | Session booking, status updates, cancellation |
| `ProductController` | `/api/products` | Product marketplace CRUD |
| `OrderController` | `/api/orders` | Order placement and history |
| `WebSocketController` | (STOMP) | Real-time session notifications |
| `HealthController` | `/` | API health check |
| `GlobalExceptionHandler` | (global) | Centralized error handling |

## Entity Structure

### Core Entities

| Entity | Table | Key Fields |
|--------|-------|------------|
| `User` | `users` | id, name, email, phone, password, role (PATIENT/PRACTITIONER/ADMIN), bio |
| `PractitionerProfile` | `practitioner_profiles` | user (FK), specialization, experience, verified, licenseNumber |
| `PractitionerDocument` | `practitioner_documents` | practitionerProfile (FK), documentType, filePath |
| `PractitionerRequest` | `practitioner_requests` | practitioner (FK), status, priority, description |
| `PractitionerAvailability` | `practitioner_availability` | practitioner (FK), dayOfWeek, startTime, endTime |
| `TherapySession` | `therapy_sessions` | patient (FK), practitioner (FK), date, time, status, type |
| `Product` | `products` | name, description, price, category, stockQuantity |
| `Order` | `orders` | user (FK), totalAmount, status, orderItems |
| `OrderItem` | `order_items` | order (FK), product (FK), quantity, price |
| `PasswordResetToken` | `password_reset_tokens` | token (UUID), user (FK), expiryDate, used |

### Relationships

```
User ──── 1:1 ──── PractitionerProfile
                         │
                    1:N ──┤── PractitionerDocument
                         │
                    1:N ──┤── PractitionerAvailability

User ──── 1:N ──── TherapySession (as patient)
User ──── 1:N ──── TherapySession (as practitioner)
User ──── 1:N ──── Order ──── 1:N ──── OrderItem ──── N:1 ──── Product
User ──── 1:N ──── PractitionerRequest
User ──── 1:N ──── PasswordResetToken
```

## Database Integration

- **ORM**: Hibernate via Spring Data JPA
- **DDL Strategy**: `spring.jpa.hibernate.ddl-auto=update` — auto-creates/updates tables
- **Connection**: MySQL on `localhost:3306/wellness_db` (XAMPP)
- **Repositories**: All extend `JpaRepository<Entity, ID>` with custom query methods
- **Transactions**: `@Transactional` on service methods for data consistency

## Security Configuration

### Authentication Flow

```
Request → JwtAuthenticationFilter → SecurityFilterChain → Controller
              │
              ├── Extract JWT from Authorization header
              ├── Validate token (JwtService)
              ├── Load user (CustomUserDetailsService)
              └── Set SecurityContext authentication
```

### Endpoint Access Rules

```java
.requestMatchers("/api/auth/**").permitAll()           // Public
.requestMatchers(GET, "/api/practitioners/**").permitAll()  // Public reads
.requestMatchers("/api/sessions/**").authenticated()   // Logged-in users
.requestMatchers("/api/practitioner/**").hasRole("PRACTITIONER")
.requestMatchers("/api/user/**").hasRole("PATIENT")
.anyRequest().authenticated()
```

### Security Features
- **Password Hashing**: BCrypt via `PasswordEncoder` bean
- **CSRF**: Disabled (stateless JWT API)
- **Session Management**: Stateless (`SessionCreationPolicy.STATELESS`)
- **CORS**: Configured for `localhost:5173`, `localhost:5174`, `localhost:3000`

## Email Service

- Configured with Gmail SMTP (`smtp.gmail.com:587`)
- Uses `MimeMessageHelper` for HTML emails
- Four email templates: user welcome, practitioner registration, practitioner verified, password reset
- Failures are caught and logged — never break the main flow

## Scheduled Tasks

| Scheduler | Purpose | Trigger |
|-----------|---------|---------|
| `SessionReminderScheduler` | Sends email reminders before sessions | Fixed rate (configurable) |
| `TokenCleanupScheduler` | Deletes expired password reset tokens | Scheduled cleanup |
