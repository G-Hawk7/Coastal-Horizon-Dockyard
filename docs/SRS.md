# Software Requirements Specification (SRS)
## Coastal Horizon Dockyard Management System

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for the Coastal Horizon Dockyard Berth Management MVP. It details the functional, non-functional, and interface requirements for academic and operational evaluation.

### 1.2 System Overview
The system implements a three-tier decoupled client-server architecture:
* **Presentation Tier:** Single Page Application (SPA) built with React 19, TypeScript, and Vite.
* **Application Tier:** Asynchronous REST API developed using Python 3.12+ and FastAPI.
* **Persistence Tier:** Cloud-managed PostgreSQL relational database provisioned on Supabase.

---

## 2. Functional Requirements (FR)

### 2.1 Berth Management Module

* **FR-1.1: Berth Creation (`POST /api/v1/berths`)**
  * The system must allow users to register a new berth by providing `berth_number`, `max_length_meters`, and `max_draft_meters`.
  * The system must validate that `berth_number` is non-empty and unique across the dockyard.
  * The system must validate that `max_length_meters` and `max_draft_meters` are strictly positive floating-point numbers.
  * The default initial status must be set to `AVAILABLE` unless specified otherwise.

* **FR-1.2: Berth Retrieval (`GET /api/v1/berths`)**
  * The system must return an array of all active berths serialized as JSON objects.
  * Each record must return: `id` (UUID), `berth_number`, `max_length_meters`, `max_draft_meters`, `status`, `created_at`, and `updated_at`.

* **FR-1.3: Berth Update (`PUT /api/v1/berths/{id}`)**
  * The system must allow partial or complete updates to an existing berth using its primary key UUID.
  * Allowed status transitions are strictly constrained to: `AVAILABLE`, `OCCUPIED`, and `UNDER_MAINTENANCE`.
  * The system must update the `updated_at` timestamp column upon successful modification.

* **FR-1.4: Berth Deletion (`DELETE /api/v1/berths/{id}`)**
  * The system must remove the corresponding berth record from the persistence tier when requested by a valid UUID.
  * The endpoint must return an HTTP `204 No Content` status code upon successful deletion.
  * If the berth UUID does not exist, the system must return an HTTP `404 Not Found` response.

---

## 3. Non-Functional Requirements (NFR)

* **NFR-01: Performance & Concurrency:** The backend must handle asynchronous I/O via Uvicorn ASGI to manage concurrent read/write queries with database connection pooling.
* **NFR-02: Security & CORS:** The API must explicitly regulate origins via `fastapi.middleware.cors.CORSMiddleware`, permitting local development environments (`http://localhost:5173`) and designated production client domains.
* **NFR-03: Reliability & Data Validation:** Input validation must be strictly enforced at the application boundary via Pydantic schemas before reaching the database query execution layer.
* **NFR-04: Portability:** The platform must be buildable across major operating systems (Windows, Linux, macOS) and container/serverless environments.

---

## 4. External Interface Requirements

### 4.1 User Interface
* Responsive dashboard layout supporting screen resolutions from 360px (mobile) to 1920px+ (desktop).
* Visual cues with distinct color codings for operational statuses:
  * `AVAILABLE`: Soft Green (`#dcfce7` / `#166534`)
  * `OCCUPIED`: Soft Red (`#fee2e2` / `#991b1b`)
  * `UNDER_MAINTENANCE`: Soft Amber (`#fef3c7` / `#92400e`)

### 4.2 Software Interfaces
* **ORM:** SQLAlchemy 2.0 mapped to Supabase PostgreSQL database pooler.
* **HTTP Client:** Axios configured with centralized `baseURL` and JSON payload headers.