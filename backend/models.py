from datetime import datetime, date
from flask_login import UserMixin
from sqlalchemy import func

from backend.database import db


class SerializerMixin:
    """Provide a generic `to_dict` method for SQLAlchemy models."""

    serialize_rules = ()

    def to_dict(self):
        data = {}
        excluded = set(getattr(self, "serialize_rules", ()))

        for column in self.__table__.columns:
            key = column.key
            if key in excluded:
                continue

            value = getattr(self, key)
            if isinstance(value, (datetime, date)):
                value = value.isoformat()
            data[key] = value
        return data


class Admin(UserMixin, SerializerMixin, db.Model):
    __tablename__ = "admins"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    serialize_rules = ("password_hash",)


class FeesStructure(SerializerMixin, db.Model):
    __tablename__ = "fees_structures"

    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False)
    prospectus_fees = db.Column(db.Float, default=0.0)
    tuition_fees = db.Column(db.Float, default=0.0)
    development_fees = db.Column(db.Float, default=0.0)
    training_placement_fees = db.Column(db.Float, default=0.0)
    iste_fees = db.Column(db.Float, default=0.0)
    library_lab_fees = db.Column(db.Float, default=0.0)
    student_insurance = db.Column(db.Float, default=0.0)
    total_fees = db.Column(db.Float, default=0.0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AdmissionDocuments(SerializerMixin, db.Model):
    __tablename__ = "admission_documents"

    id = db.Column(db.Integer, primary_key=True)
    admission_type = db.Column(db.String(50), nullable=False)
    document_name = db.Column(db.String(200), nullable=False)
    is_required = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)


class LibraryBooks(SerializerMixin, db.Model):
    __tablename__ = "library_books"

    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(100), nullable=False)
    book_count = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)


class LibraryTimings(SerializerMixin, db.Model):
    __tablename__ = "library_timings"

    id = db.Column(db.Integer, primary_key=True)
    issue_start_time = db.Column(db.String(10), nullable=False)
    issue_end_time = db.Column(db.String(10), nullable=False)
    return_start_time = db.Column(db.String(10), nullable=False)
    return_end_time = db.Column(db.String(10), nullable=False)
    lunch_break_start = db.Column(db.String(10), nullable=False)
    lunch_break_end = db.Column(db.String(10), nullable=False)


class HostelInfo(SerializerMixin, db.Model):
    __tablename__ = "hostel_information"

    id = db.Column(db.Integer, primary_key=True)
    facility_name = db.Column(db.String(200), nullable=False)
    is_available = db.Column(db.Boolean, default=True)
    hostel_fees_per_semester = db.Column(db.Float, default=0.0)
    mess_fees_per_month = db.Column(db.Float, default=0.0)


class Scholarships(SerializerMixin, db.Model):
    __tablename__ = "scholarships"

    id = db.Column(db.Integer, primary_key=True)
    scholarship_name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.String(100), nullable=False)
    eligibility = db.Column(db.Text, nullable=False)
    documents_required = db.Column(db.Text, nullable=False)
    is_active = db.Column(db.Boolean, default=True)


class Faculty(SerializerMixin, db.Model):
    __tablename__ = "faculty"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    designation = db.Column(db.String(100), nullable=False)
    subjects_taught = db.Column(db.Text, default="")
    contact = db.Column(db.String(20), default="")
    email = db.Column(db.String(100), default="")
    photo_url = db.Column(db.String(500), default="")


class PrincipalInfo(SerializerMixin, db.Model):
    __tablename__ = "principal_info"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    education = db.Column(db.Text, nullable=False)
    achievements = db.Column(db.Text, default="")
    medals = db.Column(db.Text, default="")
    contact = db.Column(db.String(20), default="")
    email = db.Column(db.String(100), default="")
    photo_url = db.Column(db.String(500), default="")


class Events(SerializerMixin, db.Model):
    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True)
    event_name = db.Column(db.String(200), nullable=False)
    event_type = db.Column(db.String(50), nullable=False)
    event_date = db.Column(db.Date, nullable=False)
    description = db.Column(db.Text, default="")
    is_active = db.Column(db.Boolean, default=True)


class CollegeTimings(SerializerMixin, db.Model):
    __tablename__ = "college_timings"

    id = db.Column(db.Integer, primary_key=True)
    opening_time = db.Column(db.String(10), nullable=False)
    closing_time = db.Column(db.String(10), nullable=False)
    saturday_opening = db.Column(db.String(10), nullable=False)
    saturday_closing = db.Column(db.String(10), nullable=False)


class StudentFeesPayment(SerializerMixin, db.Model):
    __tablename__ = "student_fees_payments"

    id = db.Column(db.Integer, primary_key=True)
    student_name = db.Column(db.String(200), nullable=False)
    student_id = db.Column(db.String(50), nullable=False)
    admission_year = db.Column(db.String(10), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    total_fees = db.Column(db.Float, default=0.0)
    paid_amount = db.Column(db.Float, default=0.0)
    remaining_amount = db.Column(db.Float, default=0.0)
    payment_date = db.Column(db.DateTime, default=datetime.utcnow)
    receipt_number = db.Column(db.String(100), nullable=False)
    semester = db.Column(db.String(20), nullable=False)


class HelpTickets(SerializerMixin, db.Model):
    __tablename__ = "help_tickets"

    id = db.Column(db.Integer, primary_key=True)
    student_name = db.Column(db.String(200), nullable=False)
    contact = db.Column(db.String(100), nullable=False)
    topic = db.Column(db.String(100))
    query_text = db.Column("query", db.Text, nullable=False)
    pdf_filename = db.Column(db.String(255))
    status = db.Column(db.String(50), default="Open")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, server_default=func.now())
    resolved_at = db.Column(db.DateTime)

    def to_dict(self):
        data = super().to_dict()
        # Handle both possible key names (attribute name "query_text" or column name "query")
        # Directly get the value from the attribute to ensure we always have it
        query_value = getattr(self, "query_text", None) or data.pop("query_text", None) or data.pop("query", None) or ""
        data["query"] = query_value
        return data
