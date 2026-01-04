# HeraDesk

Customer Service Chat Application built with Bun.js, React 19, and PostgreSQL.

## Features

- Real-time chat using WebSocket
- Anonymous customer chat (no registration required)
- Customer Service dashboard with multiple chat handling
- Admin dashboard for user management and chat logs
- JWT-based authentication
- S3 storage support for file uploads

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun.js |
| Frontend | React 19, Tailwind CSS |
| Database | PostgreSQL, Prisma ORM |
| Authentication | JWT (JSON Web Token) |
| Real-time | WebSocket |
| Storage | S3-compatible (NevaObjects) |

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

## License

MIT
