from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    crp: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    crp: str
    created_at: datetime


class DocumentField(BaseModel):
    key: str
    label: str
    kind: str  # "text" | "textarea" | "date"
    required: bool = True
    help_text: str | None = None


class DocumentTypeOut(BaseModel):
    slug: str
    name: str
    article: str
    description: str
    fields: list[DocumentField]


class DocumentGenerateRequest(BaseModel):
    document_type: str
    values: dict[str, str]
