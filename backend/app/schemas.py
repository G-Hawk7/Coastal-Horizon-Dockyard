from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

BerthStatus = Literal["AVAILABLE", "OCCUPIED", "UNDER_MAINTENANCE"]
UserRole = Literal["user", "admin"]


# ---------------- Auth & User Schemas ----------------

class UserSignupRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)


class UserLoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=255)  # accepts username or email
    password: str = Field(..., min_length=1, max_length=128)


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=120)
    email: Optional[EmailStr] = None


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str
    email: str
    full_name: str
    role: str
    is_banned: bool
    ban_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    is_revoked: bool
    expires_at: datetime
    created_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    is_current: bool = False


class MessageResponse(BaseModel):
    message: str


# ---------------- Berth Schemas ----------------

class BerthCreate(BaseModel):
    berth_number: str = Field(..., min_length=1, max_length=50)
    max_length_meters: float = Field(..., gt=0, le=9999.99)
    max_draft_meters: float = Field(..., gt=0, le=999.99)
    status: BerthStatus = "AVAILABLE"
    group_id: Optional[UUID] = None
    assigned_to_id: Optional[UUID] = None


class BerthUpdate(BaseModel):
    berth_number: Optional[str] = Field(None, min_length=1, max_length=50)
    max_length_meters: Optional[float] = Field(None, gt=0, le=9999.99)
    max_draft_meters: Optional[float] = Field(None, gt=0, le=999.99)
    status: Optional[BerthStatus] = None


class BerthAssignRequest(BaseModel):
    assigned_to_id: Optional[UUID] = None


class BerthResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    berth_number: str
    max_length_meters: float
    max_draft_meters: float
    status: str
    owner_id: Optional[UUID] = None
    owner_username: Optional[str] = None
    group_id: Optional[UUID] = None
    group_name: Optional[str] = None
    assigned_to_id: Optional[UUID] = None
    assigned_to_username: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------------- Dockyard Group Schemas ----------------

class GroupCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class GroupUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class GroupMemberAddRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=255)  # username or email
    can_create: bool = False
    can_update: bool = False
    can_assign: bool = False


class GroupMemberUpdateRequest(BaseModel):
    can_create: Optional[bool] = None
    can_update: Optional[bool] = None
    can_assign: Optional[bool] = None


class GroupMemberResponse(BaseModel):
    id: UUID
    user_id: UUID
    username: str
    full_name: str
    email: str
    can_create: bool
    can_update: bool
    can_assign: bool
    created_at: Optional[datetime] = None


class GroupResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    owner_id: UUID
    owner_username: str
    member_count: int = 0
    members: List[GroupMemberResponse] = []
    my_permissions: dict = {}
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------------- Admin & Audit Schemas ----------------

class AdminBanRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


class AdminBulkBanRequest(BaseModel):
    user_ids: List[UUID] = Field(..., min_length=1)
    reason: Optional[str] = Field(None, max_length=500)


class AdminBulkDeleteRequest(BaseModel):
    ids: List[UUID] = Field(..., min_length=1)


class AdminRoleUpdateRequest(BaseModel):
    role: UserRole


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: Optional[UUID] = None
    username: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: Optional[datetime] = None


class AdminOverviewStats(BaseModel):
    total_users: int
    banned_users: int
    total_berths: int
    total_groups: int
    new_users_7d: int
    new_berths_7d: int
    new_groups_7d: int
    failed_logins_7d: int


class PaginatedUsersResponse(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    page_size: int


class AdminUserDetailResponse(BaseModel):
    user: UserResponse
    berths: List[BerthResponse]
    groups: List[GroupResponse]
    sessions: List[SessionResponse]
    recent_activity: List[AuditLogResponse]


class SecurityFailedLoginItem(BaseModel):
    key: str
    count: int
    last_attempt: Optional[datetime] = None


class AdminSecuritySummary(BaseModel):
    failed_by_ip: List[SecurityFailedLoginItem]
    failed_by_account: List[SecurityFailedLoginItem]
    recent_failed_logs: List[AuditLogResponse]