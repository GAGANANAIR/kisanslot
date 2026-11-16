import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.payment import Payment, PaymentStatus
from app.models.user import User, UserRole
from app.schemas.payment import PaymentResponse, PaymentUpdate
from app.api.deps import require_role, get_current_user
from app.services.queue_manager import QueueManager

router = APIRouter(prefix="/payments", tags=["Payments"])

def _format_payment_response(p: Payment) -> dict:
    farmer_name = p.farmer.name if p.farmer else ""
    crop_name = p.procurement.crop.name if p.procurement and p.procurement.crop else ""
    code = p.procurement.booking.booking_code if p.procurement and p.procurement.booking else ""
    return {
        "id": p.id,
        "procurement_id": p.procurement_id,
        "farmer_id": p.farmer_id,
        "amount": p.amount,
        "status": p.status,
        "reference_number": p.reference_number,
        "payment_mode": p.payment_mode,
        "paid_at": p.paid_at,
        "created_at": p.created_at,
        "farmer_name": farmer_name,
        "crop_name": crop_name,
        "booking_code": code
    }

@router.get("/farmer", response_model=List[PaymentResponse])
def get_farmer_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    payments = db.query(Payment).filter(
        Payment.farmer_id == current_user.id
    ).order_by(Payment.created_at.desc()).all()
    return [_format_payment_response(p) for p in payments]

@router.get("/all", response_model=List[PaymentResponse])
def get_all_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR))
):
    payments = db.query(Payment).order_by(Payment.created_at.desc()).all()
    return [_format_payment_response(p) for p in payments]

@router.post("/{id}/mark-paid", response_model=PaymentResponse)
async def mark_payment_paid(
    id: int,
    payment_in: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR))
):
    ref = payment_in.reference_number or f"DBT-PFMS-{uuid.uuid4().hex[:8].upper()}"
    try:
        payment = await QueueManager.disburse_payment(
            db=db,
            payment_id=id,
            reference_no=ref,
            payment_mode=payment_in.payment_mode or "Direct Benefit Transfer (DBT)"
        )
        return _format_payment_response(payment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
