import argparse
import json
from datetime import datetime, date
from pathlib import Path
from typing import Any, Dict, List, Optional

from werkzeug.security import generate_password_hash

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
SNAPSHOT_PATH = DATA_DIR / "seed_snapshot.json"

SEED_PAYLOAD: Dict[str, Any] = {}

from backend.database import db  # noqa: E402
from backend.models import (  # noqa: E402
    Admin,
    FeesStructure,
    AdmissionDocuments,
    LibraryBooks,
    LibraryTimings,
    HostelInfo,
    Scholarships,
    Faculty,
    PrincipalInfo,
    Events,
    CollegeTimings,
)


def use_seed_payload(payload: Optional[Dict[str, Any]] = None) -> None:
    """Store snapshot payload for seeding."""
    global SEED_PAYLOAD
    SEED_PAYLOAD = payload or {}


def load_seed_snapshot(path: Path = SNAPSHOT_PATH) -> Optional[Dict[str, Any]]:
    if not path.exists():
        return None
    try:
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
            return data if isinstance(data, dict) else None
    except (json.JSONDecodeError, OSError):
        return None


def _ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _clean_record(record: Dict[str, Any], exclude: Optional[List[str]] = None) -> Dict[str, Any]:
    exclude = set(exclude or [])
    return {key: value for key, value in record.items() if key not in exclude}


def get_live_records() -> Dict[str, Any]:
    """Return ORM objects for all chatbot-relevant tables."""
    return {
        "fees": FeesStructure.query.order_by(FeesStructure.category).all(),
        "documents": AdmissionDocuments.query.order_by(
            AdmissionDocuments.admission_type, AdmissionDocuments.display_order
        ).all(),
        "library_books": LibraryBooks.query.order_by(LibraryBooks.category).all(),
        "library_timings": LibraryTimings.query.first(),
        "hostel": HostelInfo.query.order_by(HostelInfo.facility_name).all(),
        "scholarships": Scholarships.query.order_by(Scholarships.scholarship_name).all(),
        "faculty": Faculty.query.order_by(Faculty.department, Faculty.name).all(),
        "principal": PrincipalInfo.query.first(),
        "events": Events.query.order_by(Events.event_date).all(),
        "college_timings": CollegeTimings.query.first(),
    }


def build_seed_payload(records: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Create a serializable payload that mirrors the current database."""
    records = records or get_live_records()

    def serialize_list(items, exclude=None):
        return [
            _clean_record(item.to_dict(), exclude or ["id", "updated_at", "created_at"])
            for item in items
        ]

    payload: Dict[str, Any] = {
        "fees": serialize_list(records.get("fees", []), ["id", "updated_at", "created_at"]),
        "documents": serialize_list(records.get("documents", []), ["id"]),
        "library_books": serialize_list(records.get("library_books", []), ["id"]),
        "hostel": serialize_list(records.get("hostel", []), ["id"]),
        "scholarships": serialize_list(records.get("scholarships", []), ["id"]),
        "faculty": serialize_list(records.get("faculty", []), ["id"]),
        "events": serialize_list(records.get("events", []), ["id"]),
    }

    library_timings = records.get("library_timings")
    payload["library_timings"] = (
        _clean_record(library_timings.to_dict(), ["id"]) if library_timings else None
    )

    principal = records.get("principal")
    payload["principal"] = _clean_record(principal.to_dict(), ["id"]) if principal else None

    college_timings = records.get("college_timings")
    payload["college_timings"] = (
        _clean_record(college_timings.to_dict(), ["id"]) if college_timings else None
    )

    return payload


def write_seed_snapshot(records: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Dump the latest dataset to JSON so future seeding reflects admin updates."""
    payload = build_seed_payload(records)
    _ensure_data_dir()
    with SNAPSHOT_PATH.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)
    return payload


def get_chatbot_snapshot() -> Dict[str, Any]:
    """Expose a shared dataset for chatbot responses."""
    return build_seed_payload()


def _get_seed_records(key: str, default: Any = None) -> Any:
    data = SEED_PAYLOAD.get(key)
    if data is not None:
        return data
    return default


def _as_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _as_bool(value: Any, default: bool = True) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes", "y"}
    return bool(value)


def seed_admin():
    if Admin.query.filter_by(username="admin").first():
        return
    admin = Admin(
        username="admin",
        password_hash=generate_password_hash("admin123"),
    )
    db.session.add(admin)


def seed_fees():
    if FeesStructure.query.count():
        return
    records = _get_seed_records(
        "fees",
        [
            {
                "category": "OPEN",
                "prospectus_fees": 200,
                "tuition_fees": 10001,
                "development_fees": 5045,
                "training_placement_fees": 2000,
                "iste_fees": 300,
                "library_lab_fees": 2000,
                "student_insurance": 454,
            }
        ],
    )

    for record in records:
        fee = FeesStructure(
            category=(record.get("category") or "OPEN").upper(),
            prospectus_fees=_as_float(record.get("prospectus_fees")),
            tuition_fees=_as_float(record.get("tuition_fees")),
            development_fees=_as_float(record.get("development_fees")),
            training_placement_fees=_as_float(record.get("training_placement_fees")),
            iste_fees=_as_float(record.get("iste_fees")),
            library_lab_fees=_as_float(record.get("library_lab_fees")),
            student_insurance=_as_float(record.get("student_insurance")),
        )
        total = record.get("total_fees")
        if total is None:
            total = (
                fee.prospectus_fees
                + fee.tuition_fees
                + fee.development_fees
                + fee.training_placement_fees
                + fee.iste_fees
                + fee.library_lab_fees
                + fee.student_insurance
            )
        fee.total_fees = _as_float(total, default=0.0)
        db.session.add(fee)


def seed_documents():
    if AdmissionDocuments.query.count():
        return
    records = _get_seed_records(
        "documents",
        [
            {"admission_type": "12th", "document_name": "10th Marksheet", "display_order": 1},
            {"admission_type": "12th", "document_name": "12th Marksheet", "display_order": 2},
            {"admission_type": "12th", "document_name": "Leaving Certificate", "display_order": 3},
            {"admission_type": "12th", "document_name": "Domicile Certificate", "display_order": 4},
            {"admission_type": "12th", "document_name": "Aadhar Card", "display_order": 5},
            {"admission_type": "12th", "document_name": "MHT-CET Score Card", "display_order": 6},
            {"admission_type": "12th", "document_name": "Passport Photos", "display_order": 7},
        ],
    )

    for index, record in enumerate(records, start=1):
        order = record.get("display_order")
        try:
            order = int(order)
        except (TypeError, ValueError):
            order = index
        db.session.add(
            AdmissionDocuments(
                admission_type=record.get("admission_type", "12th"),
                document_name=record.get("document_name", ""),
                is_required=_as_bool(record.get("is_required"), True),
                display_order=order,
            )
        )


def seed_library():
    if LibraryBooks.query.count() == 0:
        records = _get_seed_records(
            "library_books",
            [
                {"category": "Computer Engineering", "book_count": 100},
                {"category": "Information Technology", "book_count": 100},
                {"category": "Mathematics", "book_count": 100},
                {"category": "Physics", "book_count": 100},
                {"category": "Competitive Exam Books", "book_count": 100},
            ],
        )
        for record in records:
            db.session.add(
                LibraryBooks(
                    category=record.get("category", "General"),
                    book_count=int(_as_float(record.get("book_count"), 0)),
                    is_active=_as_bool(record.get("is_active"), True),
                )
            )

    if not LibraryTimings.query.first():
        timings = _get_seed_records(
            "library_timings",
            {
                "issue_start_time": "10:00 AM",
                "issue_end_time": "05:30 PM",
                "return_start_time": "10:00 AM",
                "return_end_time": "05:30 PM",
                "lunch_break_start": "01:00 PM",
                "lunch_break_end": "02:00 PM",
            },
        )
        if timings:
            db.session.add(
                LibraryTimings(
                    issue_start_time=timings.get("issue_start_time", "10:00 AM"),
                    issue_end_time=timings.get("issue_end_time", "05:30 PM"),
                    return_start_time=timings.get("return_start_time", "10:00 AM"),
                    return_end_time=timings.get("return_end_time", "05:30 PM"),
                    lunch_break_start=timings.get("lunch_break_start", "01:00 PM"),
                    lunch_break_end=timings.get("lunch_break_end", "02:00 PM"),
                )
            )


def seed_hostel():
    if HostelInfo.query.count():
        return
    records = _get_seed_records(
        "hostel",
        [
            {"facility_name": "Bed, Mattress, Cupboard"},
            {"facility_name": "RO Water"},
            {"facility_name": "Wi-Fi"},
            {"facility_name": "Study Room"},
            {"facility_name": "Hot Water"},
            {"facility_name": "CCTV Security"},
            {"facility_name": "Mess/Canteen"},
        ],
    )
    for record in records:
        db.session.add(
            HostelInfo(
                facility_name=record.get("facility_name", "Facility"),
                is_available=_as_bool(record.get("is_available"), True),
                hostel_fees_per_semester=_as_float(record.get("hostel_fees_per_semester"), 10000),
                mess_fees_per_month=_as_float(record.get("mess_fees_per_month"), 2500),
            )
        )


def seed_scholarships():
    if Scholarships.query.count():
        return
    records = _get_seed_records(
        "scholarships",
        [
            {"scholarship_name": "Post-Matric SC", "category": "SC"},
            {"scholarship_name": "Post-Matric ST", "category": "ST"},
            {"scholarship_name": "OBC/SBC/VJNT", "category": "OBC"},
            {"scholarship_name": "EWS Scholarship", "category": "EWS"},
            {"scholarship_name": "TFWS", "category": "TFWS"},
            {"scholarship_name": "AICTE Pragati", "category": "Girls"},
        ],
    )
    for record in records:
        db.session.add(
            Scholarships(
                scholarship_name=record.get("scholarship_name", "Scholarship"),
                category=record.get("category", "GENERAL"),
                amount=record.get("amount", "As per govt norms"),
                eligibility=record.get("eligibility", "Based on government eligibility criteria."),
                documents_required=record.get(
                    "documents_required", "Application form, caste certificate, income proof."
                ),
                is_active=_as_bool(record.get("is_active"), True),
            )
        )


def seed_principal():
    if PrincipalInfo.query.first():
        return
    record = _get_seed_records(
        "principal",
        {
            "name": "Dr. A. B. Patil",
            "education": "Ph.D. in Electronics Engineering",
            "achievements": "Published 25+ research papers.",
            "medals": "Best Principal Award 2022",
            "contact": "+91-9999999999",
            "email": "principal@gpambajogai.ac.in",
            "photo_url": "https://via.placeholder.com/150",
        },
    )
    if record:
        db.session.add(
            PrincipalInfo(
                name=record.get("name", ""),
                education=record.get("education", ""),
                achievements=record.get("achievements", ""),
                medals=record.get("medals", ""),
                contact=record.get("contact", ""),
                email=record.get("email", ""),
                photo_url=record.get("photo_url", ""),
            )
        )


def seed_events():
    if Events.query.count():
        return
    sample_events = _get_seed_records(
        "events",
        [
            {"event_name": "Annual Cultural Fest", "event_type": "Cultural", "event_date": date.today()},
            {"event_name": "Intra-College Sports Meet", "event_type": "Sports", "event_date": date.today()},
            {"event_name": "Tech Symposium", "event_type": "Technical", "event_date": date.today()},
        ],
    )
    for record in sample_events:
        event_date = record.get("event_date", date.today())
        if isinstance(event_date, str):
            event_date = datetime.fromisoformat(event_date).date()
        db.session.add(
            Events(
                event_name=record.get("event_name", "College Event"),
                event_type=record.get("event_type", "General"),
                event_date=event_date,
                description=record.get("description", f"{record.get('event_name', 'Event')} at the college campus."),
                is_active=_as_bool(record.get("is_active"), True),
            )
        )


def seed_timings():
    if CollegeTimings.query.first():
        return
    record = _get_seed_records(
        "college_timings",
        {
            "opening_time": "09:00 AM",
            "closing_time": "05:00 PM",
            "saturday_opening": "09:00 AM",
            "saturday_closing": "01:00 PM",
        },
    )
    if record:
        db.session.add(
            CollegeTimings(
                opening_time=record.get("opening_time", "09:00 AM"),
                closing_time=record.get("closing_time", "05:00 PM"),
                saturday_opening=record.get("saturday_opening", "09:00 AM"),
                saturday_closing=record.get("saturday_closing", "01:00 PM"),
            )
        )


def seed_faculty():
    if Faculty.query.count():
        return
    faculty_members = _get_seed_records(
        "faculty",
        [
            {
                "name": "Prof. S. R. Kulkarni",
                "department": "Computer",
                "designation": "HOD",
                "subjects_taught": "Programming, DBMS",
            },
            {
                "name": "Prof. P. N. Deshmukh",
                "department": "IT",
                "designation": "Lecturer",
                "subjects_taught": "Networks, Security",
            },
            {
                "name": "Prof. K. V. Jadhav",
                "department": "Mechanical",
                "designation": "Lecturer",
                "subjects_taught": "Thermodynamics",
            },
        ],
    )
    for record in faculty_members:
        name = record.get("name", "Faculty Member")
        slug = "".join(part[0] for part in name.split()[:2]).lower() or "faculty"
        db.session.add(
            Faculty(
                name=name,
                department=record.get("department", "General"),
                designation=record.get("designation", "Lecturer"),
                subjects_taught=record.get("subjects_taught", ""),
                contact=record.get("contact", "+91-8888888888"),
                email=record.get("email", f"{slug}@gpambajogai.ac.in"),
                photo_url=record.get("photo_url", "https://via.placeholder.com/150"),
            )
        )


def main():
    parser = argparse.ArgumentParser(description="Seed or snapshot the college chatbot database.")
    parser.add_argument(
        "--export",
        action="store_true",
        help="Only export the current database into data/seed_snapshot.json without seeding.",
    )
    parser.add_argument(
        "--skip-snapshot",
        action="store_true",
        help="Skip writing the snapshot file after seeding (useful for CI).",
    )
    args = parser.parse_args()

    from backend.app import create_app  # noqa: E402

    app = create_app()
    with app.app_context():
        if args.export:
            payload = write_seed_snapshot()
            print(f"Snapshot exported to {SNAPSHOT_PATH} ({len(payload.get('fees', []))} fee records).")
            return

        snapshot = load_seed_snapshot()
        use_seed_payload(snapshot)

        seed_admin()
        seed_fees()
        seed_documents()
        seed_library()
        seed_hostel()
        seed_scholarships()
        seed_faculty()
        seed_principal()
        seed_events()
        seed_timings()
        db.session.commit()

        if not args.skip_snapshot:
            write_seed_snapshot()

        print("Database seeded successfully.")


if __name__ == "__main__":
    main()
