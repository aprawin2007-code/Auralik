# Aura Backend Platform

Production-ready NestJS enterprise backend for the Aura anonymous video chat platform. Built using TypeScript, PostgreSQL, Prisma ORM, Redis, and Socket.IO.

## Prerequisites
- Node.js 20 LTS
- PostgreSQL 16
- Redis 7

## Getting Started

### 1. Configure Environment Variables
Copy `.env.example` to `.env` and update configuration properties:
```bash
cp .env.example .env
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Initialisation
Apply initial migrations and sync Prisma schema definitions:
```bash
npx prisma db push
```

### 4. Run Application
```bash
# Development mode with hot-reloading
npm run start:dev

# Production build compilation
npm run build
npm run start
```

---

## API Architecture

### REST Endpoints

#### 1. Anonymous Sessions
- **POST `/api/v1/auth/session`** — Initialises an anonymous user session. Passes a unique client-side `deviceId`. If the device has an active session, it terminates the duplicate session to keep a single session per device.
- **POST `/api/v1/auth/refresh`** — Refreshes access tokens using bearer refresh tokens.
- **POST `/api/v1/auth/logout`** — Invalidates the current session and adds the token to the Redis blocklist.

#### 2. User Profiles
- **GET `/api/v1/users/me`** — Fetches current anonymous profile settings, interests, and preferences.
- **PATCH `/api/v1/users/me`** — Updates nickname, active interests, languages, and country filters.
- **DELETE `/api/v1/users/me`** — Deletes the profile and clears related data.

#### 3. Video Rooms
- **POST `/api/v1/rooms`** — Establishes a call matching session between two active users.
- **GET `/api/v1/rooms/active`** — Returns current call room parameters.
- **DELETE `/api/v1/rooms/:id/end`** — Closes the active call session and reverts user statuses to `ONLINE`.

#### 4. System Indicators
- **GET `/api/v1/health`** — Performs system health check checks on database connection stability.

---

## Real-time Interfaces (WebSockets Namespace Map)

### 1. Namespace `/matchmaking`
Manages the wait queue using Redis sorted sets (FIFO).
- **Event `joinQueue`** — Client submits interest tag filters to join queue.
- **Event `leaveQueue`** — Client leaves queue.
- **Event `matchFound`** — Emitted by server to both matched clients with room parameters.

### 2. Namespace `/signaling`
Handles WebRTC SDP and ICE candidate signaling transfers.
- **Event `registerSocket`** — Maps current authenticated socket ID to user session.
- **Event `signal`** — Wraps and transfers payload SDPS directly to matched client.

### 3. Namespace `/chat`
Exchanges call session text messages.
- **Event `joinRoom`** — Joins matching room's message channel.
- **Event `sendMessage`** — Broadcasts message to room and saves in temporary Redis List.
