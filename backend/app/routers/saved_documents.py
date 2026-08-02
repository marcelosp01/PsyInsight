from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.document_types import get_document_type
from app.models import ChatSession, SavedDocument, User
from app.schemas import SavedDocumentCreate, SavedDocumentOut, SavedDocumentSummary, SavedDocumentUpdate

router = APIRouter(prefix="/api/documents/saved", tags=["saved-documents"])


def get_owned_document(db: Session, document_id: int, current_user: User) -> SavedDocument:
    document = (
        db.query(SavedDocument)
        .filter(SavedDocument.id == document_id, SavedDocument.user_id == current_user.id)
        .first()
    )
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Laudo salvo não encontrado."
        )
    return document


def _validate_values(document_type_slug: str, values: dict[str, str]) -> None:
    document_type = get_document_type(document_type_slug)
    if document_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modalidade de documento desconhecida.",
        )

    missing = [
        field.label
        for field in document_type.fields
        if field.required and not (values.get(field.key) or "").strip()
    ]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Campos obrigatórios não preenchidos: {', '.join(missing)}",
        )


@router.get("", response_model=list[SavedDocumentSummary])
def list_saved_documents(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return (
        db.query(SavedDocument)
        .filter(SavedDocument.user_id == current_user.id)
        .order_by(SavedDocument.updated_at.desc())
        .all()
    )


@router.post("", response_model=SavedDocumentOut, status_code=status.HTTP_201_CREATED)
def create_saved_document(
    payload: SavedDocumentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _validate_values(payload.document_type, payload.values)

    document = SavedDocument(
        user_id=current_user.id,
        document_type=payload.document_type,
        title=payload.title,
        values=payload.values,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.get("/{document_id}", response_model=SavedDocumentOut)
def get_saved_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_owned_document(db, document_id, current_user)


@router.put("/{document_id}", response_model=SavedDocumentOut)
def update_saved_document(
    document_id: int,
    payload: SavedDocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_owned_document(db, document_id, current_user)
    if payload.values is not None:
        _validate_values(document.document_type, payload.values)
        document.values = payload.values
    if payload.title is not None:
        document.title = payload.title
    db.commit()
    db.refresh(document)
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_owned_document(db, document_id, current_user)
    chat_session = (
        db.query(ChatSession).filter(ChatSession.saved_document_id == document.id).first()
    )
    if chat_session is not None:
        db.delete(chat_session)
    db.delete(document)
    db.commit()
