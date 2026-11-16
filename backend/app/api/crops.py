from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.crop import Crop
from app.models.user import User, UserRole
from app.schemas.crop import CropResponse, CropCreate
from app.api.deps import require_role

router = APIRouter(prefix="/crops", tags=["Crops"])

@router.get("", response_model=List[CropResponse])
def list_crops(db: Session = Depends(get_db)):
    return db.query(Crop).all()

@router.post("", response_model=CropResponse)
def create_crop(
    crop_in: CropCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    crop = Crop(**crop_in.model_dump())
    db.add(crop)
    db.commit()
    db.refresh(crop)
    return crop
