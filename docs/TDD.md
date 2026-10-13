# Technical Design Document (TDD)
## Coastal Horizon: Dockyard & Berth Management System

### 1. High-Level Architecture
- **Frontend:** React.js (TypeScript) built with Vite, Tailwind CSS, TanStack Query (React Query) for stateful data fetching, and React Router v6.
- **Backend:** FastAPI (Python 3.11+), Pydantic v2 schemas for request validation, SQLAlchemy 2.0 ORM.
- **Database:** PostgreSQL (production-ready) / SQLite (development).
- **API Architecture:** RESTful JSON endpoints following OpenAPI 3.0 standards with interactive Swagger UI (`/docs`).

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

#### `berths`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `berth_number` | String | Unique, Not Null (e.g., "B-01") |
| `max_length_m` | Float | Not Null |
| `max_draft_m` | Float | Not Null |
| `status` | Enum | `AVAILABLE`, `OCCUPIED`, `MAINTENANCE` |

#### `vessels`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `agent_id` | UUID | Foreign Key (`users.id`) |
| `name` | String | Not Null |
| `imo_number` | String | Unique, Not Null |
| `vessel_type` | String | Not Null (e.g., Container, Bulk) |
| `length_m` | Float | Not Null |
| `draft_m` | Float | Not Null |

#### `docking_allocations`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
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
| `id` | UUID | Primary Key |
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

#### Berths
- `GET /api/v1/berths` — Returns list of all berths with dimensions and availability.
- `POST /api/v1/berths` — (Admin only) Adds a new berth.
- `PATCH /api/v1/berths/{id}` — (Admin only) Updates berth dimensions or operational status.

#### Vessels
- `GET /api/v1/vessels` — Lists vessels (Agent views own; Officer/Admin views all).
- `POST /api/v1/vessels` — Registers a vessel (validates IMO number uniqueness).

#### Allocations & Operations
- `GET /api/v1/allocations` — Lists allocations filtered by status or date range.
- `POST /api/v1/allocations/request` — (Agent) Submits a docking slot request.
- `PATCH /api/v1/allocations/{id}/assign` — (Officer/Admin) Assigns a matching berth and approves.
- `PATCH /api/v1/allocations/{id}/status` — (Officer/Admin) Updates vessel status (`DOCKED`, `MAINTENANCE`, `DEPARTED`).
- `POST /api/v1/allocations/{id}/maintenance` — (Officer) Logs maintenance notes and sets clearance.