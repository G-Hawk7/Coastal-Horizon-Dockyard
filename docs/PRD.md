# Product Requirements Document (PRD)
## Coastal Horizon Dockyard Management System

---

## 1. Executive Summary
Coastal Horizon Dockyard is a web-based maritime berth allocation and shipyard management platform. The application is engineered to eliminate manual tracking overhead, prevent physical dimension collisions (vessel draft and length exceeding physical slip thresholds), and provide real-time operational visibility over drydock and berth facilities.

---

## 2. Problem Statement
Traditional dockyards frequently suffer from operational miscoordinations:
* **Over-allocation & Physical Mismatches:** Scheduling vessels into berths incapable of handling their draft or displacement causes costly grounding or quay damage.
* **Lack of Real-time Visibility:** Harbor controllers lack instant, synchronized indicators of berth readiness, occupancy, and ongoing maintenance windows.
* **Manual Bottlenecks:** Manual data logging via static spreadsheets results in stale records, race conditions, and scheduling conflicts.

---

## 3. User Personas

### Persona A: Dockyard Operations Controller (Harbor Master)
* **Goal:** Real-time visibility into all shipyard berths and their current occupancy.
* **Pain Points:** Spreadsheets with out-of-date entries; accidental double-booking of berths.
* **Needs:** A unified dashboard to quickly check physical berth constraints, toggle maintenance cycles, and allocate docking spaces.

### Persona B: Ship Agent / Vessel Liaison
* **Goal:** Secure immediate docking authorization and monitor physical slip readiness.
* **Pain Points:** Unclear quay dimension criteria leading to delayed vessel berthing.
* **Needs:** Explicit, programmatic confirmation that requested berths support the vessel's length and draft.

---

## 4. User Stories

| ID | Persona | Story Description | Acceptance Criteria |
|---|---|---|---|
| **US-01** | Controller | As an operations controller, I want to view all physical berths along with their operational statuses (`AVAILABLE`, `OCCUPIED`, `UNDER_MAINTENANCE`) in real-time. | Berths are rendered dynamically with clear visual indicators matching backend state. |
| **US-02** | Controller | As an operations controller, I want to create a new berth record with custom physical dimensions. | System validates that length and draft are positive numbers and saves the record to Supabase. |
| **US-03** | Controller | As an operations controller, I want to cycle or update a berth's operational status with immediate UI feedback. | One-click status updates send an asynchronous PUT request, updating timestamps and card badges. |
| **US-04** | Controller | As an operations controller, I want to decommission or delete obsolete berths from the shipyard. | A confirmation prompt prevents accidental deletion; deleting sends an HTTP `204 No Content` response and removes the card. |

---

## 5. Scope & Success Metrics (KPIs)

### For the MVP (done so far for mid assessment)
* End-to-end full-stack Berth CRUD implementation.
* PostgreSQL database persistence via Supabase.
* Fully connected REST API layer using FastAPI.
* Reactive TypeScript UI built with Vite and React.
* Production deployment configuration targeting Vercel.

### Success Metrics
* **Data Integrity:** 100% adherence to database schema constraints (e.g., unique berth identifiers, strictly typed status enums).
* **API Responsiveness:** Average latency under 250ms for berth queries and status updates.
* **Zero Client Runtime Errors:** Clean frontend state synchronization without unhandled network rejections or UI freezes.