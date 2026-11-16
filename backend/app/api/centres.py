from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.centre import Centre
from app.models.crop import Crop
from app.models.user import User, UserRole
from app.schemas.centre import CentreResponse, CentreCreate
from app.api.deps import require_role, get_current_user

router = APIRouter(prefix="/centres", tags=["Centres"])

@router.get("", response_model=List[CentreResponse])
def list_centres(db: Session = Depends(get_db)):
    return db.query(Centre).filter(Centre.is_active == True).all()

@router.get("/{id}", response_model=CentreResponse)
def get_centre(id: int, db: Session = Depends(get_db)):
    centre = db.query(Centre).filter(Centre.id == id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")
    return centre

@router.post("", response_model=CentreResponse)
def create_centre(
    centre_in: CentreCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    centre = Centre(
        name=centre_in.name,
        district=centre_in.district,
        state=centre_in.state,
        address=centre_in.address,
        counters_count=centre_in.counters_count,
        daily_capacity_quintals=centre_in.daily_capacity_quintals,
        operating_hours_start=centre_in.operating_hours_start,
        operating_hours_end=centre_in.operating_hours_end,
        is_active=centre_in.is_active
    )
    if centre_in.crop_ids:
        crops = db.query(Crop).filter(Crop.id.in_(centre_in.crop_ids)).all()
        centre.accepted_crops = crops
    db.add(centre)
    db.commit()
    db.refresh(centre)
    return centre
