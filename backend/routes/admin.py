import os
from datetime import datetime

from flask import Blueprint, jsonify, request, send_from_directory
from flask_login import login_required
from sqlalchemy.exc import SQLAlchemyError

from backend.database import db
from backend.models import (
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
    StudentFeesPayment,
    HelpTickets,
)

from seed_data import write_seed_snapshot  # noqa: E402

admin_bp = Blueprint("admin_routes", __name__, url_prefix="/api/admin")


def _json_body():
    data = request.get_json(silent=True)
    if data is None:
        raise ValueError("Expected JSON body.")
    return data


def _commit():
    try:
        db.session.commit()
        _sync_seed_snapshot()
        return None
    except SQLAlchemyError as exc:
        db.session.rollback()
        return str(exc)


def _calculate_total_fees(payload):
    fields = [
        "prospectus_fees",
        "tuition_fees",
        "development_fees",
        "training_placement_fees",
        "iste_fees",
        "library_lab_fees",
        "student_insurance",
    ]
    total = 0.0
    for key in fields:
        total += float(payload.get(key, 0) or 0)
    return total


def _parse_date(value, fmt="%Y-%m-%d"):
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    return datetime.strptime(value, fmt).date()


def _parse_datetime(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(value)


def _error_response(message, code=400):
    return jsonify({"error": message}), code


@admin_bp.errorhandler(ValueError)
def handle_value_error(err):
    return _error_response(str(err), 400)


def _sync_seed_snapshot():
    try:
        write_seed_snapshot()
    except Exception as exc:  # pragma: no cover - sync failures shouldn't block API
        print(f"[seed-sync] Failed to update snapshot: {exc}")


# Fees Management -----------------------------------------------------------------
@admin_bp.route("/fees", methods=["GET"])
@login_required
def list_fees():
    category = request.args.get("category")
    query = FeesStructure.query
    if category:
        query = query.filter(FeesStructure.category.ilike(category))
    fees = [fee.to_dict() for fee in query.order_by(FeesStructure.category).all()]
    return jsonify(fees), 200


@admin_bp.route("/fees", methods=["POST"])
@login_required
def create_fee():
    data = _json_body()
    required_fields = ["category"]
    for field in required_fields:
        if not data.get(field):
            return _error_response(f"{field} is required.")

    total = data.get("total_fees") or _calculate_total_fees(data)
    fee = FeesStructure(
        category=data["category"].upper(),
        prospectus_fees=data.get("prospectus_fees", 0),
        tuition_fees=data.get("tuition_fees", 0),
        development_fees=data.get("development_fees", 0),
        training_placement_fees=data.get("training_placement_fees", 0),
        iste_fees=data.get("iste_fees", 0),
        library_lab_fees=data.get("library_lab_fees", 0),
        student_insurance=data.get("student_insurance", 0),
        total_fees=total,
    )
    db.session.add(fee)
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(fee.to_dict()), 201


@admin_bp.route("/fees/<int:fee_id>", methods=["PUT"])
@login_required
def update_fee(fee_id):
    fee = FeesStructure.query.get_or_404(fee_id)
    data = _json_body()

    for field in [
        "category",
        "prospectus_fees",
        "tuition_fees",
        "development_fees",
        "training_placement_fees",
        "iste_fees",
        "library_lab_fees",
        "student_insurance",
    ]:
        if field in data:
            setattr(
                fee,
                field,
                data[field].upper() if field == "category" else data[field],
            )

    fee.total_fees = data.get("total_fees", _calculate_total_fees(fee.to_dict()))
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(fee.to_dict()), 200


@admin_bp.route("/fees/<int:fee_id>", methods=["DELETE"])
@login_required
def delete_fee(fee_id):
    fee = FeesStructure.query.get_or_404(fee_id)
    db.session.delete(fee)
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify({"message": "Fees structure deleted."}), 200


# Admission Documents --------------------------------------------------------------
@admin_bp.route("/documents", methods=["GET"])
@login_required
def list_documents():
    doc_type = request.args.get("type")
    query = AdmissionDocuments.query
    if doc_type:
        query = query.filter(AdmissionDocuments.admission_type.ilike(doc_type))
    docs = (
        query.order_by(
            AdmissionDocuments.admission_type, AdmissionDocuments.display_order
        )
        .all()
    )
    return jsonify([doc.to_dict() for doc in docs]), 200


@admin_bp.route("/documents", methods=["POST"])
@login_required
def create_document():
    data = _json_body()
    required = ["admission_type", "document_name"]
    if not all(data.get(field) for field in required):
        return _error_response("Admission type and document name are required.")

    doc = AdmissionDocuments(
        admission_type=data["admission_type"],
        document_name=data["document_name"],
        is_required=data.get("is_required", True),
        display_order=data.get("display_order", 0),
    )
    db.session.add(doc)
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(doc.to_dict()), 201


@admin_bp.route("/documents/<int:doc_id>", methods=["PUT"])
@login_required
def update_document(doc_id):
    doc = AdmissionDocuments.query.get_or_404(doc_id)
    data = _json_body()
    for field in ["admission_type", "document_name", "is_required", "display_order"]:
        if field in data:
            setattr(doc, field, data[field])
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(doc.to_dict()), 200


@admin_bp.route("/documents/<int:doc_id>", methods=["DELETE"])
@login_required
def delete_document(doc_id):
    doc = AdmissionDocuments.query.get_or_404(doc_id)
    db.session.delete(doc)
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify({"message": "Document deleted."}), 200


# Library Management ---------------------------------------------------------------
@admin_bp.route("/library/books", methods=["GET"])
@login_required
def list_library_books():
    books = LibraryBooks.query.order_by(LibraryBooks.category).all()
    return jsonify([book.to_dict() for book in books]), 200


@admin_bp.route("/library/books", methods=["POST"])
@login_required
def create_library_book():
    data = _json_body()
    if not data.get("category"):
        return _error_response("Category is required.")
    book = LibraryBooks(
        category=data["category"],
        book_count=data.get("book_count", 0),
        is_active=data.get("is_active", True),
    )
    db.session.add(book)
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(book.to_dict()), 201


@admin_bp.route("/library/books/<int:book_id>", methods=["PUT"])
@login_required
def update_library_book(book_id):
    book = LibraryBooks.query.get_or_404(book_id)
    data = _json_body()
    for field in ["category", "book_count", "is_active"]:
        if field in data:
            setattr(book, field, data[field])
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(book.to_dict()), 200


@admin_bp.route("/library/books/<int:book_id>", methods=["DELETE"])
@login_required
def delete_library_book(book_id):
    book = LibraryBooks.query.get_or_404(book_id)
    db.session.delete(book)
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify({"message": "Library book deleted."}), 200


@admin_bp.route("/library/timings", methods=["GET"])
@login_required
def get_library_timings():
    timings = LibraryTimings.query.first()
    if not timings:
        return jsonify({}), 200
    return jsonify(timings.to_dict()), 200


@admin_bp.route("/library/timings", methods=["PUT"])
@login_required
def update_library_timings():
    data = _json_body()
    timings = LibraryTimings.query.first()
    if not timings:
        timings = LibraryTimings(**data)
        db.session.add(timings)
    else:
        for field in [
            "issue_start_time",
            "issue_end_time",
            "return_start_time",
            "return_end_time",
            "lunch_break_start",
            "lunch_break_end",
        ]:
            if field in data:
                setattr(timings, field, data[field])
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(timings.to_dict()), 200


# Hostel Management ---------------------------------------------------------------
@admin_bp.route("/hostel", methods=["GET"])
@login_required
def list_hostel_info():
    items = HostelInfo.query.order_by(HostelInfo.facility_name).all()
    return jsonify([item.to_dict() for item in items]), 200


@admin_bp.route("/hostel/<int:facility_id>", methods=["PUT"])
@login_required
def update_hostel_info(facility_id):
    item = HostelInfo.query.get_or_404(facility_id)
    data = _json_body()
    for field in [
        "facility_name",
        "is_available",
        "hostel_fees_per_semester",
        "mess_fees_per_month",
    ]:
        if field in data:
            setattr(item, field, data[field])
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(item.to_dict()), 200


# Scholarships --------------------------------------------------------------------
@admin_bp.route("/scholarships", methods=["GET"])
@login_required
def list_scholarships():
    category = request.args.get("category")
    query = Scholarships.query
    if category:
        query = query.filter(Scholarships.category.ilike(category))
    records = query.order_by(Scholarships.scholarship_name).all()
    return jsonify([record.to_dict() for record in records]), 200


@admin_bp.route("/scholarships", methods=["POST"])
@login_required
def create_scholarship():
    data = _json_body()
    required = ["scholarship_name", "category", "amount", "eligibility"]
    if not all(data.get(field) for field in required):
        return _error_response("Missing required scholarship fields.")

    scholarship = Scholarships(
        scholarship_name=data["scholarship_name"],
        category=data["category"],
        amount=data["amount"],
        eligibility=data["eligibility"],
        documents_required=data.get("documents_required", ""),
        is_active=data.get("is_active", True),
    )
    db.session.add(scholarship)
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(scholarship.to_dict()), 201


@admin_bp.route("/scholarships/<int:scholarship_id>", methods=["PUT"])
@login_required
def update_scholarship(scholarship_id):
    scholarship = Scholarships.query.get_or_404(scholarship_id)
    data = _json_body()
    for field in [
        "scholarship_name",
        "category",
        "amount",
        "eligibility",
        "documents_required",
        "is_active",
    ]:
        if field in data:
            setattr(scholarship, field, data[field])
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(scholarship.to_dict()), 200


@admin_bp.route("/scholarships/<int:scholarship_id>", methods=["DELETE"])
@login_required
def delete_scholarship(scholarship_id):
    scholarship = Scholarships.query.get_or_404(scholarship_id)
    db.session.delete(scholarship)
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify({"message": "Scholarship deleted."}), 200


# Faculty -------------------------------------------------------------------------
@admin_bp.route("/faculty", methods=["GET"])
@login_required
def list_faculty():
    department = request.args.get("department")
    query = Faculty.query
    if department:
        query = query.filter(Faculty.department.ilike(department))
    faculty = query.order_by(Faculty.department, Faculty.name).all()
    return jsonify([member.to_dict() for member in faculty]), 200


@admin_bp.route("/faculty", methods=["POST"])
@login_required
def create_faculty():
    data = _json_body()
    required = ["name", "department", "designation"]
    if not all(data.get(field) for field in required):
        return _error_response("Name, department, and designation are required.")
    member = Faculty(
        name=data["name"],
        department=data["department"],
        designation=data["designation"],
        subjects_taught=data.get("subjects_taught", ""),
        contact=data.get("contact", ""),
        email=data.get("email", ""),
        photo_url=data.get("photo_url", ""),
    )
    db.session.add(member)
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(member.to_dict()), 201


@admin_bp.route("/faculty/<int:faculty_id>", methods=["PUT"])
@login_required
def update_faculty(faculty_id):
    member = Faculty.query.get_or_404(faculty_id)
    data = _json_body()
    for field in [
        "name",
        "department",
        "designation",
        "subjects_taught",
        "contact",
        "email",
        "photo_url",
    ]:
        if field in data:
            setattr(member, field, data[field])
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(member.to_dict()), 200


@admin_bp.route("/faculty/<int:faculty_id>", methods=["DELETE"])
@login_required
def delete_faculty(faculty_id):
    member = Faculty.query.get_or_404(faculty_id)
    db.session.delete(member)
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify({"message": "Faculty deleted."}), 200


# Principal -----------------------------------------------------------------------
@admin_bp.route("/principal", methods=["GET"])
@login_required
def get_principal():
    info = PrincipalInfo.query.first()
    if not info:
        return jsonify({}), 200
    return jsonify(info.to_dict()), 200


@admin_bp.route("/principal", methods=["PUT"])
@login_required
def update_principal():
    data = _json_body()
    info = PrincipalInfo.query.first()
    if not info:
        info = PrincipalInfo(**data)
        db.session.add(info)
    else:
        for field in [
            "name",
            "education",
            "achievements",
            "medals",
            "contact",
            "email",
            "photo_url",
        ]:
            if field in data:
                setattr(info, field, data[field])
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(info.to_dict()), 200


# Events --------------------------------------------------------------------------
@admin_bp.route("/events", methods=["GET"])
@login_required
def list_events():
    event_type = request.args.get("type")
    query = Events.query
    if event_type:
        query = query.filter(Events.event_type.ilike(event_type))
    events = query.order_by(Events.event_date).all()
    return jsonify([event.to_dict() for event in events]), 200


@admin_bp.route("/events", methods=["POST"])
@login_required
def create_event():
    data = _json_body()
    required = ["event_name", "event_type", "event_date"]
    if not all(data.get(field) for field in required):
        return _error_response("Event name, type, and date are required.")
    event = Events(
        event_name=data["event_name"],
        event_type=data["event_type"],
        event_date=_parse_date(data["event_date"]),
        description=data.get("description", ""),
        is_active=data.get("is_active", True),
    )
    db.session.add(event)
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(event.to_dict()), 201


@admin_bp.route("/events/<int:event_id>", methods=["PUT"])
@login_required
def update_event(event_id):
    event = Events.query.get_or_404(event_id)
    data = _json_body()
    for field in ["event_name", "event_type", "description", "is_active"]:
        if field in data:
            setattr(event, field, data[field])
    if "event_date" in data:
        event.event_date = _parse_date(data["event_date"])
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(event.to_dict()), 200


@admin_bp.route("/events/<int:event_id>", methods=["DELETE"])
@login_required
def delete_event(event_id):
    event = Events.query.get_or_404(event_id)
    db.session.delete(event)
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify({"message": "Event deleted."}), 200


# College Timings -----------------------------------------------------------------
@admin_bp.route("/timings", methods=["GET"])
@login_required
def get_timings():
    timings = CollegeTimings.query.first()
    if not timings:
        return jsonify({}), 200
    return jsonify(timings.to_dict()), 200


@admin_bp.route("/timings", methods=["PUT"])
@login_required
def update_timings():
    data = _json_body()
    timings = CollegeTimings.query.first()
    if not timings:
        timings = CollegeTimings(**data)
        db.session.add(timings)
    else:
        for field in [
            "opening_time",
            "closing_time",
            "saturday_opening",
            "saturday_closing",
        ]:
            if field in data:
                setattr(timings, field, data[field])
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(timings.to_dict()), 200


# Student Fees Payment ------------------------------------------------------------
@admin_bp.route("/student-fees", methods=["GET"])
@login_required
def list_student_fees():
    records = StudentFeesPayment.query.order_by(StudentFeesPayment.payment_date.desc()).all()
    return jsonify([record.to_dict() for record in records]), 200


@admin_bp.route("/student-fees", methods=["POST"])
@login_required
def create_student_fee():
    data = _json_body()
    required = [
        "student_name",
        "student_id",
        "admission_year",
        "category",
        "total_fees",
        "paid_amount",
        "receipt_number",
        "semester",
    ]
    if not all(data.get(field) for field in required):
        return _error_response("Missing required student fee fields.")

    remaining = data.get("remaining_amount")
    if remaining is None:
        remaining = float(data["total_fees"]) - float(data["paid_amount"])

    record = StudentFeesPayment(
        student_name=data["student_name"],
        student_id=data["student_id"],
        admission_year=data["admission_year"],
        category=data["category"],
        total_fees=data["total_fees"],
        paid_amount=data["paid_amount"],
        remaining_amount=remaining,
        payment_date=_parse_datetime(data.get("payment_date")) or datetime.utcnow(),
        receipt_number=data["receipt_number"],
        semester=data["semester"],
    )
    db.session.add(record)
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(record.to_dict()), 201


@admin_bp.route("/student-fees/<int:record_id>", methods=["PUT"])
@login_required
def update_student_fee(record_id):
    record = StudentFeesPayment.query.get_or_404(record_id)
    data = _json_body()
    for field in [
        "student_name",
        "student_id",
        "admission_year",
        "category",
        "total_fees",
        "paid_amount",
        "remaining_amount",
        "receipt_number",
        "semester",
    ]:
        if field in data:
            setattr(record, field, data[field])
    if "payment_date" in data:
        record.payment_date = _parse_datetime(data["payment_date"])
    if "paid_amount" in data and "total_fees" in data and "remaining_amount" not in data:
        record.remaining_amount = float(record.total_fees) - float(record.paid_amount)
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(record.to_dict()), 200


@admin_bp.route("/student-fees/<int:record_id>", methods=["DELETE"])
@login_required
def delete_student_fee(record_id):
    record = StudentFeesPayment.query.get_or_404(record_id)
    db.session.delete(record)
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify({"message": "Student fee record deleted."}), 200


@admin_bp.route("/student-fees/search", methods=["GET"])
@login_required
def search_student_fee():
    student_id = request.args.get("student_id")
    if not student_id:
        return _error_response("student_id query parameter is required.")
    record = StudentFeesPayment.query.filter_by(student_id=student_id).first()
    if not record:
        return jsonify({}), 200
    return jsonify(record.to_dict()), 200


# Help Tickets --------------------------------------------------------------------
@admin_bp.route("/tickets", methods=["GET"])
@login_required
def list_tickets():
    status = request.args.get("status")
    query = HelpTickets.query
    if status:
        query = query.filter(HelpTickets.status.ilike(status))
    tickets = query.order_by(HelpTickets.created_at.desc()).all()
    return jsonify([ticket.to_dict() for ticket in tickets]), 200


@admin_bp.route("/tickets/<int:ticket_id>/status", methods=["PUT"])
@login_required
def update_ticket_status(ticket_id):
    ticket = HelpTickets.query.get_or_404(ticket_id)
    data = _json_body()
    status = data.get("status")
    if not status:
        return _error_response("Status is required.")
    ticket.status = status
    if status.lower() == "resolved":
        ticket.resolved_at = datetime.utcnow()
    error = _commit()
    if error:
        return _error_response(error, 500)
    return jsonify(ticket.to_dict()), 200


@admin_bp.route("/tickets/<int:ticket_id>/pdf", methods=["GET"])
@login_required
def download_ticket_pdf(ticket_id):
    ticket = HelpTickets.query.get_or_404(ticket_id)
    if not ticket.pdf_filename:
        return _error_response("No PDF file attached to this ticket."), 404
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    uploads_dir = os.path.join(base_dir, "uploads")
    file_path = os.path.join(uploads_dir, ticket.pdf_filename)
    
    if not os.path.exists(file_path):
        return _error_response("PDF file not found."), 404
    
    return send_from_directory(uploads_dir, ticket.pdf_filename, as_attachment=True)
