from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class CheckInRequest(BaseModel):
    session_id: int


class CheckOutRequest(BaseModel):
    session_id: int


class AttendanceOut(BaseModel):
    id: int
    user_id: int
    session_id: int
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    hours_spent: Optional[Decimal] = None
    status: Optional[str] = None

    model_config = {"from_attributes": True}


class AttendanceSummary(BaseModel):
    total_sessions: int
    attended: int
    total_hours: float
    attendance_rate: float
