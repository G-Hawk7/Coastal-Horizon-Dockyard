# Technical Design Document (TDD)
## Coastal Horizon: Dockyard & Berth Management System

---

### 1. High-Level Architecture
- **Frontend:** React 19 (TypeScript) built with Vite, Lucide Icons, Axios for REST communication, and centralized CSS design tokens.
- **Backend:** FastAPI (Python 3.12+), Pydantic v2 schemas for request validation, SQLAlchemy 2.0 ORM with connection pooling.
- **Database:** PostgreSQL on Supabase with connection pooling (development and production cloud persistence).
- **API Architecture:** RESTful JSON endpoints following OpenAPI 3.0 standards under the `/api/v1` namespace with interactive Swagger UI documentation (`/docs`).
- **Deployment Platform:** Vercel serverless runtime configuration utilizing `@vercel/python` rewrites and global static edge distribution.

---

### 2. Database Schema Design

#### `users`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default: uuid4 |
| `email` | String | Unique, Indexed, Not Null |
| `hashed_password` | String | Not Null |
| `full_name` | String | Not Null |
| `role` | Enum | `ADMIN`, `PORT_OFFICER`, `SHIP_AGENT` |
| `is_active` | Boolean | Default: True |
| `created_at` | DateTime | Timestamp |

#### `berths` *(Implemented & Verified)*
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default: `gen_random_uuid()` |
| `berth_number` | VARCHAR(50) | Unique, Indexed, Not Null (e.g., "B-101") |
| `max_length_meters` | NUMERIC(6, 2) | Not Null, Check (`> 0`) |
| `max_draft_meters` | NUMERIC(4, 2) | Not Null, Check (`> 0`) |
| `status` | VARCHAR(30) | Enum: `AVAILABLE`, `OCCUPIED`, `UNDER_MAINTENANCE`, Default: `AVAILABLE` |
| `created_at` | TIMESTAMPTZ | Default: `NOW()` |
| `updated_at` | TIMESTAMPTZ | Default: `NOW()` |

#### `vessels`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default: uuid4 |
| `agent_id` | UUID | Foreign Key (`users.id`) |
| `name` | String | Not Null |
| `imo_number` | String | Unique, Not Null |
| `vessel_type` | String | Not Null (e.g., Container, Bulk, Tanker) |
| `length_m` | Float | Not Null |
| `draft_m` | Float | Not Null |
| `created_at` | DateTime | Timestamp |

#### `docking_allocations`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default: uuid4 |
| `vessel_id` | UUID | Foreign Key (`vessels.id`) |
| `berth_id` | UUID | Foreign Key (`berths.id`), Nullable |
| `officer_id` | UUID | Foreign Key (`users.id`), Nullable |
| `status` | Enum | `REQUESTED`, `APPROVED`, `DOCKED`, `MAINTENANCE`, `DEPARTED`, `REJECTED` |
| `eta` | DateTime | Estimated Time of Arrival |
| `etd` | DateTime | Estimated Time of Departure |
| `actual_docked` | DateTime | Nullable |
| `actual_departed`| DateTime | Nullable |

#### `maintenance_records`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default: uuid4 |
| `allocation_id`| UUID | Foreign Key (`docking_allocations.id`) |
| `description` | Text | Not Null |
| `is_cleared` | Boolean | Default: False |
| `logged_at` | DateTime | Timestamp |

---

### 3. REST API Endpoint Specification

#### Authentication
- `POST /api/v1/auth/register` — Public registration (defaults to `SHIP_AGENT`).
- `POST /api/v1/auth/login` — Public login; returns OAuth2 Bearer JWT.
- `GET /api/v1/auth/me` — Authenticated; returns current user session and scopes.

#### Berths *(Implemented & Verified)*
- `GET /api/v1/berths` — Returns array of all registered berths with status and dimensions.
- `POST /api/v1/berths` — Creates a new berth record with dimension validations (`201 Created`).
- `GET /api/v1/berths/{id}` — Fetches single berth details by UUID (`200 OK` / `404 Not Found`).
- `PUT /api/v1/berths/{id}` — Updates physical limits or operational status (`AVAILABLE`, `OCCUPIED`, `UNDER_MAINTENANCE`).
- `DELETE /api/v1/berths/{id}` — Permanently removes a berth record (`204 No Content` / `404 Not Found`).

#### Vessels
- `GET /api/v1/vessels` — Lists vessels (Agent views own; Officer/Admin views all).
- `POST /api/v1/vessels` — Registers a vessel (validates IMO number uniqueness).
- `GET /api/v1/vessels/{id}` — Retrieves single vessel specifications.
- `DELETE /api/v1/vessels/{id}` — De-registers a vessel from the shipyard index.

#### Allocations & Operations
- `GET /api/v1/allocations` — Lists allocations filtered by status or date range.
- `POST /api/v1/allocations/request` — (Agent) Submits a docking slot request with vessel dimensions.
- `PATCH /api/v1/allocations/{id}/assign` — (Officer/Admin) Assigns a matching berth and approves.
- `PATCH /api/v1/allocations/{id}/status` — (Officer/Admin) Updates vessel status (`DOCKED`, `MAINTENANCE`, `DEPARTED`).
- `POST /api/v1/allocations/{id}/maintenance` — (Officer) Logs maintenance notes and sets clearance.

---

### 4. Technical Implementation Details

#### 4.1 Backend Architecture
- **Framework:** FastAPI with Uvicorn ASGI runner.
- **ORM & Driver:** SQLAlchemy 2.0 connected via `psycopg2-binary` to Supabase PostgreSQL connection pooler (`pool_pre_ping=True`, `pool_size=5`, `max_overflow=10`).
- **Data Validation:** Pydantic v2 schemas enforcing strict positive numeric constraints on lengths and drafts, and string format validations.
- **Security & CORS:** `fastapi.middleware.cors.CORSMiddleware` configured to allow development origins (`http://localhost:5173`, `http://127.0.0.1:5173`) and designated production client domains.

#### 4.2 Frontend Architecture
- **Framework & Bundler:** React 19 SPA bootstrapped with Vite and TypeScript.
- **API Client:** Centralized Axios instance (`frontend/src/api/client.ts`) configured with configurable `baseURL` (`import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'`).
- **Icons & Theme:** Lucide React icons with a dark slate maritime color scheme (`#0f172a` canvas, `#f8fafc` text, `#0284c7` primary accents).
- **State Management:** Asynchronous React hooks (`useState`, `useEffect`) providing real-time data sync, loading indicators, and error handling.

---

### 5. Project Directory Structure

```text
Coastal-Horizon-Dockyard/
├── docs/
│   ├── PRD.md
│   ├── SRS.md
│   └── TDD.md
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── schemas.py
│   ├── .venv/
│   ├── .env
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   └── berths.ts
│   │   ├── assets/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── vercel.json
├── .gitignore
└── README.md