# Software Requirements Specification (SRS)
## Coastal Horizon: Dockyard & Berth Management System

### 1. Functional Requirements (FRs)

#### 1. Authentication & Access Control
- **FR-1.1:** System shall authenticate users via OAuth2 Bearer tokens with encrypted JWTs.
- **FR-1.2:** System shall enforce Role-Based Access Control (RBAC) across endpoints based on assigned roles (`Admin`, `Port Officer`, `Ship Agent`).
- **FR-1.3:** Admin shall have exclusive permissions to modify user roles and activate/deactivate accounts.

#### 2. Vessel Registry
- **FR-2.1:** Ship Agents shall be able to register new vessel profiles with Name, IMO Number, Vessel Type, Length (meters), and Draft Depth (meters).
- **FR-2.2:** System shall enforce unique IMO numbers globally across all registered vessels.
- **FR-2.3:** Ship Agents can view and edit only vessels belonging to their account; Port Officers and Admins can view all vessels.

#### 3. Berth Management & Allocation
- **FR-3.1:** Admin shall create and manage berths, specifying Berth Number, Maximum Length Capacity, and Maximum Draft Depth.
- **FR-3.2:** Ship Agents shall submit docking requests specifying target Vessel ID, Expected Arrival, and Expected Departure.
- **FR-3.3:** The allocation engine must reject assigning a berth if the vessel length or draft exceeds berth capacity.
- **FR-3.4:** The allocation engine must reject assigning a berth if another vessel is already allocated to the same berth during the requested time window.

#### 4. Operational Turnaround & Maintenance
- **FR-4.1:** Port Officers shall transition allocation status through valid states: `APPROVED` $\rightarrow$ `DOCKED` $\rightarrow$ `UNDER_MAINTENANCE` $\rightarrow$ `DEPARTED`.
- **FR-4.2:** Port Officers shall log maintenance inspection reports with description, issue severity, and clearance status.
- **FR-4.3:** System shall prevent marking a vessel as `DEPARTED` until all active maintenance items are marked as cleared.

---

### 2. RBAC Permission Matrix

| Resource / Scope | Admin | Port Operations Officer | Ship Agent |
| :--- | :---: | :---: | :---: |
| `auth:user:manage` | Read / Write | None | None |
| `berth:manage` | Read / Write | Read | Read |
| `berth:allocate` | Read / Write | Read / Write | None |
| `vessel:read` | All | All | Own Only |
| `vessel:create` | Yes | Yes | Yes |
| `vessel:update` | Yes | Yes | Own Only |
| `docking:request` | Read / Write | Read | Create (Own) |
| `docking:status_update` | Yes | Yes | None |
| `maintenance:log` | Read / Write | Read / Write | Read (Own) |

---

### 3. Non-Functional Requirements (NFRs)
- **NFR-1 (Security):** Passwords hashed using bcrypt or Argon2id. Tokens expire after 60 minutes with separate refresh tokens.
- **NFR-2 (Performance):** REST API endpoints must respond within 200 ms under typical academic demonstration loads.
- **NFR-3 (Integrity):** Database transactions must ensure ACID compliance for berth slot bookings to avoid race conditions.
- **NFR-4 (Compatibility):** Web interface must be responsive across standard modern browsers (Chrome, Edge, Firefox) using React 18+ and TypeScript.