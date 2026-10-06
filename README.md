# AWS Route 53 Clone

A full-stack clone of the AWS Route 53 console built with Next.js, FastAPI, and SQLite.

## Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | Next.js 14+ (TypeScript, Tailwind, Cloudscape Design System) |
| Backend  | FastAPI (Python)        |
| Database | SQLite (via SQLAlchemy) |

## Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.10+
- pnpm

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
API runs at `http://localhost:8000` (Swagger docs at `/docs`).

### Frontend
```bash
cd frontend
pnpm install
pnpm run dev
```
App runs at `http://localhost:3000`.

## Architecture Overview

```
┌─────────────┐     HTTP/JSON     ┌─────────────┐     SQL      ┌──────────┐
│   Next.js   │ ◄──────────────── │   FastAPI   │ ◄──────────► │  SQLite  │
│  (frontend/)│ ────────────────► │ (backend/)  │              │route53.db│
└─────────────┘                   └─────────────┘              └──────────┘
```

- **Frontend** handles UI, auth state (localStorage), and calls the backend API.
- **Backend** exposes REST endpoints for hosted zones and records.
- **SQLite** persists all data in a single file.

## Database Schema

### hosted_zones
| Column  | Type    | Notes              |
|---------|---------|--------------------|
| id      | INTEGER | Primary key        |
| name    | STRING  | Indexed            |
| comment | STRING  | Nullable           |

### records
| Column  | Type    | Notes                     |
|---------|---------|---------------------------|
| id      | INTEGER | Primary key               |
| zone_id | INTEGER | FK → hosted_zones.id      |
| name    | STRING  | Record name               |
| type    | STRING  | A, AAAA, CNAME, TXT, etc. |
| value   | STRING  | Record value              |
| ttl     | INTEGER | Default 300               |

## API Overview

| Method | Endpoint                        | Description       |
|--------|---------------------------------|-------------------|
| GET    | /hosted-zones                   | List zones        |
| POST   | /hosted-zones                   | Create zone       |
| GET    | /hosted-zones/{id}              | Get zone          |
| PUT    | /hosted-zones/{id}              | Update zone       |
| DELETE | /hosted-zones/{id}              | Delete zone       |
| GET    | /hosted-zones/{id}/records      | List records      |
| POST   | /hosted-zones/{id}/records      | Create record     |
| PUT    | /records/{id}                   | Update record     |
| DELETE | /records/{id}                   | Delete record     |

## Features

- Mock authentication (login/logout/session persistence)
- Hosted Zones: View, Search, Create, Edit, Delete
- DNS Records: View, Search, Create, Edit, Delete (A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA)
- Pagination on tables
- Modals, notifications (Flashbar)
- Mocked sections: Dashboard, Traffic Policies, Health Checks, Resolver, Profiles (Coming Soon)

## Deployment

- **Frontend**: Deploy to Vercel (`frontend/` directory)
- **Backend**: Deploy to Railway/Render
- Set `NEXT_PUBLIC_API_URL` environment variable to your backend URL

## Demo

_Add your hosted link here_
