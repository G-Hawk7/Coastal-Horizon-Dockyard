# Product Requirements Document (PRD)
## Coastal Horizon: Dockyard & Berth Management System

### 1. Executive Summary & Problem Statement
Commercial dockyards face operational bottlenecks, berth contention, and safety compliance risks due to fragmented scheduling and manual communication between port authorities and shipping agencies. 

**Coastal Horizon** is a centralized, role-based dockyard management web platform designed to streamline vessel arrival requests, berth allocation, and maintenance turnarounds. It provides real-time operational status, enforces physical constraint checks (draft/length matching), and prevents schedule double-booking.

### 2. User Roles & Personas
- **Ship Agent (Client):** External maritime representative responsible for registering vessels, requesting docking slots, and monitoring clearance status.
- **Port Operations Officer (Operator):** Operational staff member managing dock traffic, evaluating vessel parameters, assigning berths, and logging vessel turnarounds.
- **Dockyard Admin (Superuser):** System administrator overseeing physical berth infrastructure, auditing user activity, and managing user roles.

### 3. Core MVP Features
- **Authentication & RBAC:** Secure JWT-based authentication with strict role permissions (`Ship Agent`, `Port Officer`, `Admin`).
- **Vessel Profile Management:** Comprehensive registry of incoming vessels including IMO number, draft, length, and cargo type.
- **Berth Inventory & Allocation Engine:** Physical slot registry with automated constraint validation (vessel draft $\le$ berth depth) to prevent conflicting reservations.
- **Vessel Lifecycle Workflow:** State tracking across all major stages:
  `REQUESTED` $\rightarrow$ `APPROVED` $\rightarrow$ `DOCKED` $\rightarrow$ `UNDER_MAINTENANCE` $\rightarrow$ `DEPARTED`.
- **Maintenance & Clearance Logging:** Logging inspection notes and clearing vessels for departure.

### 4. Non-Goals / Out of Scope (Future Work)
- Real-time IoT sensor telemetry and automated crane hardware integration.
- Direct credit card / gateway processing (financial tracking is recorded as billing ledger status only).
- Machine learning or predictive AI models (all matching is rule-based and deterministic).