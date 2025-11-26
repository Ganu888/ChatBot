import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from werkzeug.utils import secure_filename

from flask import Blueprint, jsonify, request

from backend.database import db
from backend.models import AdmissionDocuments, FeesStructure, Scholarships, HelpTickets

from seed_data import get_chatbot_snapshot  # noqa: E402

chatbot_bp = Blueprint("chatbot", __name__, url_prefix="/api/chatbot")


def _get_college_data() -> Dict[str, Any]:
    return get_chatbot_snapshot()


def _format_currency(value):
    if value is None:
        return "₹0.00"
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return str(value)
    return f"₹{numeric:,.2f}"


def _as_bool(value: Any, default: bool = True) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes", "y"}
    return bool(value)


def _format_fees_section(fees: List[Dict[str, Any]]) -> str:
    lines = []
    for fee in fees:
        category = fee.get("category", "Category")
        lines.append(
            f"- {category}: Total {_format_currency(fee.get('total_fees'))} "
            f"(Prospectus {_format_currency(fee.get('prospectus_fees'))}, Tuition {_format_currency(fee.get('tuition_fees'))}, "
            f"Development {_format_currency(fee.get('development_fees'))}, Training & Placement {_format_currency(fee.get('training_placement_fees'))}, "
            f"ISTE {_format_currency(fee.get('iste_fees'))}, Library {_format_currency(fee.get('library_lab_fees'))}, "
            f"Insurance {_format_currency(fee.get('student_insurance'))})"
        )
    return "\n".join(lines) if lines else "No fees data available."


def _format_documents_section(documents: List[Dict[str, Any]]) -> str:
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for doc in documents:
        grouped.setdefault(doc.get("admission_type", "General"), []).append(doc)

    lines = []
    for admission_type, docs in grouped.items():
        lines.append(f"{admission_type.upper()}:")
        sorted_docs = sorted(docs, key=lambda item: item.get("display_order") or 0)
        for doc in sorted_docs:
            required = "Required" if _as_bool(doc.get("is_required"), True) else "Optional"
            lines.append(f"  - {doc.get('document_name', 'Document')} ({required})")
    return "\n".join(lines) if lines else "No admission document data available."


def _format_library_section(books: List[Dict[str, Any]], timings: Optional[Dict[str, Any]]):
    if books:
        categories = ", ".join(book.get("category", "General") for book in books)
    else:
        categories = "Data not available"

    if timings:
        time_text = (
            f"Issue: {timings.get('issue_start_time', '--')} - {timings.get('issue_end_time', '--')}, "
            f"Return: {timings.get('return_start_time', '--')} - {timings.get('return_end_time', '--')}, "
            f"Lunch Break: {timings.get('lunch_break_start', '--')} - {timings.get('lunch_break_end', '--')}"
        )
    else:
        time_text = "Timings data not available."
    return f"- Available Categories: {categories}\n- Timings: {time_text}"


def _format_hostel_section(items: List[Dict[str, Any]]) -> str:
    if not items:
        return "Hostel data not available."
    facilities = ", ".join(
        item.get("facility_name", "Facility") for item in items if _as_bool(item.get("is_available"), True)
    )
    fees = items[0]
    return (
        f"Facilities: {facilities}\n"
        f"Hostel Fees: {_format_currency(fees.get('hostel_fees_per_semester'))} per semester\n"
        f"Mess Fees: {_format_currency(fees.get('mess_fees_per_month'))} per month"
    )


def _format_scholarships_section(items: List[Dict[str, Any]]) -> str:
    if not items:
        return "No scholarships available."
    lines = []
    for scholarship in items:
        if not _as_bool(scholarship.get("is_active"), True):
            continue
        lines.append(
            f"- {scholarship.get('scholarship_name', 'Scholarship')} ({scholarship.get('category', 'General')}): {scholarship.get('amount', '')} | "
            f"Eligibility: {scholarship.get('eligibility', 'Refer to scholarship cell')} | Documents: {scholarship.get('documents_required', 'As per instructions')}"
        )
    return "\n".join(lines) if lines else "No active scholarships at the moment."


def _format_faculty_section(items: List[Dict[str, Any]]) -> str:
    if not items:
        return "Faculty data not available."
    lines = []
    for member in items:
        lines.append(
            f"- {member.get('name', 'Faculty')}, {member.get('designation', '')}, {member.get('department', '')} | Subjects: {member.get('subjects_taught', '')}"
        )
    return "\n".join(lines)


def _format_events_section(events: List[Dict[str, Any]]) -> str:
    if not events:
        return "No upcoming events recorded."
    lines = []
    for event in events:
        status = "Active" if _as_bool(event.get("is_active"), True) else "Inactive"
        event_date = event.get("event_date") or "To be announced"
        lines.append(
            f"- {event.get('event_name', 'Event')} ({event.get('event_type', 'General')}) on {event_date} [{status}]"
        )
    return "\n".join(lines)


def _build_system_prompt():
    data = _get_college_data()
    fees = data.get("fees", [])
    documents = data.get("documents", [])
    books = data.get("library_books", [])
    timings = data.get("library_timings")
    hostel = data.get("hostel", [])
    scholarships = data.get("scholarships", [])
    faculty = data.get("faculty", [])
    principal = data.get("principal")
    events = data.get("events", [])
    college_timings = data.get("college_timings")

    prompt = [
        "You are a helpful college assistant for Government Polytechnic, Ambajogai, Maharashtra.",
        "",
        "COLLEGE INFORMATION:",
        "",
        "Fees Structure:",
        _format_fees_section(fees),
        "",
        "Admission Process:",
        _format_documents_section(documents),
        "",
        "Library:",
        _format_library_section(books, timings),
        "",
        "Hostel:",
        _format_hostel_section(hostel),
        "",
        "Scholarships:",
        _format_scholarships_section(scholarships),
        "",
        "Faculty:",
        _format_faculty_section(faculty),
        "",
        "Principal:",
        (
            f"Name: {principal.get('name')}\nEducation: {principal.get('education')}\nAchievements: {principal.get('achievements')}"
            if principal
            else "Data not available."
        ),
        "",
        "Events:",
        _format_events_section(events),
        "",
        "College Timings:",
        (
            f"Weekdays: {college_timings.get('opening_time')} - {college_timings.get('closing_time')}, "
            f"Saturday: {college_timings.get('saturday_opening')} - {college_timings.get('saturday_closing')}"
            if college_timings
            else "Timings data not available."
        ),
        "",
        "INSTRUCTIONS:",
        "- Answer only college-related questions.",
        "- Be friendly and helpful.",
        "- Provide accurate information from the data above.",
        "- Mention Ambajogai, Maharashtra when appropriate.",
        "- If asked about fees, include category-specific amounts.",
        "- If asked about scholarships, include eligibility information.",
        '- If the user says "I need help", ask for their name and contact to create a help ticket.',
        "- For admission queries, explain the process step by step.",
    ]

    return "\n".join(prompt)


def _generate_local_answer(user_message: str) -> str:
    """
    Simple rule-based responder that uses database-backed sections.
    """
    text = (user_message or "").lower()

    data = _get_college_data()
    fees = data.get("fees", [])
    documents = data.get("documents", [])
    books = data.get("library_books", [])
    timings = data.get("library_timings")
    hostel = data.get("hostel", [])
    scholarships = data.get("scholarships", [])
    faculty = data.get("faculty", [])
    principal = data.get("principal")
    events = data.get("events", [])
    college_timings = data.get("college_timings")

    sections = []

    if "fee" in text or "fees" in text:
        sections.append("Here is the current fee structure for different categories:\n" + _format_fees_section(fees))

    if "admission" in text or "document" in text:
        sections.append(
            "For admissions, the following documents are generally required:\n"
            + _format_documents_section(documents)
        )

    if "library" in text:
        sections.append("Library information:\n" + _format_library_section(books, timings))

    if "hostel" in text or "mess" in text:
        sections.append("Hostel facilities and fees:\n" + _format_hostel_section(hostel))

    if "scholarship" in text:
        sections.append("Available scholarships:\n" + _format_scholarships_section(scholarships))

    if "faculty" in text or "staff" in text or "teacher" in text:
        sections.append("Key faculty members:\n" + _format_faculty_section(faculty))

    if "principal" in text:
        if principal:
            sections.append(
                "Principal information:\n"
                f"Name: {principal.get('name')}\nEducation: {principal.get('education')}\nAchievements: {principal.get('achievements')}"
            )
        else:
            sections.append("Principal information is not yet available.")

    if "event" in text or "fest" in text:
        sections.append("Upcoming and recent events:\n" + _format_events_section(events))

    if "time" in text or "timing" in text or "schedule" in text:
        if college_timings:
            sections.append(
                "College timings:\n"
                f"Weekdays: {college_timings.get('opening_time')} - {college_timings.get('closing_time')}\n"
                f"Saturday: {college_timings.get('saturday_opening')} - {college_timings.get('saturday_closing')}"
            )
        else:
            sections.append("College timing information is not yet available.")

    if "help" in text and "need" in text:
        sections.append(
            "I can create a help ticket for you. Please click on 'I Need Help' and provide your name and contact"
            " number so our staff from Government Polytechnic, Ambajogai can reach out to you."
        )

    if not sections:
        overview = [
            "I am a college assistant for Government Polytechnic, Ambajogai, Maharashtra.",
            "",
            "Here is a quick overview of the college information I can share:",
            "",
            "Fees Structure:",
            _format_fees_section(fees),
            "",
            "Admission Documents:",
            _format_documents_section(documents),
            "",
            "Library:",
            _format_library_section(books, timings),
            "",
            "Hostel:",
            _format_hostel_section(hostel),
            "",
            "Scholarships:",
            _format_scholarships_section(scholarships),
            "",
            "College Timings:",
            (
                f"Weekdays: {college_timings.get('opening_time')} - {college_timings.get('closing_time')}, "
                f"Saturday: {college_timings.get('saturday_opening')} - {college_timings.get('saturday_closing')}"
                if college_timings
                else "Timings data not available."
            ),
            "",
            "You can ask me specific questions about fees, admissions, scholarships, library, hostel, faculty, events,"
            " or timings.",
        ]
        return "\n".join(overview)

    return "\n\n".join(sections)


@chatbot_bp.route("/message", methods=["POST"])
def chatbot_message():
    try:
        data = request.get_json(silent=True) or {}
        user_message = data.get("message", "").strip()
        if not user_message:
            return jsonify({"error": "Message is required."}), 400

        reply = _generate_local_answer(user_message)
        
        # Ensure we always return a response
        if not reply or reply.strip() == "":
            reply = "I'm here to help! Please ask me about fees, admissions, scholarships, library, hostel, faculty, events, or timings."
        
        return jsonify({"response": reply}), 200
    except Exception as e:
        # Log the error for debugging
        print(f"Error in chatbot_message: {str(e)}")
        return jsonify({
            "error": "An error occurred while processing your request.",
            "response": "I apologize, but I encountered an error. Please try again or contact support."
        }), 500


@chatbot_bp.route("/help-ticket", methods=["POST"])
def create_help_ticket():
    # Handle both JSON and form-data requests
    if request.is_json:
        data = request.get_json(silent=True) or {}
        name = data.get("student_name", "").strip()
        contact = data.get("contact", "").strip()
        query_text = data.get("query", "").strip()
        topic = data.get("topic", "").strip()
        pdf_file = None
    else:
        # Form data with file upload
        name = request.form.get("student_name", "").strip()
        contact = request.form.get("contact", "").strip()
        query_text = request.form.get("query", "").strip()
        topic = request.form.get("topic", "").strip()
        pdf_file = request.files.get("pdf_file")

    if not name or not contact or not query_text:
        return (
            jsonify({"error": "Name, contact, and query are required to create a ticket."}),
            400,
        )

    # Create ticket first to get ID
    ticket = HelpTickets(
        student_name=name,
        contact=contact,
        query_text=query_text,
        topic=topic if topic else None
    )
    db.session.add(ticket)
    db.session.flush()  # Get the ticket ID without committing

    # Handle PDF file upload
    pdf_filename = None
    if pdf_file and pdf_file.filename:
        # Validate file type
        if not pdf_file.filename.lower().endswith('.pdf'):
            db.session.rollback()
            return jsonify({"error": "Only PDF files are allowed."}), 400
        
        # Create uploads directory if it doesn't exist
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        uploads_dir = os.path.join(base_dir, "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        
        # Generate secure filename
        timestamp = int(datetime.now().timestamp())
        safe_filename = secure_filename(pdf_file.filename)
        pdf_filename = f"ticket_{ticket.id}_{timestamp}_{safe_filename}"
        file_path = os.path.join(uploads_dir, pdf_filename)
        
        # Save file
        pdf_file.save(file_path)
        ticket.pdf_filename = pdf_filename

    db.session.commit()
    return jsonify({"message": "Help ticket created.", "ticket": ticket.to_dict()}), 201


@chatbot_bp.route("/admission-documents", methods=["GET"])
def get_admission_documents():
    """Get admission documents by admission type"""
    admission_type = request.args.get("type", "").strip()
    
    # Map widget route values to admin admission_type values
    type_mapping = {
        "first-year": "12th",
        "direct-second-year": "Diploma",
        "management": "Management",
        "bsc": "BSc",
        "international": "International",
    }
    
    # Convert widget value to admin value
    admin_type = type_mapping.get(admission_type, admission_type)
    
    # Query documents
    query = AdmissionDocuments.query
    if admin_type:
        query = query.filter(AdmissionDocuments.admission_type.ilike(admin_type))
    
    documents = query.order_by(
        AdmissionDocuments.display_order
    ).all()
    
    # Format response
    if not documents:
        return jsonify({
            "admission_type": admin_type,
            "documents": [],
            "formatted_text": f"No documents found for {admin_type} admission route. Please contact the admission office for document requirements."
        }), 200
    
    # Format documents list
    docs_list = []
    for doc in documents:
        docs_list.append({
            "document_name": doc.document_name,
            "is_required": doc.is_required,
            "display_order": doc.display_order
        })
    
    # Create formatted response text
    required_docs = [d["document_name"] for d in docs_list if d["is_required"]]
    optional_docs = [d["document_name"] for d in docs_list if not d["is_required"]]
    
    response_text = f"Required Documents for {admin_type} Admission:\n"
    if required_docs:
        for doc in required_docs:
            response_text += f"- {doc}\n"
    else:
        response_text += "- No required documents listed.\n"
    
    if optional_docs:
        response_text += "\nOptional Documents:\n"
        for doc in optional_docs:
            response_text += f"- {doc}\n"
    
    return jsonify({
        "admission_type": admin_type,
        "documents": docs_list,
        "formatted_text": response_text
    }), 200


@chatbot_bp.route("/fees", methods=["GET"])
def get_fees_information():
    """Return fee structure details, optionally filtered by category"""
    category = (request.args.get("category") or "").strip()
    query = FeesStructure.query
    if category:
        query = query.filter(FeesStructure.category.ilike(category))
    fees = query.order_by(FeesStructure.category).all()
    fees_dict = [fee.to_dict() for fee in fees]  # Convert to dicts first

    return jsonify(
        {
            "category": category or None,
            "fees": fees_dict,
            "formatted_text": _format_fees_section(fees_dict)
            or "Fee information is not available at the moment.",
        }
    ), 200


@chatbot_bp.route("/scholarships", methods=["GET"])
def get_scholarship_information():
    """Return scholarship details, optionally filtered by category"""
    category = (request.args.get("category") or "").strip()
    query = Scholarships.query.filter(Scholarships.is_active.is_(True))
    if category:
        query = query.filter(Scholarships.category.ilike(category))
    scholarships = query.order_by(Scholarships.scholarship_name).all()
    scholarships_dict = [item.to_dict() for item in scholarships]

    return jsonify(
        {
            "category": category or None,
            "scholarships": scholarships_dict,
            "formatted_text": _format_scholarships_section(scholarships_dict)
            or "No scholarships are available right now.",
            
        }
        
        
    ), 200
