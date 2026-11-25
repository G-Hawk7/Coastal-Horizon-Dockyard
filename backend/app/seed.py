import argparse
import sys

from app.database import Base, SessionLocal, engine
from app.models import Berth, DockyardGroup, GroupMember, User
from app.rbac import ROLE_ADMIN, ROLE_USER
from app.security import hash_password, validate_password_strength


def get_or_create_user(
    db,
    username: str,
    email: str,
    full_name: str,
    role: str,
    password: str,
    reset_password: bool = False,
) -> User:
    user = db.query(User).filter(User.username == username).first()
    if user:
        if reset_password:
            user.password_hash = hash_password(password)
            user.full_name = full_name
            user.role = role
            user.is_banned = False
            user.ban_reason = None
            user.failed_login_attempts = 0
            user.locked_until = None
            db.commit()
            db.refresh(user)
        return user

    user = User(
        username=username,
        email=email,
        full_name=full_name,
        password_hash=hash_password(password),
        role=role,
        is_banned=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_or_create_group(db, name: str, description: str, owner: User) -> DockyardGroup:
    group = (
        db.query(DockyardGroup)
        .filter(DockyardGroup.name == name, DockyardGroup.owner_id == owner.id)
        .first()
    )
    if group:
        return group

    group = DockyardGroup(
        name=name,
        description=description,
        owner_id=owner.id,
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


def upsert_group_member(
    db,
    group: DockyardGroup,
    user: User,
    can_create: bool,
    can_update: bool,
    can_assign: bool,
) -> None:
    member = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group.id, GroupMember.user_id == user.id)
        .first()
    )
    if member:
        member.can_create = can_create
        member.can_update = can_update
        member.can_assign = can_assign
    else:
        member = GroupMember(
            group_id=group.id,
            user_id=user.id,
            can_create=can_create,
            can_update=can_update,
            can_assign=can_assign,
        )
        db.add(member)
    db.commit()


def get_or_create_berth(
    db,
    berth_number: str,
    max_length_meters: float,
    max_draft_meters: float,
    status: str,
    owner: User,
    group: DockyardGroup | None = None,
    assigned_to: User | None = None,
) -> Berth:
    berth = db.query(Berth).filter(Berth.berth_number == berth_number).first()
    if berth:
        return berth

    berth = Berth(
        berth_number=berth_number,
        max_length_meters=max_length_meters,
        max_draft_meters=max_draft_meters,
        status=status,
        owner_id=owner.id,
        group_id=group.id if group else None,
        assigned_to_id=assigned_to.id if assigned_to else None,
    )
    db.add(berth)
    db.commit()
    db.refresh(berth)
    return berth


def seed_database(password: str, reset_passwords: bool = False) -> None:
    strength_err = validate_password_strength(password)
    if strength_err:
        print(f"ERROR: Demo password is too weak -> {strength_err}")
        sys.exit(1)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Two Admin Accounts
        admin_xavier = get_or_create_user(
            db,
            username="admin_xavier",
            email="charles.xavier@coastalhorizon.demo",
            full_name="Harbor Master Charles Xavier",
            role=ROLE_ADMIN,
            password=password,
            reset_password=reset_passwords,
        )
        admin_white = get_or_create_user(
            db,
            username="admin_white",
            email="walter.white@coastalhorizon.demo",
            full_name="Operations Director Walter White",
            role=ROLE_ADMIN,
            password=password,
            reset_password=reset_passwords,
        )

        # 2. Three Normal User Accounts
        captain_rogers = get_or_create_user(
            db,
            username="captain_rogers",
            email="steve.rogers@coastalhorizon.demo",
            full_name="Captain Steve Rogers",
            role=ROLE_USER,
            password=password,
            reset_password=reset_passwords,
        )
        officer_redfield = get_or_create_user(
            db,
            username="officer_redfield",
            email="chris.redfield@coastalhorizon.demo",
            full_name="Dock Officer Chris Redfield",
            role=ROLE_USER,
            password=password,
            reset_password=reset_passwords,
        )
        dispatcher_robertson = get_or_create_user(
            db,
            username="dispatcher_robertson",
            email="robert.robertson@coastalhorizon.demo",
            full_name="Berth Dispatcher Robert Robertson",
            role=ROLE_USER,
            password=password,
            reset_password=reset_passwords,
        )

        # Attach any older unowned berths from mid-term to captain_rogers
        unowned_count = (
            db.query(Berth)
            .filter(Berth.owner_id.is_(None))
            .update({"owner_id": captain_rogers.id})
        )
        db.commit()

        # 3. Shared Group with Mixed Permissions
        alpha_group = get_or_create_group(
            db,
            name="Bay Sector Alpha Team",
            description="Shared dockyard operations team managing Bay Sector Alpha berths.",
            owner=captain_rogers,
        )
        # officer_redfield: can create & update, cannot assign
        upsert_group_member(
            db, alpha_group, officer_redfield, can_create=True, can_update=True, can_assign=False
        )
        # dispatcher_robertson: can assign only, cannot create or update
        upsert_group_member(
            db, alpha_group, dispatcher_robertson, can_create=False, can_update=False, can_assign=True
        )

        # 4. Sample Private & Shared Berths
        get_or_create_berth(
            db,
            "ALPHA-01",
            240.50,
            12.80,
            "AVAILABLE",
            owner=captain_rogers,
            group=alpha_group,
            assigned_to=officer_redfield,
        )
        get_or_create_berth(
            db,
            "ALPHA-02",
            195.00,
            10.40,
            "OCCUPIED",
            owner=captain_rogers,
            group=alpha_group,
            assigned_to=dispatcher_robertson,
        )
        get_or_create_berth(
            db, "PRIVATE-ROGERS-01", 150.00, 8.50, "AVAILABLE", owner=captain_rogers
        )
        get_or_create_berth(
            db, "PRIVATE-REDFIELD-01", 175.25, 9.20, "UNDER_MAINTENANCE", owner=officer_redfield
        )
        get_or_create_berth(
            db, "PRIVATE-ROBERTSON-01", 210.00, 11.00, "AVAILABLE", owner=dispatcher_robertson
        )

        print("DEMO DATA SEEDED SUCCESSFULLY")
        print(f"Admins : {admin_xavier.username}, {admin_white.username}")
        print(
            f"Users  : {captain_rogers.username}, "
            f"{officer_redfield.username}, {dispatcher_robertson.username}"
        )
        print(f"Group  : {alpha_group.name} (Owner: {captain_rogers.username})")
        print("  - officer_redfield     -> create=True, update=True, assign=False")
        print("  - dispatcher_robertson -> create=False, update=False, assign=True")
        if unowned_count:
            print(f"Migrated {unowned_count} existing mid-term berth(s) to {captain_rogers.username}.")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Coastal Horizon Dockyard demo data.")
    parser.add_argument(
        "--password",
        required=True,
        help="Password to assign to the demo accounts (8+ chars, upper, lower, digit).",
    )
    parser.add_argument(
        "--reset-passwords",
        action="store_true",
        help="Reset passwords/status if demo accounts already exist.",
    )
    args = parser.parse_args()
    seed_database(args.password, reset_passwords=args.reset_passwords)