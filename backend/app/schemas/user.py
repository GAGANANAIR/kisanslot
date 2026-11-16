from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.user import UserRole, LanguagePreference

class UserRegister(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15, description="Mobile number")
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.FARMER
    language_pref: LanguagePreference = LanguagePreference.EN

class UserLogin(BaseModel):
    phone: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: UserRole
    name: str
    phone: str
    language_pref: LanguagePreference
    id: int

class UserResponse(BaseModel):
    id: int
    phone: str
    name: str
    role: UserRole
    language_pref: LanguagePreference
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdateLang(BaseModel):
    language_pref: LanguagePreference
