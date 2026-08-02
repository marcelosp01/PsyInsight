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


class SavedDocumentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    document_type: str
    values: dict[str, str]


class SavedDocumentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    values: dict[str, str] | None = None


class SavedDocumentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    document_type: str
    updated_at: datetime


class SavedDocumentOut(SavedDocumentSummary):
    values: dict[str, str]
    created_at: datetime


class ChatSessionCreate(BaseModel):
    document_type: str
    saved_document_id: int | None = None


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    content: str
    created_at: datetime


class ChatSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_type: str
    saved_document_id: int | None
    values: dict[str, str]
    messages: list[ChatMessageOut]


class ChatMessageCreate(BaseModel):
    content: str | None = Field(default=None, min_length=1, max_length=8000)
