# Wellness Application — Project Overview

## Introduction

The **Wellness Application** is a full-stack digital therapy platform that connects patients with wellness practitioners. It provides secure authentication, role-based dashboards, therapy session booking, a product marketplace, and email notifications — all built with a modern React frontend and a Spring Boot REST API backend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 (Vite), React Router, Tailwind CSS, React Hot Toast |
| **Backend** | Spring Boot 3, Spring Security, Spring Data JPA, Spring Mail |
| **Database** | MySQL (via XAMPP) |
| **Auth** | JWT (JSON Web Tokens) — access + refresh tokens |
| **Email** | Gmail SMTP (Spring Mail) |
| **Real-time** | WebSocket (STOMP over SockJS) |
| **Build** | Maven (backend), Vite (frontend) |

## Architecture

```
┌──────────────────────┐       HTTP / REST        ┌──────────────────────┐
│                      │  ◄──────────────────────► │                      │
│   React Frontend     │      JSON Responses       │   Spring Boot API    │
│   (localhost:5173)   │                           │   (localhost:8081)   │
│                      │  ◄──── WebSocket ────────►│                      │
└──────────────────────┘                           └──────────┬───────────┘
                                                              │
                                                     Spring Data JPA
                                                              │
                                                   ┌──────────▼───────────┐
                                                   │       MySQL          │
                                                   │    (wellness_db)     │
                                                   └──────────────────────┘
```

## How Frontend and Backend Communicate

1. **REST API**: The frontend uses `fetch()` to call Spring Boot endpoints at `http://localhost:8081/api/...`. All requests include `Content-Type: application/json`. Protected endpoints require a `Bearer <JWT>` token in the `Authorization` header.

2. **Authentication Flow**: On login/register, the backend returns an `accessToken` and `refreshToken`. The frontend stores these in `localStorage` and attaches them to subsequent requests.

3. **WebSocket**: Real-time notifications (session updates, reminders) are delivered via STOMP over SockJS at `/ws`. The frontend subscribes to user-specific topics.

4. **CORS**: The backend allows origins `localhost:5173` and `localhost:5174` via Spring Security CORS configuration.

## Project Structure

```
wellness-backend/
├── wellness-backend/          # Spring Boot backend
│   ├── src/main/java/com/wellness/backend/
│   │   ├── config/            # SecurityConfig, DataSeeder, WebSocketConfig
│   │   ├── controller/        # REST controllers (11 files)
│   │   ├── dto/               # Data Transfer Objects (24 files)
│   │   ├── model/             # JPA Entities (11 files)
│   │   ├── repository/        # Spring Data repositories (10 files)
│   │   ├── scheduler/         # Token cleanup scheduler
│   │   ├── security/          # JWT filter, service, UserDetailsService
│   │   └── service/           # Business logic (11 files)
│   └── src/main/resources/
│       └── application.properties
│
└── wellness-frontend/         # React (Vite) frontend
    └── src/
        ├── components/        # Reusable UI components (5 files)
        ├── pages/             # Page-level components (12 files)
        ├── services/          # API service modules (8 files)
        └── styles/            # CSS stylesheets
```
