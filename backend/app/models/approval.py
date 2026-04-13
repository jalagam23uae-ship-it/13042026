from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from app.database import Base


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(30), nullable=False)  # course_publish, enrollment, certificate
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_id = Column(Integer, nullable=False)  # course_id, enrollment course_id, or certificate course_id
    status = Column(String(20), server_default="pending")  # pending, approved, rejected
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    comments = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True))
