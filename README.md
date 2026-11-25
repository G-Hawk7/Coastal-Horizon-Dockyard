# Coastal Horizon Dockyard

A full-stack maritime berth operations and dockyard administration platform featuring JWT authentication, Role-Based Access Control (RBAC), shared team workspaces with granular permissions, security telemetry, and audit logging.

**Live Production App:** https://coastal-horizon-dockyard-su3j.vercel.app

---

## Core Features

### Authentication & Security
- **JWT + `httpOnly` Refresh Cookies:** Short-lived in-memory access tokens paired with `httpOnly`, `Secure` refresh cookies and silent session restoration on page reload.
- **Hardened Password Storage:** Passwords hashed with `bcrypt` combined with a server-side `PASSWORD_PEPPER`.
- **Session Management & Protection:** Active session tracking, individual or bulk session revocation, failed-login tracking by IP and account, and immediate lockout for banned users.

### Berth Operations & Shared Dockyard Groups
- **Berth Management:** Full CRUD lifecycle for dockyard berths (`AVAILABLE`, `OCCUPIED`, `UNDER_MAINTENANCE`) with search, status filtering, and scope filtering.
- **Granular Group Permissions:** Owners can organize shared dockyard groups and grant per-member permissions independently (e.g., **Create/Update** vs. **Assign**), enforced on both the FastAPI backend and React UI.

### Admin Control Center (`/admin`)
- **Overview & Security:** Live system metrics (users, berths, groups, 7-day failed logins) plus failed-login breakdowns by IP address and account.
- **Users Management:** Search, role/status filtering, pagination, user activity inspection, role promotion/demotion, single and bulk ban/unban with mandatory reason, session revocation, and CSV export.
- **Content Moderation:** System-wide berth and group oversight with filtering, single/bulk deletion, and CSV export.
- **Audit Logs:** Filterable trail of authentication, berth, group, moderation, and export events with CSV download.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React, TypeScript, Vite, React Router, Lucide Icons |
| **Backend** | FastAPI, SQLAlchemy, Pydantic, PyJWT, bcrypt, Uvicorn |
| **Database** | PostgreSQL (Supabase) with local connection pooling and serverless `NullPool` |
| **Deployment** | Vercel (`vercel.json` SPA rewrites + `api/index.py` serverless ASGI entrypoint) |

---

## Project Structure

```text
Coastal-Horizon-Dockyard/
├── api/
│   └── index.py            # Vercel serverless entrypoint mounting FastAPI app
├── backend/
│   ├── app/
│   │   ├── routers/        # Auth, Berths, Groups, and Admin API endpoints
│   │   ├── services/       # Business logic & audit trail services
│   │   ├── database.py     # SQLAlchemy engine (local pool / Vercel NullPool)
│   │   ├── models.py       # ORM models
│   │   ├── rbac.py         # Role & group permission dependencies
│   │   ├── security.py     # JWT & bcrypt + pepper helpers
│   │   └── seed.py         # Database seeding utility
│   └── requirements.txt
├── docs/                   # SRS and TDD documentation
├── frontend/
│   └── src/
│       ├── api/            # Axios client & typed API modules
│       ├── components/     # Layout & RouteGuards (Protected, Admin, GuestOnly)
│       ├── context/        # AuthContext with silent refresh & instant logout
│       ├── pages/          # Login, Signup, Berths, Groups, Profile, Admin
│       └── types/          # Shared TypeScript interfaces
├── .env.example            # Environment variable template (no secrets)
├── requirements.txt        # Root Python dependencies for Vercel
└── vercel.json             # Build config and API/SPA rewrite rules