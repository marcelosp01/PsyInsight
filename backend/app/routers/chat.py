import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.chat_service import build_signature_values, run_chat_turn, run_modality_selection_turn
from app.database import get_db
from app.document_types import get_document_type
from app.models import ChatSession, User, UserMemory
from app.routers.saved_documents import get_owned_document
from app.schemas import (
    ChatMessageCreate,
    ChatSessionCreate,
    ChatSessionOut,
    ModalitySelectionRequest,
)

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/modality-selection")
def select_modality(
    payload: ModalitySelectionRequest,
    current_user: User = Depends(get_current_user),
):
    if payload.content is None and payload.history:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Só é possível abrir a conversa sem mensagem quando ela ainda não tem histórico.",
        )

    history = [(message.role, message.content) for message in payload.history]

    async def event_stream():
        async for event in run_modality_selection_turn(history=history, user_message=payload.content):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _get_owned_session(db: Session, session_id: int, current_user: User) -> ChatSession:
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Sessão de chat não encontrada."
        )
    return session


@router.post("/sessions", response_model=ChatSessionOut, status_code=status.HTTP_201_CREATED)
def create_or_resume_session(
    payload: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document_type = get_document_type(payload.document_type)
    if document_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Modalidade de documento desconhecida."
        )

    # Sempre recalculado a partir do perfil atual + data de hoje: o bloco de
    # assinatura nunca fica "congelado" com dados antigos do usuário ou de uma
    # data passada, mesmo ao reabrir uma conversa/laudo já existente.
    signature_values = build_signature_values(current_user)

    if payload.saved_document_id is not None:
        saved_document = get_owned_document(db, payload.saved_document_id, current_user)
        existing = (
            db.query(ChatSession)
            .filter(
                ChatSession.saved_document_id == saved_document.id,
                ChatSession.user_id == current_user.id,
            )
            .first()
        )
        if existing is not None:
            existing.values = {**existing.values, **signature_values}
            db.commit()
            db.refresh(existing)
            return existing
        session = ChatSession(
            user_id=current_user.id,
            document_type=saved_document.document_type,
            saved_document_id=saved_document.id,
            values={**saved_document.values, **signature_values},
        )
    else:
        session = ChatSession(
            user_id=current_user.id,
            document_type=document_type.slug,
            values=signature_values,
        )

    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/sessions/{session_id}/messages")
def send_message(
    session_id: int,
    payload: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_owned_session(db, session_id, current_user)
    document_type = get_document_type(session.document_type)
    if document_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Modalidade de documento desconhecida."
        )

    if payload.content is None and session.messages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Só é possível abrir a conversa sem mensagem quando ela ainda não tem histórico.",
        )

    history = [(message.role, message.content) for message in session.messages]
    current_values = dict(session.values)
    user_memory = db.query(UserMemory).filter(UserMemory.user_id == current_user.id).first()
    memory_content = user_memory.content if user_memory else ""

    async def event_stream():
        async for event in run_chat_turn(
            session_id=session.id,
            user_id=current_user.id,
            document_type=document_type,
            history=history,
            current_values=current_values,
            memory=memory_content,
            user_message=payload.content,
        ):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
