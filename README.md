# HeraDesk

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)

**Open Source Customer Service System** - A real-time live chat system for customer service that's easy to use and extend.

[Live Demo](https://heradesk.heri.dev) · [Report Bug](https://github.com/herihermwn/heradesk/issues) · [Request Feature](https://github.com/herihermwn/heradesk/issues)

---

## About

HeraDesk is an open source customer service system built with modern technology. Perfect for businesses that need live chat features with customers without relying on third-party services.

## Why Bun.js?

HeraDesk is built with [Bun.js](https://bun.sh) for maximum WebSocket performance:

- **7x more WebSocket throughput** compared to Node.js ([source](https://bun.sh/blog/bun-v1.3#websocket-improvements))
- **Ultra-low latency** for real-time messaging
- **Handle thousands of concurrent connections** efficiently
- **Native WebSocket support** with optimized memory usage

Learn more about Bun.js WebSocket improvements:
- [Bun v1.3 WebSocket Improvements](https://bun.sh/blog/bun-v1.3#websocket-improvements)
- [Bun WebSocket Documentation](https://bun.sh/docs/runtime/http/websockets)

## Features

- **Blazing Fast WebSocket** - Built with Bun.js for 7x more throughput
- **Real-time Chat** - Instant messaging with ultra-low latency
- **Anonymous Customer Chat** - No registration required for customers
- **Multi-Agent Support** - Handle multiple CS agents with automatic queue
- **Dashboard Analytics** - Monitor team performance with statistics
- **Canned Responses** - Quick reply templates for faster response
- **Chat Transfer** - Transfer chats between CS agents easily
- **Admin Dashboard** - User management and chat logs
- **JWT Authentication** - Secure token-based authentication
- **S3 Storage** - Support for file uploads

## Tech Stack

| Layer | Technology | Why? |
|-------|------------|------|
| Runtime | [Bun.js](https://bun.sh) | 7x faster WebSocket, native TypeScript |
| Frontend | [React 19](https://react.dev), Tailwind CSS | Modern UI with latest features |
| Database | [PostgreSQL](https://postgresql.org), [Prisma ORM](https://prisma.io) | Reliable, type-safe database |
| Authentication | JWT (JSON Web Token) | Secure, stateless auth |
| Real-time | Native Bun WebSocket | High performance pub/sub |
| Storage | S3-compatible | Flexible file storage |

## Project Structure

```
heradesk/
├── engine/                 # Backend
│   └── src/
│       ├── config/         # Environment, database, S3 config
│       ├── db/             # Database seed
│       ├── middleware/     # Auth middleware
│       ├── routes/         # API routes
│       ├── services/       # Business logic
│       ├── utils/          # JWT utilities
│       ├── websocket/      # WebSocket handler
│       └── index.ts        # Entry point
├── dashboard/              # Frontend
│   └── src/
│       ├── pages/
│       │   ├── Landing.tsx       # Customer chat widget
│       │   ├── auth/Login.tsx    # Login page
│       │   ├── cs/Dashboard.tsx  # CS dashboard
│       │   └── admin/Dashboard.tsx # Admin dashboard
│       └── index.css       # Tailwind CSS
├── prisma/
│   └── schema.prisma       # Database schema
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## Prerequisites

- Bun.js (v1.0+)
- PostgreSQL (v14+)

## Installation

1. Clone the repository

```bash
git clone git@github.com:herihermwn/heradesk.git
cd heradesk
```

2. Install dependencies

```bash
bun install
```

3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
DATABASE_URL=postgresql://user@localhost:5432/heradesk
JWT_SECRET=your_secret_key
```

4. Setup database

```bash
# Create database
createdb heradesk

# Push schema to database
bun run db:push

# Seed initial data
bun run db:seed
```

5. Build CSS

```bash
bun run css:build
```

6. Start the server

```bash
bun run dev
```

Server will run at `http://127.0.0.1:3002`

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run start` | Start production server |
| `bun run css:build` | Build Tailwind CSS |
| `bun run css:watch` | Watch and rebuild CSS on changes |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:push` | Push schema to database |
| `bun run db:migrate` | Run database migrations |
| `bun run db:seed` | Seed initial data |
| `bun run db:studio` | Open Prisma Studio |

## Default Accounts

After running `bun run db:seed`, the following accounts are available:

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| CS | cs | cs123 |

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with username and password |
| POST | `/api/auth/logout` | Logout current session |
| GET | `/api/auth/me` | Get current user info |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health status |

## Pages

| Path | Description |
|------|-------------|
| `/` | Landing page with customer chat widget |
| `/login` | Login page for CS and Admin |
| `/cs` | Customer Service dashboard |
| `/admin` | Admin dashboard |

## Database Schema

### Tables

- **users** - Admin and CS accounts
- **cs_status** - CS online/offline/busy status
- **chat_sessions** - Customer chat sessions
- **messages** - Chat messages
- **canned_responses** - Quick reply templates
- **activity_logs** - Activity logging

## WebSocket Events

### Customer Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `customer:send_message` | Client to Server | Send message to CS |
| `chat:assigned` | Server to Client | CS has been assigned |
| `chat:message` | Server to Client | New message from CS |

### CS Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `cs:set_status` | Client to Server | Set online/offline/busy |
| `cs:send_message` | Client to Server | Send message to customer |
| `chat:new` | Server to Client | New chat waiting |
| `chat:message` | Server to Client | Message from customer |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3002 |
| `HOST` | Server host | 127.0.0.1 |
| `NODE_ENV` | Environment | development |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 15m |
| `S3_ENDPOINT` | S3 endpoint URL | - |
| `S3_BUCKET` | S3 bucket name | - |
| `S3_ACCESS_KEY` | S3 access key | - |
| `S3_SECRET_KEY` | S3 secret key | - |
| `MAX_CHAT_PER_CS` | Max concurrent chats per CS | 5 |

## Contributing

Contributions are welcome! If you want to contribute:

1. Fork this repository
2. Create a new feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Create a Pull Request

## Support

If you find a bug or have suggestions, please create an [issue](https://github.com/herihermwn/heradesk/issues) on GitHub.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [Heri Hermawan](https://github.com/herihermwn)
