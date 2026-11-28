Independent University, Bangladesh  
CSE309 Web Application & Internet  

# Final Project Submission Report

**Submitted by:**  
Name: Saif Hossain Shihab  
Student ID: 2120462  
Section: 6 

Project Title: Coastal Horizon Dockyard  
Vercel URL: https://coastal-horizon-dockyard-su3j.vercel.app  
GitHub Repository: https://github.com/G-Hawk7/Coastal-Horizon-Dockyard

**Submitted To:**  
Sayef Reyadh  
Adjunct Lecturer  
Department of Computer Science & Engineering  
Independent University, Bangladesh  

Semester: Autumn 2026  
Date of Submission: 28th November, 2026

---

## Table of Contents

1. [1. Executive Summary](#1-executive-summary)
   - [1.1 Project overview](#11-project-overview)
   - [1.2 What was built since the mid assessment](#12-what-was-built-since-the-mid-assessment)
   - [1.3 Live links](#13-live-links)
2. [Part A. Product Requirements (PRD)](#part-a-product-requirements-prd)
   - [A1. Problem Statement](#a1-problem-statement)
   - [A2. Users and Roles](#a2-users-and-roles)
   - [A3. Goals and Success Measures](#a3-goals-and-success-measures)
   - [A4. Scope and Non-Goals](#a4-scope-and-non-goals)
   - [A5. User Stories](#a5-user-stories)
3. [Part B. Software Requirements (SRS)](#part-b-software-requirements-srs)
   - [B1. Introduction](#b1-introduction)
   - [B2. Functional Requirements](#b2-functional-requirements)
   - [B3. Non-Functional Requirements](#b3-non-functional-requirements)
   - [B4. Roles and Permission Matrix](#b4-roles-and-permission-matrix)
   - [B5. Use Cases](#b5-use-cases)
   - [B6. Acceptance Criteria](#b6-acceptance-criteria)
   - [B7. Traceability Matrix](#b7-traceability-matrix)
4. [Part C. Technical Design (TDD)](#part-c-technical-design-tdd)
   - [C1. Technology Stack](#c1-technology-stack)
   - [C2. System Architecture](#c2-system-architecture)
   - [C3. Backend and Frontend Structure](#c3-backend-and-frontend-structure)
   - [C4. Data Model](#c4-data-model)
   - [C5. API Design](#c5-api-design)
   - [C6. JWT Authentication Design](#c6-jwt-authentication-design)
   - [C7. RBAC Design](#c7-rbac-design)
   - [C8. Admin Dashboard Design](#c8-admin-dashboard-design)
   - [C9. Security Design and Threats](#c9-security-design-and-threats)
   - [C10. Deployment on Vercel](#c10-deployment-on-vercel)
   - [C11. Testing](#c11-testing)
5. [Part D. Evidence: Screenshots of the Running Application](#part-d-evidence-screenshots-of-the-running-application)
   - [D1. User Side](#d1-user-side)
   - [D2. Security Behaviour](#d2-security-behaviour)
   - [D3. Admin Dashboard](#d3-admin-dashboard)
   - [D4. Deployment](#d4-deployment)
   - [D5. Tests](#d5-tests)
6. [Part E. Project Management and Conclusion](#part-e-project-management-and-conclusion)
   - [E1. How to Run and Test](#e1-how-to-run-and-test)
   - [E2. GitHub Work](#e2-github-work)
   - [E3. Limitations](#e3-limitations)
   - [E4. Future Work](#e4-future-work)
   - [E5. Sources, Libraries and Tools](#e5-sources-libraries-and-tools)

### List of Figures and Screenshots

| Ref | Title / Caption | Section |
| :--- | :--- | :--- |
| **Figure 1** | Use Case Diagram — Actors and Core System Use Cases | B5 |
| **Figure 2** | System Architecture — Browser, Vercel Frontend, Vercel FastAPI, Supabase PostgreSQL, and Audit Log | C2 |
| **Figure 3** | Entity-Relationship (ER) Diagram — Six-Table Relational Schema | C4 |
| **Figure 4** | JWT Sequence Diagram — Login, Protected Request, Expiry, Silent Refresh, Reuse Protection, and Logout | C6 |
| **Figure 5** | Request Authorization Pipeline — Token, User, Ban, Role, Ownership, and Group Permission Checks | C7 |
| **Figure 6** | Admin Control Center Tabs and Backend Endpoint Mapping | C8 |
| **Figure 7** | Production Deployment Layout on Vercel and Supabase | C10 |
| **S1–S6** | User Side Evidence — Validation, Own Berths, Password Rejection, Sessions, Groups, RBAC 403 | D1 |
| **S7–S9** | Security Behaviour Evidence — Masked Bearer & 401 Expiry, Refresh & HttpOnly Cookie, Live Ban 403 | D2 |
| **S10–S17** | Admin Dashboard Evidence — Stats, Users, Inspect Detail, Ban Flow, Moderation, Audit Logs, Security View, CSV Export | D3 |
| **S18–S20** | Deployment Evidence — Vercel Production Domain, Hidden Environment Variables, Live Swagger API Docs | D4 |
| **S21** | Automated Test Evidence — `pytest` Security & RBAC Suite Output (11/11 Passed) | D5 |

---

## 1. Executive Summary

### 1.1 Project overview
**Coastal Horizon Dockyard** is a secure, multi-user maritime berth operations and dockyard administration web application built for port dispatchers, berth officers, team leads, and dockyard administrators. It enables authorized staff to manage vessel berths (dimensions, draft limits, operational availability, and officer assignments), collaborate inside shared dockyard teams with fine-grained per-member permissions, manage their own profiles and active sessions, and give system administrators centralized user moderation, security telemetry, and audit compliance tools.

**Technology Stack:** React 19 with TypeScript (Vite), FastAPI (Python), PostgreSQL on Supabase (SQLAlchemy ORM), and unified serverless deployment on Vercel.

### 1.2 What was built since the mid assessment
Since the mid-term single-user berth CRUD application, the following production security and administrative subsystems were architected and deployed:

- **JWT authentication with refresh and logout:** Implemented user signup, login, HMAC-SHA256 peppered `bcrypt` password hashing, 15-minute in-memory JWT access tokens, 7-day `HttpOnly`/`Secure` refresh cookies with rotation and database session tracking, active session revocation, profile updates, and validated password changes.
- **Role based access control (roles, ownership, group permissions):** Built a centralized `backend/app/rbac.py` module enforcing database-backed `user` and `admin` roles, private berth ownership isolation, shared dockyard groups with independent `can_create`, `can_update`, and `can_assign` member flags, owner-only group administration, admin self-protection rules, immediate ban rejection, and matching React route guards.
- **Admin dashboard (users, content, activity log, security view, exports):** Delivered the `/admin` Admin Control Center featuring four operational tabs—Overview & Security, Users Management (search, filters, pagination, inspect detail, promote/demote, single and bulk ban/unban, session revocation), Content Moderation (all berths and groups with single/bulk deletion), and filterable Audit Logs—plus filter-respecting CSV exports.
- **Audit logging, brute-force protection, deployment on Vercel:** Added structured `audit_logs` tracking across all security and data mutations (with client IP and user-agent), failed-login counters with temporary account lockout, local-vs-serverless SQLAlchemy pooling (`NullPool` on Vercel), SPA fallback routing in `vercel.json`, and an 11-test automated `pytest` security verification suite.

### 1.3 Live links

*Table 1: Live deployment, source code, API documentation, and demonstration links.*

| Resource | URL |
| :--- | :--- |
| **GitHub Repository (`main`)** | https://github.com/G-Hawk7/Coastal-Horizon-Dockyard |
| **Vercel Frontend (Live App)** | https://coastal-horizon-dockyard-su3j.vercel.app |
| **Vercel Backend API Base** | https://coastal-horizon-dockyard-su3j.vercel.app/api/v1 |
| **Live FastAPI Swagger Docs** | https://coastal-horizon-dockyard-su3j.vercel.app/api/docs |
| **Video Demo** | *Provided in the submitted PDF Report and in the submission form* |

> **Credential Policy:** Per repository security guidelines, no test account user IDs or passwords are stored in this Markdown file. All demo account credentials (2 admins, 3 standard users, and the seeded shared group configuration) are included exclusively in the **Appendix** of the submitted PDF report and the course submission form.

---

## Part A. Product Requirements (PRD)

### A1. Problem Statement
Regional maritime dockyards and coastal shipyards coordinate multiple berths across rotating shifts of dock officers, dispatchers, and operations supervisors. In smaller facilities—and in single-user prototypes without authentication—berth allocations, vessel length and draft capacities, and maintenance schedules are frequently tracked through shared spreadsheets, manual logs, or unprotected internal portals. Without individual user accounts or access boundaries, any staff member can accidentally overwrite another team's berth records, alter maintenance statuses, or delete active schedules without an attributable trail.

This lack of access control creates operational and security risks. Dispatchers who only need to assign officers to shared berths should not be able to delete infrastructure records or remove team members, while supervisors need immediate visibility into repeated failed sign-in attempts, active browser sessions, and suspicious activity. When a staff member leaves or violates dockyard safety protocols, administrators require a reliable way to revoke access across every active session immediately rather than relying on manual credential sharing.

### A2. Users and Roles

*Table 2: System users, roles, responsibilities, and strict prohibitions.*

| Role | Who They Are | Main Tasks | What They Must Never Be Able To Do |
| :--- | :--- | :--- | :--- |
| **Visitor** | Unauthenticated person visiting the web URL. | Register a new standard account (`/signup`) or sign in with existing credentials (`/login`). | View, create, edit, assign, or delete any berth, group, profile, session, or admin endpoint; self-register as an `admin`. |
| **User** | Authenticated dockyard officer or dispatcher (`role = "user"`). | Manage own private berths (CRUD + assign); create dockyard groups; update own profile and password; list and revoke own active sessions. | Read, modify, or delete another user's private berths; access any `/api/v1/admin/*` endpoint or `/admin` UI; revoke another user's sessions. |
| **Group Member** | Standard user added to another user's shared dockyard group. | View shared group berths; perform only explicitly granted actions (`can_create`, `can_update`, `can_assign`) on shared berths. | Perform actions not granted by their permission flags; delete another owner's shared berth; rename, delete, or manage members of the group. |
| **Group Owner** | User who created a `DockyardGroup` (`group.owner_id == user.id`). | Rename or delete the group; add/remove members; toggle per-member `can_create`, `can_update`, and `can_assign` flags; manage all berths in the group. | Manage members of groups owned by someone else; perform system-wide user bans or access admin audit logs. |
| **Admin** | Dockyard system administrator (`role = "admin"`). | View overview & security telemetry; search/inspect/manage users (role changes, single/bulk bans, session revocation); moderate all berths and groups; inspect audit logs and export filtered CSVs. | Change their own system role (self-demotion); ban themselves or ban another admin without demoting them first; rename or manage members of another user's group via non-admin owner endpoints. |

### A3. Goals and Success Measures

*Table 3: Product and security goals with verifiable success measures.*

| Goal ID | Goal | Measurable / Testable Success Measure |
| :--- | :--- | :--- |
| **G-01** | **Strict Data Isolation (Security)** | 100% of unauthorized requests to another user's private berth or to `/api/v1/admin/*` by a standard user return HTTP `403 Forbidden` (verified by automated `pytest` and live DevTools checks). |
| **G-02** | **Short-Lived, Revocable Sessions (Security)** | Access tokens expire within **15 minutes** (`ACCESS_TOKEN_EXPIRE_MINUTES=15`), refresh tokens reside strictly in `HttpOnly`/`Secure` cookies, and banning a user or revoking a session blocks protected API access on the **very next request** (0-second grace window). |
| **G-03** | **Granular Team Collaboration** | A shared group supports 3 independent boolean member flags (`can_create`, `can_update`, `can_assign`), verified by confirming a member with `can_update=true, can_assign=false` can edit a shared berth (`200`) but receives `403` when attempting to assign or delete it. |
| **G-04** | **Complete Admin Oversight & Auditability** | 100% of authentication, role change, ban/unban, moderation deletion, and CSV export actions produce a persisted row in `audit_logs` containing user, IP address, user-agent, and timestamp. |
| **G-05** | **Production Reliability & Performance** | Live Vercel frontend and FastAPI API load with 0 console errors, survive hard reloads (`F5`) on deep links (`/berths`, `/groups`, `/admin`) with HTTP `200`, persist data across restarts in Supabase PostgreSQL, and serve paginated user queries (`page_size <= 100`) under 1 second after warm-up. |

### A4. Scope and Non-Goals

**In Scope:**
- Multi-user authentication: signup, login, HMAC-SHA256 peppered `bcrypt` hashing, JWT access tokens, `HttpOnly` refresh cookies with rotation, silent session restoration, instant logout, session listing/revocation, failed-login lockout, profile editing, and password updates.
- Centralized server-side RBAC (`user` vs. `admin`), private record ownership, shared dockyard groups with per-member `can_create` / `can_update` / `can_assign` flags, owner-only group administration, admin safety rules, and matching React route guards.
- Admin Control Center: overview KPIs, failed-login security dashboard (by IP and account), paginated user management with detail inspection, role changes, single/bulk bans, session revocation, berth/group content moderation (single/bulk delete), filterable audit logs, and filtered CSV exports.
- Core maritime domain: berth lifecycle CRUD (berth number, max length, max draft, operational status) and officer assignment.
- Production deployment on Vercel with Supabase PostgreSQL and automated `pytest` verification.

**Out of Scope (Non-Goals):**
- **Email verification and password-reset emails:** Excluded to avoid external SMTP provider dependencies and deliverability limits during academic grading.
- **Multi-factor authentication (TOTP/SMS) and OAuth2 social login:** Excluded so authentication focuses squarely on first-party JWT, refresh rotation, and server-side RBAC fundamentals.
- **Real-time AIS vessel GPS tracking and WebSocket push notifications:** Excluded because dockyard telemetry hardware integration is outside the scope of a RESTful CRUD + security web course project.
- **Billing, invoicing, and payment gateways:** Not required for internal berth allocation operations.

**Assumptions and Constraints:**
- Modern evergreen desktop/mobile browsers (Chrome, Edge, Firefox) with cookies and JavaScript enabled are assumed.
- Vercel Hobby tier serverless functions are stateless and ephemeral; therefore, SQLAlchemy uses `NullPool` on Vercel (`IS_VERCEL`) and all persistent state lives in remote Supabase PostgreSQL.
- Cross-region latency between local machines and Supabase is mitigated locally via a 5-connection SQLAlchemy pool, while production runs over HTTPS so `Secure` cookies are enforced automatically.

### A5. User Stories

*Table 4: User stories covering Visitor, User, Group Member/Owner, and Admin roles.*

| ID | Role | User Story |
| :--- | :--- | :--- |
| **US-01** | Visitor | As a visitor, I want to register an account with a strong password and sign in securely so that I can access my own dockyard workspace. |
| **US-02** | User | As a user, I want my session to restore silently on page reload and log out immediately when I click Logout so that my workflow is smooth without exposing tokens to `localStorage`. |
| **US-03** | User | As a user, I want to view my active login sessions and revoke unfamiliar ones or change my password so that I can protect my account if a device is left unattended. |
| **US-04** | User | As a dock officer, I want to create, filter, edit, assign, and delete my own private berths so that I can manage vessel capacity without interference from other users. |
| **US-05** | Group Owner | As a group owner, I want to create a shared dockyard team and toggle `Create`, `Update`, and `Assign` permissions individually per member so that each teammate only has the privileges their shift requires. |
| **US-06** | Group Owner | As a group owner, I want exclusive control to rename, delete, or remove members from my group so that non-owner members cannot dismantle my team structure. |
| **US-07** | Group Member | As a group member, I want to view shared berths and perform only the actions granted to me (e.g., editing specs or assigning officers) while being clearly prevented from unauthorized actions so that team boundaries stay enforced. |
| **US-08** | Admin | As an administrator, I want an overview dashboard with 7-day growth metrics and failed-login breakdowns by IP and account so that I can spot brute-force attempts early. |
| **US-09** | Admin | As an administrator, I want to search, filter, inspect, promote/demote, and single- or bulk-ban/unban users (with a mandatory reason) so that compromised or non-compliant accounts are locked out immediately. |
| **US-10** | Admin | As an administrator, I want to moderate all berths and groups across the dockyard, filter the system audit log, and export filtered CSV reports so that I can maintain operational integrity and compliance records. |

---

## Part B. Software Requirements (SRS)

### B1. Introduction
**Purpose:** This Software Requirements Specification defines the verifiable functional requirements, non-functional constraints, role-permission matrices, use cases, acceptance criteria, and requirement traceability for **Coastal Horizon Dockyard**.  
**Intended Readers:** Course instructor (evaluator), software engineers reviewing or extending the codebase, and QA testers validating security controls.

*Definitions:*

| Term | Definition |
| :--- | :--- |
| **JWT (JSON Web Token)** | Compact, URL-safe, cryptographically signed token (RFC 7519) carrying JSON claims (`sub`, `role`, `type`, `iat`, `exp`) for stateless API authentication. |
| **Access Token** | Short-lived JWT (15 minutes) held exclusively in browser JavaScript memory and sent via the `Authorization: Bearer <token>` header. |
| **Refresh Token** | Long-lived cryptographically random token (7 days) stored as a SHA-256 hash in PostgreSQL (`user_sessions`) and transmitted to the browser inside an `HttpOnly`, `Secure` cookie (`chd_refresh_token`). |
| **RBAC (Role-Based Access Control)** | Access-control architecture where permissions are bound to system roles (`user`, `admin`) and checked centrally on the server before resource access. |
| **Role** | Named privilege tier stored in `users.role` (`user` or `admin`). |
| **Permission** | Discrete capability string (e.g., `berth:update`, `admin:manage_users`) or group-membership flag (`can_create`, `can_update`, `can_assign`). |
| **Audit Log** | Append-only database table (`audit_logs`) capturing security-relevant and administrative events with actor identity, action type, target, IP address, user-agent, and UTC timestamp. |

*References:*
- RFC 7519: JSON Web Token (JWT) — https://datatracker.ietf.org/doc/html/rfc7519
- OWASP Application Security Verification Standard (ASVS) — https://owasp.org/www-project-application-security-verification-standard/
- FastAPI Official Documentation — https://fastapi.tiangolo.com/
- SQLAlchemy 2.0 ORM Documentation — https://docs.sqlalchemy.org/

### B2. Functional Requirements

*Table 5: Authentication & Session Requirements (`FR-AUTH`).*

| Req ID | Requirement Statement |
| :--- | :--- |
| **FR-AUTH-01** | The system shall allow visitors to sign up with a unique username, unique email, full name, and strong password (minimum 8 characters including uppercase, lowercase, and a digit), assigning every new account the `user` role. |
| **FR-AUTH-02** | The system shall hash all passwords using HMAC-SHA256 with a server-side environment `PASSWORD_PEPPER` followed by `bcrypt` (12 salt rounds), never storing plaintext passwords. |
| **FR-AUTH-03** | The system shall authenticate users via username or email and password, returning a signed 15-minute JWT access token (`sub`, `role`, `type`, `iat`, `exp`) and setting a 7-day `HttpOnly`, `SameSite=Lax` refresh cookie (`Secure` in production). |
| **FR-AUTH-04** | The system shall validate the JWT signature, payload type, and expiry on every protected endpoint and return HTTP `401 Unauthorized` for missing, expired, invalid, or tampered tokens. |
| **FR-AUTH-05** | The system shall provide `POST /api/v1/auth/refresh` to validate the `HttpOnly` refresh cookie against non-revoked database sessions, rotate the refresh token, issue a new access token, and restore frontend sessions without flashing guest screens. |
| **FR-AUTH-06** | The system shall revoke the server-side refresh session, clear the `chd_refresh_token` cookie, clear client memory state, and record a `LOGOUT` audit event when a user logs out. |
| **FR-AUTH-07** | The system shall allow authenticated users to list their active sessions (IP address, browser user-agent, last used timestamp) and revoke individual sessions via `DELETE /api/v1/auth/sessions/{session_id}`. |
| **FR-AUTH-08** | The system shall track consecutive failed login attempts per account, record failed attempts in `audit_logs`, and temporarily lock accounts (`locked_until`) after repeated invalid password attempts. |
| **FR-AUTH-09** | The system shall allow authenticated users to update their full name/email (`PATCH /api/v1/auth/me`) and change their password (`POST /api/v1/auth/change-password`) after verifying their current password and validating new password strength, logging failed attempts. |

*Table 6: Authorization & RBAC Requirements (`FR-RBAC`).*

| Req ID | Requirement Statement |
| :--- | :--- |
| **FR-RBAC-01** | The system shall store user roles (`user`, `admin`) in PostgreSQL and enforce role and permission checks server-side on every protected endpoint through one centralized `backend/app/rbac.py` module. |
| **FR-RBAC-02** | The system shall restrict private berth read, update, assign, and delete operations to the berth owner (or system admin), returning HTTP `403 Forbidden` when another user attempts access. |
| **FR-RBAC-03** | The system shall enforce granular per-member group permissions (`can_create`, `can_update`, `can_assign`) on shared group berths, allowing read access to all group members and restricting mutations strictly to granted flags while blocking non-owner deletion. |
| **FR-RBAC-04** | The system shall restrict group renaming, group deletion, and member management (add, update permissions, remove) exclusively to the group owner (`ensure_group_owner`). |
| **FR-RBAC-05** | The system shall prevent an administrator from changing their own role, banning themselves, or banning another administrator (`ensure_admin_target_safety`). |
| **FR-RBAC-06** | The system shall verify `users.is_banned` in PostgreSQL on every protected request inside `get_current_user` so banned users are rejected with HTTP `403 Forbidden` on their very next API call. |
| **FR-RBAC-07** | The system shall enforce frontend route guards (`ProtectedRoute`, `AdminRoute`, `GuestOnlyRoute`) and role-aware navigation menus that mirror backend authorization rules, rendering a 403 Access Denied view when non-admins visit `/admin`. |

*Table 7: Admin Dashboard & Audit Requirements (`FR-ADM`).*

| Req ID | Requirement Statement |
| :--- | :--- |
| **FR-ADM-01** | The system shall provide administrators with overview statistics (`GET /api/v1/admin/stats`) including total users, banned users, total berths, total groups, 7-day creation deltas, and 7-day failed logins. |
| **FR-ADM-02** | The system shall provide a paginated, searchable, filterable (by role and active/banned status) user list (`GET /api/v1/admin/users`) and a user detail view (`GET /api/v1/admin/users/{user_id}`) displaying records, groups, sessions, and recent activity. |
| **FR-ADM-03** | The system shall allow administrators to promote/demote user roles, revoke all sessions of a user, and perform single or bulk ban/unban operations requiring a ban reason while skipping protected accounts safely. |
| **FR-ADM-04** | The system shall allow administrators to list, filter, and perform single or bulk deletion of any berth or dockyard group across the system via Content Moderation endpoints. |
| **FR-ADM-05** | The system shall record authentication, berth, group, admin moderation, and CSV export actions in `audit_logs` with user, action, target, IP address, user-agent, and timestamp, exposing search and filter controls to admins. |
| **FR-ADM-06** | The system shall provide an admin security summary (`GET /api/v1/admin/security`) aggregating failed login attempts by IP address, by account identifier, and recent failed events. |
| **FR-ADM-07** | The system shall export filtered users, berths, and audit logs as downloadable CSV files (`GET /api/v1/admin/export/{users|berths|audit-logs}`) respecting active search/filter query parameters and logging each export event. |

*Table 8: Maritime Domain Requirements (`FR-DOMAIN`).*

| Req ID | Requirement Statement |
| :--- | :--- |
| **FR-DOMAIN-01** | The system shall support full CRUD management of maritime berths (`berth_number`, `max_length_meters`, `max_draft_meters`, and `status` in `AVAILABLE`, `OCCUPIED`, `UNDER_MAINTENANCE`) with search, status filtering, and group/private scope filtering. |
| **FR-DOMAIN-02** | The system shall allow authorized users (berth owner, group owner, group member with `can_assign`, or admin) to assign or unassign a dockyard officer to a berth via `PATCH /api/v1/berths/{berth_id}/assign`. |
| **FR-DOMAIN-03** | The system shall allow authenticated users to create, view, update, and delete dockyard groups and manage member lists with granular boolean permissions. |

### B3. Non-Functional Requirements

*Table 9: Non-functional requirements and verification targets.*

| NFR ID | Category | Requirement | Target / Verification |
| :--- | :--- | :--- | :--- |
| **NFR-SEC-01** | Security | All secrets (`DATABASE_URL`, `JWT_SECRET_KEY`, `PASSWORD_PEPPER`) shall be loaded exclusively from environment variables and excluded from Git via `.gitignore`; only `.env.example` is committed. | `git ls-files backend/.env` returns empty; Vercel stores keys as encrypted Secrets. |
| **NFR-SEC-02** | Security | Login failures shall return generic error messages without revealing whether a username/email exists, and unhandled server exceptions shall never expose raw Python stack traces to clients. | Verified on `/api/v1/auth/login` and global FastAPI error responses. |
| **NFR-SEC-03** | Security | CORS shall explicitly allow only configured frontend origins (`FRONTEND_URL` and local dev origin) with `allow_credentials=True` rather than wildcard `*`. | Verified in `backend/app/main.py` and live browser Network headers. |
| **NFR-PERF-01** | Performance | User listings shall enforce server-side pagination (`page_size` default 10, max 100), audit log queries shall cap `limit <= 500`, and local database runs shall reuse a 5-connection SQLAlchemy pool. | Verified via `routers/admin.py` query bounds and `database.py` pooling (< 1s page switches after warm-up). |
| **NFR-USA-01** | Usability | The React interface shall provide responsive desktop/mobile layouts, loading states (`Restoring your dockyard session...`), inline validation errors, empty states, and zero console errors on primary pages. | Verified across `/login`, `/berths`, `/groups`, `/profile`, and `/admin` on Vercel. |
| **NFR-REL-01** | Reliability | All user, session, berth, group, and audit data shall persist in hosted Supabase PostgreSQL across Vercel serverless cold starts and redeployments, using `NullPool` on Vercel to prevent connection exhaustion. | Verified by redeploying on Vercel and confirming records remain intact. |
| **NFR-MNT-01** | Maintainability | All role/permission constants and FastAPI authorization dependencies shall be centralized in `backend/app/rbac.py` and verified by an automated `pytest` test suite. | 11/11 automated tests in `backend/tests/test_security_rbac.py` pass. |

### B4. Roles and Permission Matrix

*Table 10: Endpoint groups against system and workspace roles.*

| Endpoint Group | Visitor | User | Group Member | Group Owner | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `POST /api/v1/auth/signup`, `/login`, `/refresh`, `/logout` | Yes | Yes | Yes | Yes | Yes |
| `GET/PATCH /api/v1/auth/me`, `/change-password`, `/sessions` | No | Own | Own | Own | Own |
| `GET /api/v1/berths` & `GET /api/v1/berths/{id}` | No | Own | Own + Group | Own + Group | Yes (All) |
| `POST /api/v1/berths` (private / shared group) | No | Own | If `can_create` | Own + Group | Yes (All) |
| `PUT/PATCH /api/v1/berths/{id}` | No | Own | If `can_update` | Own + Group | Yes (All) |
| `PATCH /api/v1/berths/{id}/assign` | No | Own | If `can_assign` | Own + Group | Yes (All) |
| `DELETE /api/v1/berths/{id}` | No | Own | No (403) | Own + Group | Yes (All) |
| `GET/POST /api/v1/groups` | No | Own / Create | Read Member Groups | Own + Create | Yes (All) |
| `PATCH/DELETE /api/v1/groups/{id}` & `/members/*` | No | No (403) | No (403) | Own Only | Own Only* |
| `GET/POST/PATCH/DELETE /api/v1/admin/*` | No | No (403) | No (403) | No (403) | Yes |

*\*Note: Under `/api/v1/groups/{id}`, `ensure_group_owner` strictly requires `group.owner_id == user.id`; system admins moderate and delete groups system-wide through `/api/v1/admin/groups`.*

*Table 11: Shared dockyard group granular permissions.*

| Action Inside Shared Group | Member (`can_create`) | Member (`can_update`) | Member (`can_assign`) | Group Owner |
| :--- | :---: | :---: | :---: | :---: |
| View group & shared berths (`GET`) | Yes (all members) | Yes (all members) | Yes (all members) | Yes |
| Create a new berth in the group (`POST /berths`) | **Yes** | No (403) | No (403) | **Yes** |
| Edit berth dimensions / status (`PUT/PATCH /berths/{id}`) | No (403) | **Yes** | No (403) | **Yes** |
| Assign / unassign officer (`PATCH /berths/{id}/assign`) | No (403) | No (403) | **Yes** | **Yes** |
| Delete a shared berth (`DELETE /berths/{id}`) | No (403) | No (403) | No (403) | **Yes** |
| Rename or delete the group (`PATCH/DELETE /groups/{id}`) | No (403) | No (403) | No (403) | **Yes** |
| Add, edit permissions, or remove members (`/groups/{id}/members`) | No (403) | No (403) | No (403) | **Yes** |

*Table 12: System administrator rules, boundaries, and group privileges.*

| Admin Rule Category | Rule Enforced in `backend/app/rbac.py` & `admin_service.py` |
| :--- | :--- |
| **Self-Role Protection** | An admin **cannot** promote or demote themselves (`PATCH /api/v1/admin/users/{self}/role` $\rightarrow$ `403 Forbidden`). |
| **Admin Ban Protection** | An admin **cannot** ban themselves or ban another admin directly (`POST /api/v1/admin/users/{admin}/ban` $\rightarrow$ `403 Forbidden`). Another admin must first be demoted to `user` before banning; bulk ban automatically skips admins/self and reports skipped counts. |
| **Immediate Ban Enforcement** | Banning a user sets `is_banned = True`, stores `ban_reason`, revokes all active `user_sessions`, and blocks any remaining unexpired JWT on the next request (`403`). |
| **Admin Rights Inside Other Users' Groups** | Inside `/api/v1/berths`, admins can read, create, update, assign, and delete any berth for operational oversight. Inside `/api/v1/groups/{id}`, `ensure_group_owner` does **not** grant admins automatic member-management or rename rights over another owner's group; instead, system admins moderate and delete non-compliant groups via `/api/v1/admin/groups`. |

### B5. Use Cases

*Figure 1: Use case diagram showing Visitor, User, Group Owner, Group Member, and Admin interactions.*

~~~mermaid
flowchart LR
    Visitor((Visitor))
    User((User))
    Member((Group Member))
    Owner((Group Owner))
    Admin((Admin))

    subgraph Coastal Horizon Dockyard
        UC1([UC-01: Sign Up / Log In & Refresh])
        UC2([UC-02: Create & Manage Berth])
        UC3([UC-03: Manage Group & Member Permissions])
        UC4([UC-04: Attempt Unauthorized Action -> 403])
        UC5([UC-05: Ban / Unban User & Revoke Sessions])
        UC6([UC-06: Inspect Security Telemetry & Audit Logs])
        UC7([UC-07: Moderate Content & Export CSV])
    end

    Visitor --> UC1
    User --> UC1
    User --> UC2
    User --> UC4
    Member --> UC2
    Member --> UC4
    Owner --> UC3
    Owner --> UC2
    Admin --> UC5
    Admin --> UC6
    Admin --> UC7
~~~

*Table 13: Detailed use case descriptions (UC-01 to UC-06).*

| UC ID & Name | Actor | Preconditions | Main Flow | Alternative / Error Flows | Postconditions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **UC-01: Log In and Silent Refresh** | Visitor / User | Active (non-banned) account exists in `users`. | 1. User submits credentials on `/login`. 2. `POST /api/v1/auth/login` verifies peppered `bcrypt` hash. 3. Server creates `user_sessions` row, sets `chd_refresh_token` `HttpOnly` cookie, and returns 15-min JWT. 4. On page reload (`F5`), `AuthContext` calls `POST /api/v1/auth/refresh` using the cookie to obtain a fresh access token. | Wrong password $\rightarrow$ `401` + increment `failed_login_attempts` + `FAILED_LOGIN` audit log. Repeated failures $\rightarrow$ temporary lockout (`423`/`429`/`403`). Banned account $\rightarrow$ `403`. Revoked/expired refresh cookie $\rightarrow$ `401` and redirect to `/login`. | Authenticated session active in browser memory and `user_sessions`; `LOGIN` recorded in `audit_logs`. |
| **UC-02: Create a Berth Record** | User / Group Member | Logged in with valid JWT. If creating inside a group, must be owner, admin, or have `can_create=true`. | 1. User clicks **+ New Berth** on `/berths`. 2. Submits `berth_number`, `max_length_meters`, `max_draft_meters`, `status`, and optional `group_id`. 3. FastAPI validates Pydantic schema, checks `Permission.BERTH_CREATE` and `ensure_group_create_berth_access`, inserts row into `berths`, and logs `BERTH_CREATE`. | Duplicate `berth_number` $\rightarrow$ `400`/`409`. Invalid numeric values $\rightarrow$ `422`. Member lacks `can_create` $\rightarrow$ `403`. | New berth persisted in Supabase PostgreSQL and visible in `/berths`. |
| **UC-03: Change a Member's Group Permissions** | Group Owner | Logged in as owner of an existing `DockyardGroup`. | 1. Owner opens `/groups` and selects their group. 2. Toggles `can_create`, `can_update`, or `can_assign` for a member and saves. 3. Frontend calls `PATCH /api/v1/groups/{group_id}/members/{member_user_id}`. 4. Backend verifies `ensure_group_owner`, updates `group_members`, and writes audit log. | Non-owner calls endpoint $\rightarrow$ `403 Forbidden`. Unknown group/member $\rightarrow$ `404 Not Found`. | Member's updated permissions take effect immediately on their next berth request. |
| **UC-04: Denied Action by RBAC** | User / Group Member | Logged in as standard user without target permission or admin role. | 1. User attempts to navigate to `/admin`, delete another user's private berth, or assign a shared berth without `can_assign`. 2. Backend dependency (`require_permissions` or `ensure_berth_access`) evaluates rules and rejects the request. 3. Frontend displays 403 Access Denied or inline error toast. | Missing/expired token $\rightarrow$ `401 Unauthorized`. Unauthorized role/ownership/group flag $\rightarrow$ `403 Forbidden`. | No database mutation occurs; protected resource remains untouched. |
| **UC-05: Ban a User** | Admin | Logged in as `admin`; target account is a `user` (not self and not another admin). | 1. Admin opens `/admin` $\rightarrow$ **Users Management**, clicks **Ban** on target user, and enters a mandatory reason. 2. Frontend calls `POST /api/v1/admin/users/{id}/ban`. 3. Backend verifies `Permission.ADMIN_MANAGE_USERS` and `ensure_admin_target_safety`, sets `is_banned=True` and `ban_reason`, revokes all target `user_sessions`, and writes `USER_BAN` audit log. | Target is self or another admin $\rightarrow$ `403 Forbidden`. Empty reason $\rightarrow$ `422 Unprocessable Entity`. | Target user's next API call immediately returns `403` and new logins are blocked until unbanned. |
| **UC-06: Read & Export Audit Logs** | Admin | Logged in as `admin`. | 1. Admin opens `/admin` $\rightarrow$ **Audit Logs**. 2. Applies filters (search text, action type, username, IP address). 3. Frontend calls `GET /api/v1/admin/audit-logs` with query parameters. 4. Admin optionally clicks **Export CSV**, calling `GET /api/v1/admin/export/audit-logs` with identical filters. | Standard user calls endpoint $\rightarrow$ `403 Forbidden`. | Filtered audit trail displayed in UI; CSV download reflects exact filter criteria and records an export audit entry. |

### B6. Acceptance Criteria

*Table 14: Given / When / Then acceptance criteria for critical security and RBAC requirements.*

| AC ID | Linked Req | Given | When | Then |
| :--- | :--- | :--- | :--- | :--- |
| **AC-01** | `FR-AUTH-04` | A user holds a JWT whose `exp` timestamp is in the past. | They send `GET /api/v1/auth/me` with that Bearer token. | The server returns HTTP `401 Unauthorized` with `"Access token has expired."` |
| **AC-02** | `FR-AUTH-04` | A client modifies characters in a valid JWT signature or payload. | They call any protected endpoint with the tampered token. | `PyJWT` signature verification fails and returns HTTP `401 Unauthorized`. |
| **AC-03** | `FR-RBAC-02` | User A owns a private berth (`group_id = NULL`). | User B (standard user) calls `GET` or `DELETE /api/v1/berths/{berth_id}`. | `ensure_berth_access` rejects the request with HTTP `403 Forbidden`. |
| **AC-04** | `FR-RBAC-03` | A group member has `can_update=true` and `can_assign=false`. | They call `PATCH /api/v1/berths/{id}/assign` or `DELETE /api/v1/berths/{id}` on a shared berth. | The server returns HTTP `403 Forbidden` citing missing permission. |
| **AC-05** | `FR-RBAC-06` | A logged-in standard user holds a valid, unexpired JWT. | An admin bans the user, and the user immediately makes a request to `GET /api/v1/auth/me` or `/berths`. | `get_current_user` checks `user.is_banned` in PostgreSQL and returns HTTP `403 Forbidden` with the ban reason. |
| **AC-06** | `FR-RBAC-05` | Admin 1 is signed in and targets Admin 2 (or Admin 1 themselves). | Admin 1 calls `POST /api/v1/admin/users/{admin2}/ban` or `PATCH /api/v1/admin/users/{self}/role`. | `ensure_admin_target_safety` rejects the action with HTTP `403 Forbidden`. |
| **AC-07** | `FR-AUTH-08` | An account receives 5+ consecutive invalid password attempts on `/api/v1/auth/login`. | Another login request is submitted for that account. | `failed_login_attempts` reaches threshold / `locked_until` is set, failed attempts are logged, and further login attempts are rejected. |

### B7. Traceability Matrix

*Table 15: End-to-end traceability linking every functional requirement to implementation, automated test, and screenshot evidence.*

| Req ID | Implementing Endpoint(s) / Screen(s) | Automated Test (`test_security_rbac.py`) | Evidence Screenshot |
| :--- | :--- | :--- | :--- |
| **FR-AUTH-01** | `POST /api/v1/auth/signup`, `SignupPage.tsx` | `test_password_hashing_and_strength_validation` | S1 |
| **FR-AUTH-02** | `backend/app/security.py` (`hash_password`, `_apply_pepper`) | `test_password_hashing_and_strength_validation` | S21 |
| **FR-AUTH-03** | `POST /api/v1/auth/login`, `LoginPage.tsx`, `AuthContext.tsx` | `test_valid_login_sets_httponly_refresh_cookie` | S1, S7, S8 |
| **FR-AUTH-04** | `backend/app/rbac.py` (`get_current_user`), `security.py` | `test_missing_token_returns_401`, `test_expired_token_returns_401`, `test_tampered_token_returns_401` | S7, S21 |
| **FR-AUTH-05** | `POST /api/v1/auth/refresh`, `AuthContext.tsx`, `api/client.ts` | Verified manually on live Vercel URL + `test_valid_login_sets_httponly_refresh_cookie` | S8 |
| **FR-AUTH-06** | `POST /api/v1/auth/logout`, `AuthContext.tsx` | Verified manually on live Vercel URL | S4, S15 |
| **FR-AUTH-07** | `GET /api/v1/auth/sessions`, `DELETE /api/v1/auth/sessions/{id}`, `ProfilePage.tsx` | Verified manually on live Vercel URL | S4 |
| **FR-AUTH-08** | `auth_service.py` (`login_user`), `models.py` (`failed_login_attempts`, `locked_until`) | `test_repeated_failed_logins_trigger_lockout` | S16, S21 |
| **FR-AUTH-09** | `PATCH /api/v1/auth/me`, `POST /api/v1/auth/change-password`, `ProfilePage.tsx` | `test_password_hashing_and_strength_validation` | S3 |
| **FR-RBAC-01** | `backend/app/rbac.py` (`require_roles`, `require_permissions`) | `test_normal_user_blocked_from_admin_endpoints` | S6, S21 |
| **FR-RBAC-02** | `rbac.py` (`ensure_berth_access`), `routers/berths.py` | `test_user_cannot_read_or_delete_another_users_private_berth` | S2, S6, S21 |
| **FR-RBAC-03** | `rbac.py` (`ensure_berth_access`, `ensure_group_create_berth_access`), `GroupsPage.tsx` | `test_group_permission_matrix_enforced` | S5, S6, S21 |
| **FR-RBAC-04** | `rbac.py` (`ensure_group_owner`), `routers/groups.py` | `test_group_permission_matrix_enforced` | S5, S21 |
| **FR-RBAC-05** | `rbac.py` (`ensure_admin_target_safety`), `routers/admin.py` | `test_admin_cannot_change_own_role_or_ban_another_admin` | S11, S21 |
| **FR-RBAC-06** | `rbac.py` (`get_current_user`), `POST /api/v1/admin/users/{id}/ban` | `test_banned_user_rejected_immediately_on_next_request` | S9, S13, S21 |
| **FR-RBAC-07** | `frontend/src/components/RouteGuards.tsx`, `Layout.tsx` | Verified manually on live Vercel URL | S2, S6 |
| **FR-ADM-01** | `GET /api/v1/admin/stats`, `AdminPage.tsx` (Overview tab) | `test_normal_user_blocked_from_admin_endpoints` | S10 |
| **FR-ADM-02** | `GET /api/v1/admin/users`, `GET /api/v1/admin/users/{id}`, `AdminPage.tsx` | Verified manually on live Vercel URL | S11, S12 |
| **FR-ADM-03** | `POST /api/v1/admin/users/{id}/ban`, `/unban`, `/bulk-ban`, `/role`, `/revoke-sessions` | `test_admin_cannot_change_own_role_or_ban_another_admin`, `test_banned_user_rejected_immediately_on_next_request` | S11, S13 |
| **FR-ADM-04** | `GET/POST/DELETE /api/v1/admin/berths*`, `/groups*`, `AdminPage.tsx` | Verified manually on live Vercel URL | S14 |
| **FR-ADM-05** | `GET /api/v1/admin/audit-logs`, `audit_service.py`, `AdminPage.tsx` | Verified manually on live Vercel URL | S15 |
| **FR-ADM-06** | `GET /api/v1/admin/security`, `AdminPage.tsx` (Overview & Security) | `test_repeated_failed_logins_trigger_lockout` | S16 |
| **FR-ADM-07** | `GET /api/v1/admin/export/{users|berths|audit-logs}` | Verified manually on live Vercel URL | S17 |
| **FR-DOMAIN-01** | `routers/berths.py`, `berth_service.py`, `BerthsPage.tsx` | `test_user_cannot_read_or_delete_another_users_private_berth` | S2 |
| **FR-DOMAIN-02** | `PATCH /api/v1/berths/{id}/assign`, `BerthsPage.tsx` | `test_group_permission_matrix_enforced` | S2, S5 |
| **FR-DOMAIN-03** | `routers/groups.py`, `group_service.py`, `GroupsPage.tsx` | `test_group_permission_matrix_enforced` | S5 |

---

## Part C. Technical Design (TDD)

### C1. Technology Stack

*Table 16: Complete technology stack, versions, and rationale.*

| Component | Technology | Version | Reason for Choosing |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React + TypeScript | React 19 / TS 5.x | Component-based SPA architecture with compile-time type safety across API contracts. |
| **Build Tool & Routing** | Vite + React Router | Vite 8.3.5 / React Router | Fast HMR during development, optimized static bundle (`frontend/dist`), and declarative protected/admin route guards. |
| **UI Styling & Icons** | Custom CSS + Lucide React | Lucide React | Lightweight, responsive maritime dashboard UI with zero heavy CSS runtime overhead. |
| **HTTP Client** | Axios | Axios 1.x | Interceptors automatically attach in-memory Bearer tokens and retry once on `401` via `/auth/refresh`. |
| **Backend Framework** | FastAPI + Uvicorn | FastAPI $\ge 0.110.0$ / Uvicorn $\ge 0.28.0$ | High-performance Python ASGI framework with built-in Pydantic validation, dependency injection (`Depends`), and automatic Swagger UI (`/api/docs`). |
| **Database** | PostgreSQL (Supabase) | PostgreSQL 15+ (Hosted) | Managed relational database providing ACID persistence across stateless Vercel serverless invocations. |
| **ORM & Driver** | SQLAlchemy + psycopg2-binary | SQLAlchemy $\ge 2.0.28$ / psycopg2 $\ge 2.9.9$ | Parameterized ORM queries preventing SQL injection, declarative relationships, and configurable pooling (`NullPool` on Vercel). |
| **Password Hashing** | `bcrypt` + Python `hmac`/`hashlib` | `bcrypt >= 4.0.0` | Industry-standard adaptive hashing (12 rounds) paired with HMAC-SHA256 `PASSWORD_PEPPER` pre-hashing. |
| **JWT Library** | PyJWT | `PyJWT >= 2.8.0` | Minimal, actively maintained RFC 7519 implementation for HS256 token signing and verification. |
| **Automated Testing** | `pytest` + `httpx` (`TestClient`) | Latest in `.venv` | Fast in-process integration testing of FastAPI endpoints, JWT rejection, RBAC rules, and PostgreSQL teardown. |
| **Hosting & Deployment** | Vercel | Serverless + Edge CDN | Single-repository CI/CD from GitHub `main` hosting both the static React SPA and the Python FastAPI serverless function (`api/index.py`). |

### C2. System Architecture

*Figure 2: End-to-end system architecture showing request routing, Bearer token headers, `HttpOnly` cookies, PostgreSQL storage, and audit logging.*

~~~mermaid
flowchart LR
    B[Browser / React SPA]
    VF[Vercel Edge CDN<br/>frontend/dist]
    VA[Vercel Python Serverless<br/>api/index.py -> FastAPI]
    RBAC[Central RBAC & Security<br/>rbac.py + security.py]
    DB[(Supabase PostgreSQL<br/>users, sessions, berths, groups)]
    AL[(Supabase PostgreSQL<br/>audit_logs table)]

    B -- "1. HTTPS GET /berths, /admin (SPA Assets)" --> VF
    VF -- "2. Static HTML/JS/CSS (index.html fallback)" --> B
    B -- "3. HTTPS /api/v1/* + Authorization: Bearer JWT<br/>+ Cookie: chd_refresh_token (HttpOnly)" --> VA
    VA -- "4. Validate JWT, Ban Status, Role & Group Flags" --> RBAC
    RBAC -- "5. Parameterized SQLAlchemy Queries" --> DB
    VA -- "6. Structured Audit Events (IP, UA, Action)" --> AL
    VA -- "7. JSON / CSV Response + Set-Cookie" --> B
~~~

**Architecture Flow Explanations:**
- **Arrow 1 (Browser $\rightarrow$ Vercel Edge CDN):** When a user opens any route such as `/berths` or `/admin`, the browser requests the web page over HTTPS from Vercel's edge network. `vercel.json` serves static files from `frontend/dist` and rewrites all non-`/api/*` paths to `/index.html` so React Router handles client-side navigation without 404 errors.
- **Arrow 2 (Vercel Edge CDN $\rightarrow$ Browser):** Vercel returns the compiled React + TypeScript bundle, which boots `AuthProvider` and immediately attempts silent session restoration before rendering protected pages. This prevents any flash of unauthenticated content while checking session validity.
- **Arrow 3 (Browser $\rightarrow$ Vercel FastAPI API):** Axios sends `/api/v1/*` requests to the same origin, which `vercel.json` routes to `api/index.py`. Every protected API call carries the in-memory JWT in the `Authorization: Bearer` header, while auth endpoints automatically receive the `HttpOnly`, `Secure` `chd_refresh_token` cookie from the browser.
- **Arrow 4 (FastAPI $\rightarrow$ RBAC & Security Layer):** Before any service or route handler runs, FastAPI executes dependency injection via `backend/app/rbac.py` and `security.py`. These dependencies verify the JWT signature and expiry, confirm the user is not banned in PostgreSQL, and validate role, ownership, or shared-group permission flags.
- **Arrow 5 (RBAC / Services $\rightarrow$ Supabase PostgreSQL):** Authorized business logic inside `backend/app/services/` reads and mutates normalized tables (`users`, `user_sessions`, `dockyard_groups`, `group_members`, `berths`) via SQLAlchemy. In production on Vercel, `database.py` uses `NullPool` so short-lived serverless instances close connections cleanly without exhausting Supabase's connection pooler.
- **Arrow 6 (FastAPI Services $\rightarrow$ Audit Log Table):** Every security-critical mutation—login, failed login, logout, password change, role change, ban/unban, berth/group moderation, and CSV export—writes a structured record into `audit_logs` via `audit_service.py`. Each entry captures the actor, action name, target ID, client IP (`x-forwarded-for`), browser user-agent, and UTC timestamp.
- **Arrow 7 (Vercel FastAPI $\rightarrow$ Browser):** FastAPI serializes validated Pydantic response models (stripping sensitive columns like `password_hash`) or streams filtered `text/csv` attachments back to the browser. On `/login`, `/signup`, and `/refresh`, the response also sets or rotates the `HttpOnly` refresh cookie via `Set-Cookie`.

### C3. Backend and Frontend Structure

**Backend Folder Tree (`Coastal-Horizon-Dockyard/api` and `backend/`):**

~~~text
api/
└── index.py                  # Vercel ASGI entrypoint mounting backend FastAPI app

backend/
├── app/
│   ├── routers/              # HTTP route definitions & Pydantic request/response wiring
│   │   ├── admin.py          # /api/v1/admin/* (stats, users, moderation, audit, exports)
│   │   ├── auth.py           # /api/v1/auth/* (signup, login, refresh, logout, profile, sessions)
│   │   ├── berths.py         # /api/v1/berths/* (CRUD + officer assignment)
│   │   └── groups.py         # /api/v1/groups/* (group CRUD + member permissions)
│   ├── services/             # Business logic & SQLAlchemy persistence layer
│   │   ├── admin_service.py
│   │   ├── audit_service.py
│   │   ├── auth_service.py
│   │   ├── berth_service.py
│   │   └── group_service.py
│   ├── config.py             # Environment variable loading & defaults
│   ├── database.py           # SQLAlchemy engine (local pool vs Vercel NullPool) & get_db
│   ├── main.py               # FastAPI app instance, CORS configuration, router registration
│   ├── models.py             # Six SQLAlchemy ORM models
│   ├── rbac.py               # Centralized role/permission constants & auth dependencies
│   ├── schemas.py            # Pydantic validation and sanitized response schemas
│   ├── security.py           # Peppered bcrypt hashing, JWT encode/decode, refresh token helpers
│   └── seed.py               # CLI database seeding utility for demo data
├── tests/
│   └── test_security_rbac.py # 11 automated pytest security & RBAC integration tests
└── requirements.txt          # Backend Python dependencies
~~~

**Backend Responsibilities:** Routes (`routers/`) declare thin HTTP endpoints and attach RBAC dependencies; business logic and database queries live inside `services/` (acting as the service + repository layer over SQLAlchemy ORM models in `models.py`); authentication primitives live in `security.py`; centralized role, ownership, group permission, and admin safety rules live exclusively in `rbac.py`; and all administrative telemetry, moderation, and CSV generation live in `routers/admin.py` and `services/admin_service.py`.

**Frontend Folder Tree (`Coastal-Horizon-Dockyard/frontend/`):**

~~~text
frontend/
├── public/                   # Static assets
├── src/
│   ├── api/                  # Axios client (in-memory token + 401 refresh interceptor) & typed modules
│   │   ├── admin.ts
│   │   ├── auth.ts
│   │   ├── berths.ts
│   │   ├── client.ts
│   │   └── groups.ts
│   ├── components/           # Shared UI shell & access guards
│   │   ├── Layout.tsx        # Role-aware top navigation bar & logout trigger
│   │   └── RouteGuards.tsx   # ProtectedRoute, AdminRoute (403 view), GuestOnlyRoute
│   ├── context/
│   │   └── AuthContext.tsx   # Session restoration, login/signup, instant non-blocking logout
│   ├── pages/                # Route-level application views
│   │   ├── AdminPage.tsx     # Four-tab Admin Control Center
│   │   ├── BerthsPage.tsx    # Berth Operations dashboard, filters, CRUD & assign modals
│   │   ├── GroupsPage.tsx    # Shared Dockyard Groups & member permission toggles
│   │   ├── LoginPage.tsx
│   │   ├── ProfilePage.tsx   # Profile editor, password change & active sessions list
│   │   └── SignupPage.tsx
│   ├── types/                # Shared TypeScript interfaces matching Pydantic schemas
│   ├── App.tsx               # React Router route map
│   └── main.tsx              # React root mount
├── package.json
└── vite.config.ts
~~~

### C4. Data Model

*Figure 3: Entity-Relationship (ER) diagram of the six PostgreSQL tables defined in `backend/app/models.py`.*

~~~mermaid
erDiagram
    USERS ||--o{ USER_SESSIONS : "has active/revoked"
    USERS ||--o{ DOCKYARD_GROUPS : "owns (owner_id)"
    USERS ||--o{ GROUP_MEMBERS : "belongs via"
    DOCKYARD_GROUPS ||--o{ GROUP_MEMBERS : "contains"
    USERS ||--o{ BERTHS : "owns (owner_id)"
    USERS ||--o{ BERTHS : "assigned to (assigned_to_id)"
    DOCKYARD_GROUPS ||--o{ BERTHS : "shares (group_id)"
    USERS ||--o{ AUDIT_LOGS : "triggers (user_id)"

    USERS {
        uuid id PK
        varchar username UK
        varchar email UK
        varchar full_name
        varchar password_hash
        varchar role
        boolean is_banned
        text ban_reason
        int failed_login_attempts
        timestamptz locked_until
        timestamptz created_at
        timestamptz updated_at
    }
    USER_SESSIONS {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        varchar ip_address
        varchar user_agent
        boolean is_revoked
        timestamptz expires_at
        timestamptz created_at
        timestamptz last_used_at
    }
    DOCKYARD_GROUPS {
        uuid id PK
        varchar name
        text description
        uuid owner_id FK
        timestamptz created_at
        timestamptz updated_at
    }
    GROUP_MEMBERS {
        uuid id PK
        uuid group_id FK
        uuid user_id FK
        boolean can_create
        boolean can_update
        boolean can_assign
        timestamptz created_at
    }
    BERTHS {
        uuid id PK
        varchar berth_number UK
        numeric max_length_meters
        numeric max_draft_meters
        varchar status
        uuid owner_id FK
        uuid group_id FK
        uuid assigned_to_id FK
        timestamptz created_at
        timestamptz updated_at
    }
    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        varchar username
        varchar action
        varchar target_type
        varchar target_id
        text details
        varchar ip_address
        varchar user_agent
        timestamptz created_at
    }
~~~

*Table 17: `users` table schema.*

| Column | Type | Keys / Constraints | Index |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key (`uuid4`) | PK |
| `username` | `VARCHAR(50)` | `UNIQUE`, `NOT NULL` | Yes |
| `email` | `VARCHAR(255)` | `UNIQUE`, `NOT NULL` | Yes |
| `full_name` | `VARCHAR(120)` | `NOT NULL` | No |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` (peppered bcrypt hash) | No |
| `role` | `VARCHAR(20)` | `NOT NULL`, default `'user'` (`user` \| `admin`) | Yes |
| `is_banned` | `BOOLEAN` | `NOT NULL`, default `false` | Yes |
| `ban_reason` | `TEXT` | Nullable | No |
| `failed_login_attempts` | `INTEGER` | `NOT NULL`, default `0` | No |
| `locked_until` | `TIMESTAMPTZ` | Nullable | No |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | `server_default=NOW()` | No |

*Table 18: `user_sessions` table schema.*

| Column | Type | Keys / Constraints | Index |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key (`uuid4`) | PK |
| `user_id` | `UUID` | FK $\rightarrow$ `users.id` (`ON DELETE CASCADE`), `NOT NULL` | Yes |
| `token_hash` | `VARCHAR(128)` | `UNIQUE`, `NOT NULL` (SHA-256 of refresh token) | Yes |
| `ip_address` / `user_agent` | `VARCHAR(64)` / `VARCHAR(512)` | Nullable | No |
| `is_revoked` | `BOOLEAN` | `NOT NULL`, default `false` | Yes |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | No |
| `created_at` / `last_used_at` | `TIMESTAMPTZ` | `server_default=NOW()` | No |

*Table 19: `dockyard_groups` table schema.*

| Column | Type | Keys / Constraints | Index |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key (`uuid4`) | PK |
| `name` | `VARCHAR(100)` | `NOT NULL` | No |
| `description` | `TEXT` | Nullable | No |
| `owner_id` | `UUID` | FK $\rightarrow$ `users.id` (`ON DELETE CASCADE`), `NOT NULL` | Yes |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | `server_default=NOW()` | No |

*Table 20: `group_members` table schema.*

| Column | Type | Keys / Constraints | Index |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key (`uuid4`) | PK |
| `group_id` | `UUID` | FK $\rightarrow$ `dockyard_groups.id` (`ON DELETE CASCADE`), `NOT NULL` | Yes |
| `user_id` | `UUID` | FK $\rightarrow$ `users.id` (`ON DELETE CASCADE`), `NOT NULL` | Yes |
| `can_create` / `can_update` / `can_assign` | `BOOLEAN` | `NOT NULL`, default `false` | No |
| `created_at` | `TIMESTAMPTZ` | `server_default=NOW()` | No |
| *Constraint* | `UniqueConstraint` | `uq_group_member(group_id, user_id)` prevents duplicate memberships | Unique |

*Table 21: `berths` table schema.*

| Column | Type | Keys / Constraints | Index |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key (`uuid4`) | PK |
| `berth_number` | `VARCHAR(50)` | `UNIQUE`, `NOT NULL` | Yes |
| `max_length_meters` | `NUMERIC(6,2)` | `NOT NULL` | No |
| `max_draft_meters` | `NUMERIC(5,2)` | `NOT NULL` | No |
| `status` | `VARCHAR(30)` | `NOT NULL`, default `'AVAILABLE'` | No |
| `owner_id` | `UUID` | FK $\rightarrow$ `users.id` (`ON DELETE CASCADE`), Nullable | Yes |
| `group_id` | `UUID` | FK $\rightarrow$ `dockyard_groups.id` (`ON DELETE SET NULL`), Nullable | Yes |
| `assigned_to_id` | `UUID` | FK $\rightarrow$ `users.id` (`ON DELETE SET NULL`), Nullable | Yes |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | `server_default=NOW()` | No |

*Table 22: `audit_logs` table schema.*

| Column | Type | Keys / Constraints | Index |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key (`uuid4`) | PK |
| `user_id` | `UUID` | FK $\rightarrow$ `users.id` (`ON DELETE SET NULL`), Nullable | Yes |
| `username` | `VARCHAR(50)` | Nullable (preserved even if user is deleted) | Yes |
| `action` | `VARCHAR(64)` | `NOT NULL` (e.g., `LOGIN`, `FAILED_LOGIN`, `USER_BAN`) | Yes |
| `target_type` / `target_id` | `VARCHAR(50)` / `VARCHAR(100)` | Nullable | No |
| `details` | `TEXT` | Nullable | No |
| `ip_address` / `user_agent` | `VARCHAR(64)` / `VARCHAR(512)` | Nullable | `ip_address` indexed |
| `created_at` | `TIMESTAMPTZ` | `server_default=NOW()` | Yes |

**Security Storage Design:** Roles and ban state live directly on `users` (`role`, `is_banned`, `ban_reason`, `failed_login_attempts`, `locked_until`) so every protected request evaluates live database status. Refresh tokens are never stored in plaintext—only their SHA-256 `token_hash` is persisted in `user_sessions` alongside `is_revoked`, `expires_at`, IP, and browser agent. Group memberships use a join table (`group_members`) with unique `(group_id, user_id)` and explicit boolean permission columns (`can_create`, `can_update`, `can_assign`). Audit records use `ON DELETE SET NULL` on `user_id` while denormalizing `username` so historical audit trails remain intact even if a user record is deleted.

### C5. API Design

**API Version Prefix:** All REST endpoints are mounted under **`/api/v1`**.  
**Standard Error Response Format:** FastAPI returns consistent JSON errors: `{ "detail": "<human-readable message>" }` (or structured Pydantic validation error arrays on `422 Unprocessable Entity`), with no stack traces exposed.

*Table 23: Complete REST API endpoint catalog.*

| Method & Path (`/api/v1/...`) | Auth | Role / Permission | Request Body | Success | Error Statuses |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `POST /auth/signup` | None | Public (assigns `user`) | `UserSignupRequest` | `201` | `400`, `409`, `422` |
| `POST /auth/login` | None | Public | `UserLoginRequest` | `200` | `401`, `403`, `422`, `423`/`429` |
| `POST /auth/refresh` | Cookie | `chd_refresh_token` | None | `200` | `401`, `403` |
| `POST /auth/logout` | Cookie / Opt. Bearer | Active session | None | `200` | `401` |
| `GET /auth/me` | Bearer | Authenticated | None | `200` | `401`, `403` |
| `PATCH /auth/me` | Bearer | Authenticated (Own) | `ProfileUpdateRequest` | `200` | `400`, `401`, `403`, `409`, `422` |
| `POST /auth/change-password` | Bearer | Authenticated (Own) | `PasswordChangeRequest` | `200` | `400`, `401`, `403`, `422` |
| `GET /auth/sessions` | Bearer | Authenticated (Own) | None | `200` | `401`, `403` |
| `DELETE /auth/sessions/{session_id}` | Bearer | Authenticated (Own) | None | `200` | `401`, `403`, `404` |
| `GET /berths` | Bearer | `berth:read` (scoped) | Query: `group_id`, `status`, `search` | `200` | `401`, `403` |
| `GET /berths/{berth_id}` | Bearer | `berth:read` + Owner/Group/Admin | None | `200` | `401`, `403`, `404` |
| `POST /berths` | Bearer | `berth:create` (+ `can_create`) | `BerthCreate` | `201` | `400`, `401`, `403`, `409`, `422` |
| `PUT/PATCH /berths/{berth_id}` | Bearer | `berth:update` (+ `can_update`) | `BerthUpdate` | `200` | `400`, `401`, `403`, `404`, `422` |
| `PATCH /berths/{berth_id}/assign` | Bearer | `berth:assign` (+ `can_assign`) | `BerthAssignRequest` | `200` | `401`, `403`, `404`, `422` |
| `DELETE /berths/{berth_id}` | Bearer | `berth:delete` (Owner/Admin) | None | `200` | `401`, `403`, `404` |
| `GET /groups` & `GET /groups/{id}` | Bearer | `group:read` | None | `200` | `401`, `403`, `404` |
| `POST /groups` | Bearer | `group:create` | `GroupCreateRequest` | `201` | `401`, `403`, `422` |
| `PATCH /groups/{group_id}` | Bearer | `group:manage` (Owner only) | `GroupUpdateRequest` | `200` | `401`, `403`, `404`, `422` |
| `DELETE /groups/{group_id}` | Bearer | `group:manage` (Owner only) | None | `200` | `401`, `403`, `404` |
| `POST /groups/{id}/members` | Bearer | `group:manage` (Owner only) | `GroupMemberAddRequest` | `201` | `400`, `401`, `403`, `404`, `409` |
| `PATCH /groups/{id}/members/{uid}` | Bearer | `group:manage` (Owner only) | `GroupMemberUpdateRequest` | `200` | `401`, `403`, `404`, `422` |
| `DELETE /groups/{id}/members/{uid}` | Bearer | `group:manage` (Owner only) | None | `200` | `401`, `403`, `404` |
| `GET /admin/stats` | Bearer | `admin:stats` | None | `200` | `401`, `403` |
| `GET /admin/security` | Bearer | `admin:view_audit` | None | `200` | `401`, `403` |
| `GET /admin/users` & `GET /admin/users/{id}` | Bearer | `admin:manage_users` | Query: `search`, `role`, `status`, `page`, `page_size` | `200` | `401`, `403`, `404` |
| `POST /admin/users/{id}/ban` & `/unban` | Bearer | `admin:manage_users` + Safety | `AdminBanRequest` (ban) | `200` | `401`, `403`, `404`, `422` |
| `POST /admin/users/bulk-ban` & `/bulk-unban` | Bearer | `admin:manage_users` + Safety | `AdminBulkBanRequest` | `200` | `401`, `403`, `422` |
| `PATCH /admin/users/{id}/role` | Bearer | `admin:manage_users` + Safety | `AdminRoleUpdateRequest` | `200` | `401`, `403`, `404`, `422` |
| `POST /admin/users/{id}/revoke-sessions` | Bearer | `admin:manage_users` | None | `200` | `401`, `403`, `404` |
| `GET/POST/DELETE /admin/berths*` | Bearer | `admin:moderate_content` | Filters / `AdminBulkDeleteRequest` | `200` | `401`, `403`, `404` |
| `GET/POST/DELETE /admin/groups*` | Bearer | `admin:moderate_content` | Filters / `AdminBulkDeleteRequest` | `200` | `401`, `403`, `404` |
| `GET /admin/audit-logs` | Bearer | `admin:view_audit` | Query: `search`, `action`, `username`, `ip_address`, `limit` | `200` | `401`, `403` |
| `GET /admin/export/{users\|berths\|audit-logs}` | Bearer | `admin:export` | Matching filter query params | `200` (CSV) | `401`, `403` |

### C6. JWT Authentication Design

*Figure 4: Sequence diagram of login, protected request, access-token expiry, silent refresh rotation, reuse rejection, and instant logout.*

~~~mermaid
sequenceDiagram
    actor Client as Browser (React + Axios)
    participant API as FastAPI Auth & RBAC
    participant DB as Supabase PostgreSQL

    Note over Client,DB: 1. Login
    Client->>API: POST /api/v1/auth/login (username/email, password)
    API->>DB: Verify peppered bcrypt hash & check not banned/locked
    API->>DB: INSERT user_sessions (SHA-256 token_hash) + audit_logs
    API-->>Client: 200 OK { access_token (15m), user } + Set-Cookie: chd_refresh_token (HttpOnly, Secure, 7d)

    Note over Client,DB: 2. Protected Request
    Client->>API: GET /api/v1/berths (Authorization: Bearer <access_token>)
    API->>DB: Verify JWT sig/exp -> Load User -> Check is_banned == false
    API-->>Client: 200 OK [scoped berths]

    Note over Client,DB: 3. Expiry & Silent Refresh Rotation
    Client->>API: GET /api/v1/berths (expired access_token)
    API-->>Client: 401 Unauthorized ("Access token has expired.")
    Client->>API: POST /api/v1/auth/refresh (Cookie: chd_refresh_token)
    API->>DB: Verify token_hash exists, not revoked, not expired -> Rotate token_hash
    API-->>Client: 200 OK { new access_token } + Set-Cookie: rotated chd_refresh_token
    Client->>API: Retry GET /api/v1/berths (new access_token)
    API-->>Client: 200 OK

    Note over Client,DB: 4. Reuse of Old / Revoked Refresh Token
    Client->>API: POST /api/v1/auth/refresh (old/revoked cookie)
    API->>DB: Hash mismatch or is_revoked == true
    API-->>Client: 401 Unauthorized -> Client clears state & redirects to /login

    Note over Client,DB: 5. Instant Non-Blocking Logout
    Client->>Client: Clear in-memory token & user state immediately -> /login
    Client->>API: POST /api/v1/auth/logout (background + pendingLogoutPromise guard)
    API->>DB: Mark user_sessions.is_revoked = true + audit_logs (LOGOUT)
    API-->>Client: 200 OK + Delete Cookie
~~~

*Table 24: Access token JWT claims (`backend/app/security.py`).*

| Claim | Type | Description |
| :--- | :--- | :--- |
| `sub` | `string` (UUID) | Authenticated user's unique `users.id`. |
| `role` | `string` | User's system role (`"user"` or `"admin"`). |
| `type` | `string` | Fixed literal `"access"` checked on decode to prevent token confusion. |
| `iat` | `integer` | Issued-at UNIX timestamp (UTC). |
| `exp` | `integer` | Expiration UNIX timestamp (`iat + ACCESS_TOKEN_EXPIRE_MINUTES * 60`). |

**Signing, Lifetimes & Browser Storage Trade-offs:**
- **Algorithm & Secret:** Tokens are signed using `HS256` (`JWT_ALGORITHM`) and `JWT_SECRET_KEY` loaded solely from server environment variables.
- **Token Lifetimes:** Access tokens expire in **15 minutes** to shrink the window if a token is ever intercepted; refresh tokens last **7 days** so legitimate staff stay signed in across shifts without repeated credential prompts while remaining revocable in PostgreSQL.
- **Storage & XSS/CSRF Mitigation:** Storing JWTs in `localStorage` exposes them to any XSS script. Therefore, the access token is held strictly in **JavaScript module memory** (`frontend/src/api/client.ts`), disappearing on tab close. The refresh token is stored in an **`HttpOnly`, `Secure` (production), `SameSite=Lax`, `Path=/api`** cookie (`chd_refresh_token`), blocking JavaScript theft (XSS) and mitigating cross-site request forgery (CSRF) alongside strict CORS (`FRONTEND_URL`).
- **Per-Request Server Checks:** On every protected request, `get_current_user` validates (1) `Bearer` scheme, (2) JWT signature and `type == "access"`, (3) `exp` timestamp, (4) user row still exists in PostgreSQL, and (5) `user.is_banned == False`.
- **Frontend `401` Recovery & StrictMode Guard:** On a `401` response, Axios attempts one `/auth/refresh` call; if refresh fails, it clears memory state and redirects to `/login`. On initial page load, `AuthContext.tsx` uses a module-level `initialRestoreStarted` promise guard so React 19 StrictMode's double-mount does not trigger duplicate refresh rotations, and `pendingLogoutPromise` ensures an immediate re-login waits for any in-flight background logout to finish so the new refresh cookie is never cleared.

### C7. RBAC Design

*Figure 5: Ordered server-side authorization flow for a protected request.*

~~~mermaid
flowchart TD
    R[Incoming HTTP Request] --> T[1. Extract & Verify Bearer JWT<br/>security.py -> 401 if invalid/expired]
    T --> U[2. Fetch User from PostgreSQL<br/>401 if missing]
    U --> B[3. Live Ban Check<br/>user.is_banned == True -> 403]
    B --> RP[4. Role & Permission Check<br/>require_roles / require_permissions -> 403]
    RP --> OW[5. Ownership & Group Permission Check<br/>ensure_berth_access / ensure_group_owner -> 403]
    OW --> H[6. Route Service Handler & Audit Log -> 200/201]
~~~

**Roles & Permission Constants (`backend/app/rbac.py`):**
- **Roles:** `ROLE_USER = "user"`, `ROLE_ADMIN = "admin"`.
- **13 Permission Constants:** `berth:create`, `berth:read`, `berth:update`, `berth:delete`, `berth:assign`, `group:create`, `group:read`, `group:manage`, `admin:stats`, `admin:manage_users`, `admin:moderate_content`, `admin:view_audit`, `admin:export`.

**Reusable Dependency Code Excerpt (`backend/app/rbac.py`):**

~~~python
def require_permissions(*required_permissions: str) -> Callable:
    """FastAPI dependency enforcing fine-grained role permissions."""

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        user_perms = ROLE_PERMISSIONS.get(current_user.role, set())
        missing = [p for p in required_permissions if p not in user_perms]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this action.",
            )
        return current_user

    return dependency
~~~

**Ownership Filtering, Extensibility & Special Rules:**
- **Query-Level Ownership Filtering:** In `berth_service.list_berths`, non-admin queries filter directly in SQL by `Berth.owner_id == current_user.id` OR `Berth.group_id.in_(member_or_owned_group_ids)` rather than loading all dockyard rows and filtering afterward. Single-item endpoints additionally enforce `ensure_berth_access(db, current_user, berth, action)`.
- **Adding a New Role or Permission:** Because authorization is centralized in `rbac.py`, adding a new role (e.g., `ROLE_AUDITOR`) or capability requires only defining the constant, adding one entry to `ROLE_PERMISSIONS`, and attaching `Depends(require_permissions(...))` to the target router—no scattered role conditionals across files.
- **Special Rules:** `get_current_user` blocks banned users immediately on their next request; `ensure_admin_target_safety` blocks admins from changing their own role or banning themselves/other admins; `ensure_group_owner` restricts group edits and member controls exclusively to the group creator.

### C8. Admin Dashboard Design

*Figure 6: Admin Control Center tabs and their FastAPI endpoint mappings.*

~~~mermaid
flowchart LR
    AdminUI[/admin — AdminPage.tsx/]
    T1[Tab 1: Overview & Security]
    T2[Tab 2: Users Management]
    T3[Tab 3: Content Moderation]
    T4[Tab 4: Audit Logs]

    AdminUI --> T1
    AdminUI --> T2
    AdminUI --> T3
    AdminUI --> T4

    T1 --> E1["GET /admin/stats<br/>GET /admin/security"]
    T2 --> E2["GET /admin/users, /users/{id}<br/>POST /ban, /unban, /bulk-ban, /revoke-sessions<br/>PATCH /role | GET /export/users"]
    T3 --> E3["GET /admin/berths, /groups<br/>POST /bulk-delete | DELETE /{id}<br/>GET /export/berths"]
    T4 --> E4["GET /admin/audit-logs<br/>GET /export/audit-logs"]
~~~

*Table 25: Admin dashboard tabs, endpoints, filters, actions, and audit events.*

| Admin Tab | Endpoints Called | Filters & Pagination | Actions | Audit Events Written |
| :--- | :--- | :--- | :--- | :--- |
| **Overview & Security** | `GET /admin/stats`, `GET /admin/security` | 7-day rolling telemetry window | Refresh live KPIs, inspect failed logins by IP and account | Read-only (reads `audit_logs`) |
| **Users Management** | `GET /admin/users`, `/users/{id}`; `POST /ban`, `/unban`, `/bulk-ban`, `/bulk-unban`, `/revoke-sessions`; `PATCH /role`; `GET /export/users` | `search` (username/email/name), `role`, `status` (active/banned), `page`, `page_size` | Inspect detail modal, promote/demote, revoke sessions, single/bulk ban & unban with reason, Export CSV | `USER_BAN`, `USER_UNBAN`, `ROLE_CHANGE`, `SESSION_REVOKE`, `ADMIN_EXPORT_USERS` |
| **Content Moderation** | `GET /admin/berths`, `/groups`; `POST /*/bulk-delete`; `DELETE /*/{id}`; `GET /export/berths` | Berths: `search`, `status`, `owner`; Groups: `search`, `owner` | Single or bulk delete berths and dockyard groups, Export Berths CSV | `ADMIN_DELETE_BERTH`, `ADMIN_DELETE_GROUP`, `ADMIN_EXPORT_BERTHS` |
| **Audit Logs** | `GET /admin/audit-logs`, `GET /admin/export/audit-logs` | `search`, `action`, `username`, `ip_address`, `limit` ($\le 500$) | Filter/search historical trail, Export Audit Logs CSV | `ADMIN_EXPORT_AUDIT_LOGS` |

**Bulk Action Reporting & Filter-Respecting Exports:** Bulk endpoints (`bulk-ban`, `bulk-unban`, `bulk-delete`) return structured count dictionaries (`Dict[str, int]` reporting affected and skipped counts) so administrators know immediately if protected admin accounts or nonexistent IDs were skipped. Every CSV export endpoint accepts the exact same filter query parameters as its table view (`search`, `role`, `status`, `owner`, `action`, `username`, `ip_address`) so downloaded spreadsheets match what is currently filtered on screen.

### C9. Security Design and Threats

*Table 26: Threat model, implemented defences, and source code locations.*

| Threat | Implemented Defence | File / Module |
| :--- | :--- | :--- |
| **Password database leak** | Passwords pre-hashed with HMAC-SHA256 using server-only `PASSWORD_PEPPER` (from env) before `bcrypt` (12 random salt rounds). | `backend/app/security.py` |
| **Stolen access token** | Short 15-minute expiry (`exp`), stored strictly in React memory (not `localStorage`), and live `is_banned` check on every request. | `frontend/src/api/client.ts`, `backend/app/security.py`, `rbac.py` |
| **Stolen refresh token** | `HttpOnly`, `Secure` (prod), `SameSite=Lax` cookie (`Path=/api`), SHA-256 hashed in `user_sessions`, rotated on refresh, and revocable per-session or on ban/logout. | `backend/app/routers/auth.py`, `auth_service.py`, `models.py` |
| **Brute-force login** | Tracks `failed_login_attempts` and `locked_until` per account, logs IP/account failures to `audit_logs`, and surfaces hotspots in `/admin` Security View. | `backend/app/services/auth_service.py`, `admin_service.py` |
| **Privilege escalation** | Public `/signup` hardcodes `role="user"` and ignores role fields; admin endpoints require `require_permissions(...)` backed by PostgreSQL; admins cannot self-demote or ban other admins. | `backend/app/schemas.py`, `auth_service.py`, `rbac.py` |
| **Access to another user's record (IDOR)** | SQL list queries scope by `owner_id` / member groups; single-record endpoints call `ensure_berth_access` and `ensure_group_owner` before returning or mutating data. | `backend/app/rbac.py`, `berth_service.py`, `group_service.py` |
| **Cross-Site Scripting (XSS)** | React escapes rendered JSX by default; access token is never written to `localStorage`; refresh token is inaccessible to JS via `HttpOnly`. | `frontend/src/api/client.ts`, `backend/app/routers/auth.py` |
| **Cross-Site Request Forgery (CSRF)** | `SameSite=Lax` on refresh cookie, explicit `Authorization: Bearer` header required on state-changing API calls, and restricted CORS origins. | `backend/app/routers/auth.py`, `backend/app/main.py` |
| **CORS misuse** | `CORSMiddleware` allows explicit `FRONTEND_URL` / local origin instead of wildcard `*` when `allow_credentials=True`. | `backend/app/main.py`, `backend/app/config.py` |
| **Secrets in repository** | `backend/.env` excluded via `.gitignore`; only `.env.example` committed; production secrets stored encrypted in Vercel Environment Variables. | `.gitignore`, `.env.example` |
| **SQL injection** | 100% of queries use parameterized SQLAlchemy ORM expressions (`filter(...)`) rather than raw string interpolation. | `backend/app/services/*.py`, `rbac.py` |
| **Over-posting / mass assignment** | Strict Pydantic request schemas (`UserSignupRequest`, `BerthCreate`, `ProfileUpdateRequest`) whitelist only permitted input fields. | `backend/app/schemas.py` |

### C10. Deployment on Vercel

*Figure 7: Unified Vercel production deployment layout connected to Supabase PostgreSQL.*

~~~mermaid
flowchart TB
    GH[GitHub Repository<br/>main branch] -- "Auto-Deploy on Push/Merge" --> VC[Vercel Project: coastal-horizon-dockyard-su3j]
    subgraph VC [Vercel Production: coastal-horizon-dockyard-su3j.vercel.app]
        BUILD["buildCommand: cd frontend && npm install --legacy-peer-deps && npm run build"]
        DIST[Static SPA: frontend/dist]
        FN[Python Serverless Function: api/index.py -> FastAPI]
        RW["vercel.json Rewrites:<br/>/api/(.*) -> /api/index.py<br/>/((?!api/).*) -> /index.html"]
    end
    FN -- "SQLAlchemy NullPool (SSL)" --> SB[(Supabase PostgreSQL Pooler)]
~~~

**Build Settings, Rewrites & Same-Origin API Discovery:** Both the React frontend and FastAPI backend deploy from one GitHub repository under the single Vercel domain `https://coastal-horizon-dockyard-su3j.vercel.app`. `vercel.json` builds `frontend/dist` with `--legacy-peer-deps` (for React 19 compatibility), routes `/api/(.*)` to `api/index.py` (which adds `backend/` to `sys.path` and exports FastAPI's `app`), and rewrites all non-API paths to `/index.html` so SPA deep links and `F5` refreshes never 404. Because frontend and API share the same origin, Axios calls relative `/api/v1` URLs in production with zero hardcoded `localhost` references and seamless same-site `HttpOnly` cookies.

*Table 27: Environment variables configured in Vercel (names and purposes only; no secret values).*

| Variable Name | Type in Vercel | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | Secret | Supabase PostgreSQL connection pooler URI (`postgresql+psycopg2://...`). |
| `JWT_SECRET_KEY` | Secret | Cryptographic secret key used by `PyJWT` to sign and verify access tokens. |
| `PASSWORD_PEPPER` | Secret | Server-side pepper key used in HMAC-SHA256 before `bcrypt` hashing (matches seeded hashes). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Config | Access JWT lifetime in minutes (`15`). |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Config | Refresh cookie and `user_sessions` lifetime in days (`7`). |
| `FRONTEND_URL` | Config | Deployed frontend origin (`https://coastal-horizon-dockyard-su3j.vercel.app`) for CORS. |

**How to Redeploy:** Pushing or merging a pull request into `main` triggers an automatic Vercel Production deployment. After changing any environment variable in **Vercel $\rightarrow$ Environment Variables**, open **Deployments**, click **`...` $\rightarrow$ Redeploy**, select **Production** with build cache disabled, and wait for the green **Ready** status.

### C11. Testing

**Test Strategy:** Verification combined (1) an automated `pytest` + FastAPI `TestClient` suite (`backend/tests/test_security_rbac.py`) that creates isolated temporary test users, groups, and berths in PostgreSQL and tears them down cleanly after execution, and (2) end-to-end manual verification on the live Vercel deployment using browser DevTools (Network and Application tabs) across normal user, group member, and admin sessions.

**How to Run Automated Tests:**
~~~powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -v
~~~

*Table 28: Automated `pytest` security & RBAC test results (all 11 tests passed — see Screenshot S21).*

| Test Name (`backend/tests/test_security_rbac.py`) | Requirement Checked | Result |
| :--- | :--- | :---: |
| `test_password_hashing_and_strength_validation` | `FR-AUTH-01`, `FR-AUTH-02`, `FR-AUTH-09` | **PASSED** |
| `test_missing_token_returns_401` | `FR-AUTH-04` | **PASSED** |
| `test_expired_token_returns_401` | `FR-AUTH-04` (AC-01) | **PASSED** |
| `test_tampered_token_returns_401` | `FR-AUTH-04` (AC-02) | **PASSED** |
| `test_valid_login_sets_httponly_refresh_cookie` | `FR-AUTH-03`, `FR-AUTH-05` | **PASSED** |
| `test_user_cannot_read_or_delete_another_users_private_berth` | `FR-RBAC-02` (AC-03) | **PASSED** |
| `test_group_permission_matrix_enforced` | `FR-RBAC-03`, `FR-RBAC-04`, `FR-DOMAIN-02` (AC-04) | **PASSED** |
| `test_normal_user_blocked_from_admin_endpoints` | `FR-RBAC-01`, `FR-ADM-01` | **PASSED** |
| `test_admin_cannot_change_own_role_or_ban_another_admin` | `FR-RBAC-05`, `FR-ADM-03` (AC-06) | **PASSED** |
| `test_banned_user_rejected_immediately_on_next_request` | `FR-RBAC-06`, `FR-ADM-03` (AC-05) | **PASSED** |
| `test_repeated_failed_logins_trigger_lockout` | `FR-AUTH-08`, `FR-ADM-06` (AC-07) | **PASSED** |

---

## Part D. Evidence: Screenshots of the Running Application

>All 21 screenshots (`S1`–`S21`) were captured on the live production Vercel deployment (`https://coastal-horizon-dockyard-su3j.vercel.app`) with the address bar and logged-in user visible and sensitive tokens/passwords masked. The full embedded images are included in the submitted **PDF Report** under the corresponding numbered captions below.

### D1. User Side
- **S1 (`FR-AUTH-01`, `FR-AUTH-03`):** Live signup/login page on Vercel displaying client/server password-strength validation error for a weak password.
- **S2 (`FR-DOMAIN-01`, `FR-RBAC-02`, `FR-RBAC-07`):** Live Berth Operations dashboard (`/berths`) for a signed-in standard user displaying only that user's private berths and accessible shared-group berths, with the Admin menu hidden.
- **S3 (`FR-AUTH-09`):** Live Profile page (`/profile`) and Change Password form showing rejection when an incorrect current password is submitted.
- **S4 (`FR-AUTH-06`, `FR-AUTH-07`):** Active Sessions list on `/profile` displaying device IP, user-agent, last-used timestamp, and the per-session **Revoke** action.
- **S5 (`FR-RBAC-03`, `FR-RBAC-04`, `FR-DOMAIN-03`):** Live Dockyard Groups page (`/groups`) displaying the shared team, owner, members, and per-member `Create`, `Update`, and `Assign` permission flags.
- **S6 (`FR-RBAC-01`, `FR-RBAC-03`, `FR-RBAC-07`):** Action denied by RBAC showing the in-app **403 — Access Denied** screen / error message alongside the matching HTTP `403` response in the browser DevTools Network tab.

### D2. Security Behaviour
- **S7 (`FR-AUTH-03`, `FR-AUTH-04`, AC-01):** Browser DevTools Network tab showing the `Authorization: Bearer <masked>` request header and an expired JWT rejected by the live API with HTTP `401 Unauthorized` (`"Access token has expired."`).
- **S8 (`FR-AUTH-03`, `FR-AUTH-05`):** Browser DevTools Network tab showing `POST /api/v1/auth/refresh` returning HTTP `200` with a new access token (masked) alongside the Application $\rightarrow$ Cookies tab confirming `chd_refresh_token` has `HttpOnly` and `Secure` flags enabled.
- **S9 (`FR-RBAC-06`, AC-05):** Live demonstration of an already-logged-in user being rejected on their very next API call with HTTP `403 Forbidden` and the ban reason immediately after being banned by an admin.

### D3. Admin Dashboard
- **S10 (`FR-ADM-01`):** Admin Control Center (`/admin`) **Overview & Security** tab displaying live KPI cards (total users, banned count, total berths, dockyard groups, 7-day deltas, and 7-day failed logins).
- **S11 (`FR-ADM-02`, `FR-RBAC-05`):** **Users Management** tab displaying search input, role/status filters, pagination controls, and disabled self-demote/admin-ban safety locks.
- **S12 (`FR-ADM-02`):** **User Detail (Inspect)** view showing a selected user's berths, group memberships, active sessions, and recent activity entries.
- **S13 (`FR-ADM-03`, `FR-RBAC-06`):** Admin **Ban** dialog with a mandatory ban reason entered and the resulting **Banned** status badge updated in the Users table.
- **S14 (`FR-ADM-04`):** **Content Moderation** tab showing system-wide berths and groups with filter controls and bulk selection/deletion action.
- **S15 (`FR-ADM-05`):** **Audit Logs** tab with filters applied, showing the live events (`LOGIN`, `FAILED_LOGIN`, `USER_BAN`, `USER_UNBAN`, `LOGOUT`, exports) recorded with IP address, browser agent, and timestamp.
- **S16 (`FR-ADM-06`, `FR-AUTH-08`):** **Overview & Security** view showing live **Failed Logins by IP**, **Failed Logins by Account**, and **Recent Failed Login Events** tables.
- **S17 (`FR-ADM-07`):** Filtered CSV export downloaded from `/api/v1/admin/export/*` and opened to confirm column headers and filter-matched rows.

### D4. Deployment
- **S18 (`NFR-REL-01`):** Vercel project overview showing `coastal-horizon-dockyard-su3j.vercel.app` deployed from `main` with green **Ready** status.
- **S19 (`NFR-SEC-01`):** Vercel Environment Variables configuration showing all 6 required variable names (`DATABASE_URL`, `JWT_SECRET_KEY`, `PASSWORD_PEPPER`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `FRONTEND_URL`) with secret values hidden.
- **S20 (`FR-DOMAIN-01`):** Live FastAPI Swagger UI loaded at `https://coastal-horizon-dockyard-su3j.vercel.app/api/docs`.

### D5. Tests
- **S21 (`NFR-MNT-01`, Section C11):** Terminal output of `.\.venv\Scripts\python.exe -m pytest -v` showing **11 passed** across JWT expiry/tampering, password hashing, ownership isolation, shared-group permission matrix, admin guardrails, immediate ban rejection, and brute-force lockout.

---

## Part E. Project Management and Conclusion

### E1. How to Run and Test

**Prerequisites:** Python 3.11+, Node.js 18+, npm, Git, and a PostgreSQL database (e.g., Supabase).

**1. Cloning the repository and configure environment variables:**
~~~powershell
git clone https://github.com/G-Hawk7/Coastal-Horizon-Dockyard.git
cd Coastal-Horizon-Dockyard
~~~
Copy `.env.example` to `backend/.env` and supply your own local values:
~~~text
DATABASE_URL=postgresql://user:password@host:6543/postgres
JWT_SECRET_KEY=replace-with-strong-random-secret
PASSWORD_PEPPER=replace-with-strong-random-pepper
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
FRONTEND_URL=http://localhost:5173
~~~

**2. Run the FastAPI backend:**
~~~powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
~~~

*(Optional) Seed sample users, berths, and a mixed-permission group:*
~~~powershell
.\.venv\Scripts\python.exe -m app.seed --password "YourDemoPassword1!"
~~~

**3. Run the React + TypeScript frontend (in a second terminal):**
~~~powershell
cd frontend
npm install --legacy-peer-deps
npm run dev
~~~
Open `http://localhost:5173` (API docs at `http://localhost:8000/api/docs`).

**4. Run automated security & RBAC tests:**
~~~powershell
cd backend
.\.venv\Scripts\python.exe -m pip install pytest httpx
.\.venv\Scripts\python.exe -m pytest -v
~~~

**Logging In With Test Accounts:** The live deployment is pre-seeded with **2 `admin` accounts**, **3 standard `user` accounts**, and **1 shared dockyard group** configured with mixed permissions (an owner, a Create+Update member, and an Assign-only member). To keep credentials out of GitHub, all demo user IDs and passwords are provided strictly in the **Appendix of the submitted PDF report** and the course submission form.

### E2. GitHub Work

All code commits, feature branches, issues, and pull requests in the repository were authored solely by **Saif Hossain Shihab** (`G-Hawk7`). Development progressed iteratively across three milestones: (1) Initial requirements and design documentation in October 2026, (2) Mid-term full-stack berth CRUD module and Vercel deployment in late October / early November 2026, and (3) final-project JWT authentication, centralized RBAC, shared groups, Admin Control Center, pooling optimization, automated `pytest` suite, and final documentation in November 2026.

*Table 29: GitHub issues and pull requests delivered across the project lifecycle.*

| Issue | Pull Request | Delivered Scope |
| :--- | :--- | :--- |
| [#1 — docs: Add PRD, SRS, and TDD project documentation](https://github.com/G-Hawk7/Coastal-Horizon-Dockyard/issues/1) | [#2](https://github.com/G-Hawk7/Coastal-Horizon-Dockyard/pull/2) & [#3](https://github.com/G-Hawk7/Coastal-Horizon-Dockyard/pull/3) | Initial PRD, SRS, and TDD documents plus subsequent completion of missing architecture/requirement sections (merged Oct 13 & Oct 29, 2026). |
| [#4 — feature: Berth Management CRUD operations](https://github.com/G-Hawk7/Coastal-Horizon-Dockyard/issues/4) | [#5 — feat: Complete full-stack Berth management CRUD module](https://github.com/G-Hawk7/Coastal-Horizon-Dockyard/pull/5) | Complete mid-term React + FastAPI + Supabase Berth CRUD dashboard, Vercel API docs exposure, and initial production deployment. |
| [#6 — Refactor architecture and implement JWT Authentication & Session Management](https://github.com/G-Hawk7/Coastal-Horizon-Dockyard/issues/6) | [#7 — feat: Implemented JWT auth, RBAC, shared groups, and admin dashboard (#6)](https://github.com/G-Hawk7/Coastal-Horizon-Dockyard/pull/7) | Full JWT + `HttpOnly` refresh cookie auth, peppered `bcrypt` hashing, centralized `rbac.py`, shared dockyard groups with granular flags, 4-tab Admin Control Center, audit logs, CSV exports, local/Vercel DB pooling, instant logout, and SPA routing in `vercel.json` (merged Nov 25, 2026). |
| Direct `main` finalization commits | Final Docs & Tests | Updated root `README.md` (with zero-password demo account guide), added 11-test `backend/tests/test_security_rbac.py`, and committed `docs/FINAL_REPORT.md` (Nov 25–28, 2026). |

### E3. Limitations
- **Database-backed per-request ban check adds a read query:** Checking `users.is_banned` on every protected request ensures instant lockout after a ban, at the cost of one primary-key lookup per API call instead of pure stateless JWT verification.
- **Account-based lockout without distributed IP rate limiting:** Brute-force protection tracks failed attempts per account in PostgreSQL (`failed_login_attempts`, `locked_until`) and surfaces IP hotspots in the admin security view, but does not include an edge/Redis IP rate limiter against credential stuffing across many accounts.
- **No automated email delivery for password recovery:** If a standard user forgets their password, they cannot self-reset via email; an administrator or database reset is required.
- **No frontend unit/E2E browser test suite:** Automated testing covers 11 backend API security/RBAC rules via `pytest`, while React UI flows (route guards, modals, CSV download triggers) were verified manually on the live Vercel deployment.
- **CSV export runs in memory:** Admin CSV exports work smoothly for dockyard-scale datasets, but very large multi-million-row audit tables would require streaming pagination.

### E4. Future Work
1. **Redis / Edge IP Rate Limiting:** Add sliding-window IP throttling on `/auth/login` and `/auth/signup` to block distributed credential-stuffing attacks before hitting PostgreSQL.
2. **Transactional Email Verification & Password Reset:** Integrate an email provider (e.g., Resend) with single-use expiring reset tokens for self-service account recovery.
3. **Refresh-Token Reuse Family Revocation:** Automatically revoke all active sessions for a user if a previously rotated refresh token is replayed, limiting damage from cookie theft.
4. **Playwright End-to-End Frontend Tests:** Automate live browser verification of React route guards, silent refresh on reload, and admin bulk actions in CI.
5. **Berth Scheduling Calendar & Conflict Detection:** Extend the maritime domain with time-slotted vessel arrival/departure windows and automatic length/draft conflict validation.

### E5. Sources, Libraries and Tools

*Table 30: Libraries, official documentation, tools, and transparent AI assistance disclosure.*

| Resource / Tool | Version / Link | Purpose |
| :--- | :--- | :--- |
| **React & TypeScript** | React 19 / TS 5.x (https://react.dev) | Frontend SPA UI and strict API type safety. |
| **Vite & React Router** | Vite 8.3.5 (https://vite.dev) | Frontend bundling and client-side protected routing. |
| **Axios** | https://axios-http.com | HTTP client with Bearer header and 401 refresh interceptors. |
| **FastAPI & Pydantic** | FastAPI $\ge 0.110.0$ / Pydantic $\ge 2.6.4$ | REST API framework, dependency injection, schema validation, OpenAPI docs. |
| **SQLAlchemy & psycopg2-binary** | SQLAlchemy $\ge 2.0.28$ | ORM modeling, parameterized queries, local pooling & Vercel `NullPool`. |
| **PyJWT & bcrypt** | PyJWT $\ge 2.8.0$ / bcrypt $\ge 4.0.0$ | RFC 7519 JWT signing/verification and salted + peppered password hashing. |
| **pytest & httpx** | Python `.venv` | Automated backend security & RBAC integration test runner. |
| **Supabase & Vercel** | https://supabase.com / https://vercel.com | Managed PostgreSQL database and unified serverless production hosting. |
| **GitHub & GitHub Desktop** | https://github.com | Feature-branch version control, issue tracking, and Pull Requests. |
| **Google Gemini (AI Assistant)** | Gemini Web | Used as a development collaborator for debugging SQLAlchemy pooling latency, refining `vercel.json` SPA rewrites, structuring `pytest` test fixtures, and organizing documentation checklists. Every code change, RBAC rule, environment configuration, live Vercel test, and `pytest` execution was verified, adapted, and validated directly by the author. |