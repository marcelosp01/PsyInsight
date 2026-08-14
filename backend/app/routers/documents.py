from fastapi import APIRouter, Depends, HTTPException, Response, status

from app import logo_service
from app.auth import get_current_user
from app.document_types import get_document_type, list_document_types
from app.models import User
from app.pdf import render_document_pdf
from app.schemas import DocumentGenerateRequest, DocumentTypeOut

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("/types", response_model=list[DocumentTypeOut])
def get_document_types(current_user: User = Depends(get_current_user)):
    return list_document_types()


@router.post("/pdf")
def generate_pdf(
    payload: DocumentGenerateRequest, current_user: User = Depends(get_current_user)
):
    document_type = get_document_type(payload.document_type)
    if document_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modalidade de documento desconhecida.",
        )

    missing = [
        field.label
        for field in document_type.fields
        if field.required and not (payload.values.get(field.key) or "").strip()
    ]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Campos obrigatórios não preenchidos: {', '.join(missing)}",
        )

    logo_path = logo_service.logo_path_for(current_user.id) if current_user.has_logo else None
    pdf_bytes = render_document_pdf(document_type, payload.values, logo_path)
    filename = f"{document_type.slug}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
