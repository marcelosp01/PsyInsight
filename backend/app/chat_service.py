from collections.abc import AsyncIterator
from datetime import date
from typing import Any

from pydantic import BaseModel, Field, create_model

from app import gemini_client
from app.database import SessionLocal
from app.document_types import DOCUMENT_TYPES, build_extraction_model, list_document_types
from app.models import ChatMessage, ChatSession, User, UserMemory
from app.schemas import DocumentTypeOut

_MESES_PT = {
    1: "janeiro",
    2: "fevereiro",
    3: "março",
    4: "abril",
    5: "maio",
    6: "junho",
    7: "julho",
    8: "agosto",
    9: "setembro",
    10: "outubro",
    11: "novembro",
    12: "dezembro",
}


def _format_cidade_data(local_atendimento: str, today: date) -> str:
    data_str = f"{today.day} de {_MESES_PT[today.month]} de {today.year}"
    local = local_atendimento.strip()
    return f"{local}, {data_str}" if local else data_str


def build_signature_values(user: User) -> dict[str, str]:
    """Bloco de assinatura (nome, CRP, local e data) preenchido automaticamente a
    partir do perfil do usuário e da data de hoje — nunca perguntado pela IA
    (ver `DocumentField.auto_filled`)."""
    return {
        "profissional_nome": user.name,
        "profissional_crp": user.crp,
        "cidade_data": _format_cidade_data(user.local_atendimento, date.today()),
    }


def _role_for_gemini(role: str) -> str:
    return "model" if role == "assistant" else "user"


def build_modality_selection_instruction() -> str:
    options = "\n".join(
        f"- {dt.slug}: {dt.name} ({dt.article}) — {dt.description}"
        for dt in list_document_types()
    )
    return (
        "Você é um assistente que ajuda um(a) psicólogo(a) a escolher, no início da "
        "conversa, qual modalidade de documento da Resolução CFP nº 06/2019 precisa "
        "elaborar. Cumprimente brevemente e pergunte o que a pessoa precisa produzir. "
        "Se ela descrever a situação em vez de nomear a modalidade diretamente, "
        "sugira a mais adequada dentre as disponíveis:\n\n"
        f"{options}\n\n"
        "Assim que tiver certeza de qual modalidade foi escolhida, confirme em uma "
        "frase curta — o sistema vai iniciar automaticamente a entrevista para "
        "aquela modalidade, então não é preciso pedir mais confirmações depois disso."
    )


def build_modality_extraction_instruction() -> str:
    return (
        "A seguir está uma conversa entre um(a) psicólogo(a) e um assistente sobre "
        "qual modalidade de documento (dentre as previstas na Resolução CFP nº "
        "06/2019) deve ser elaborada. Extraia o slug da modalidade já escolhida com "
        "clareza; caso ainda não esteja claro, deixe nulo."
    )


def build_modality_selection_model() -> type[BaseModel]:
    valid_slugs = ", ".join(f'"{slug}"' for slug in DOCUMENT_TYPES)
    return create_model(
        "ModalitySelection",
        slug=(
            str | None,
            Field(default=None, description=f"Um destes slugs: {valid_slugs}. Ou nulo."),
        ),
    )


async def run_modality_selection_turn(
    *, history: list[tuple[str, str]], user_message: str | None
) -> AsyncIterator[dict]:
    """Turno de chat sem sessão persistida: ajuda o(a) psicólogo(a) a escolher a
    modalidade do documento antes de uma sessão de entrevista (ChatSession) existir.
    """
    gemini_history = [(_role_for_gemini(role), text) for role, text in history]

    chunks: list[str] = []
    try:
        async for chunk in gemini_client.stream_chat_reply(
            system_instruction=build_modality_selection_instruction(),
            history=gemini_history,
            user_message=user_message,
        ):
            chunks.append(chunk)
            yield {"type": "token", "text": chunk}
    except Exception:
        yield {"type": "error", "detail": "Não foi possível obter resposta da IA. Tente novamente."}
        return

    assistant_text = "".join(chunks)
    full_history = list(gemini_history)
    if user_message:
        full_history.append(("user", user_message))
    full_history.append(("model", assistant_text))

    try:
        extracted = await gemini_client.extract_structured_values(
            system_instruction=build_modality_extraction_instruction(),
            history=full_history,
            schema=build_modality_selection_model(),
        )
    except Exception:
        yield {"type": "done"}
        return

    if extracted.slug in DOCUMENT_TYPES:
        yield {"type": "document_type", "slug": extracted.slug}

    yield {"type": "done"}


def build_chat_instruction(
    document_type: DocumentTypeOut, values: dict[str, str], memory: str
) -> str:
    filled = (
        "\n".join(
            f"- {field.label}: {values[field.key]}"
            for field in document_type.fields
            if not field.auto_filled and (values.get(field.key) or "").strip()
        )
        or "(nenhum campo preenchido ainda)"
    )
    pending = (
        "\n".join(
            f"- {field.label}{' (obrigatório)' if field.required else ''}"
            + (f" — {field.help_text}" if field.help_text else "")
            for field in document_type.fields
            if not field.auto_filled and not (values.get(field.key) or "").strip()
        )
        or "(todos os campos já têm alguma informação)"
    )
    memory_block = (
        f"\n\nPreferências de padronização que este(a) psicólogo(a) já pediu para lembrar "
        f"em laudos anteriores — aplique-as sem perguntar de novo:\n{memory}"
        if memory.strip()
        else ""
    )

    return (
        f'Você é um assistente que entrevista um(a) psicólogo(a) para redigir um documento do '
        f'tipo "{document_type.name}" ({document_type.article} da Resolução CFP nº 06/2019: '
        f"{document_type.description}).\n\n"
        "Conduza a entrevista de forma objetiva, uma pergunta por vez, para coletar as "
        "informações que faltam. Use linguagem técnica adequada a documentos psicológicos, "
        "mas seja conversacional. Nunca invente informações clínicas — registre apenas o que "
        "o profissional disser. Se o profissional pedir para você lembrar de alguma preferência "
        "de padronização para laudos futuros, confirme que vai lembrar.\n\n"
        f"Campos já preenchidos:\n{filled}\n\nCampos que ainda faltam:\n{pending}"
        f"{memory_block}"
    )


def build_extraction_instruction(document_type: DocumentTypeOut) -> str:
    return (
        "A seguir está uma conversa entre um(a) psicólogo(a) e um assistente sobre um "
        f'documento do tipo "{document_type.name}". Extraia, para cada campo, o valor mais '
        "atualizado mencionado na conversa (em texto corrido, com linguagem técnica "
        "apropriada), ou deixe nulo se ainda não foi mencionado. Quando um campo pedir o "
        "texto corrido e contínuo de todo o corpo do documento (não um dado isolado), "
        "redija você mesmo(a) esse texto, articulando com linguagem técnica formal a "
        "partir do que foi conversado — não apenas repita as palavras literais do "
        "profissional — e atualize-o por completo a cada novo turno, incorporando as "
        "informações mais recentes. Preencha 'memory_note' apenas se o profissional pediu "
        "explicitamente para lembrar de algo para laudos futuros; caso contrário, deixe nulo."
    )


def merge_values(current: dict[str, str], extracted: dict[str, Any]) -> dict[str, str]:
    """Só sobrescreve com valores não vazios: a IA nunca 'apaga' o que já foi
    confirmado em turnos anteriores só porque não mencionou o campo de novo."""
    merged = dict(current)
    for key, value in extracted.items():
        if isinstance(value, str) and value.strip():
            merged[key] = value.strip()
    return merged


async def run_chat_turn(
    *,
    session_id: int,
    user_id: int,
    document_type: DocumentTypeOut,
    history: list[tuple[str, str]],
    current_values: dict[str, str],
    memory: str,
    user_message: str | None,
) -> AsyncIterator[dict]:
    """Gera os eventos SSE (dict) de um turno de conversa.

    Abre suas próprias sessões de banco (SessionLocal) em vez de reusar a
    injetada pela rota via Depends(get_db): o FastAPI encerra essa dependência
    assim que a função da rota retorna o StreamingResponse, antes deste
    generator ser de fato consumido enquanto a resposta é transmitida.
    """
    chat_instruction = build_chat_instruction(document_type, current_values, memory)
    gemini_history = [(_role_for_gemini(role), text) for role, text in history]

    chunks: list[str] = []
    try:
        async for chunk in gemini_client.stream_chat_reply(
            system_instruction=chat_instruction,
            history=gemini_history,
            user_message=user_message,
        ):
            chunks.append(chunk)
            yield {"type": "token", "text": chunk}
    except Exception:
        yield {"type": "error", "detail": "Não foi possível obter resposta da IA. Tente novamente."}
        return

    assistant_text = "".join(chunks)

    with SessionLocal() as db:
        if user_message:
            db.add(ChatMessage(session_id=session_id, role="user", content=user_message))
        db.add(ChatMessage(session_id=session_id, role="assistant", content=assistant_text))
        db.commit()

    full_history = list(gemini_history)
    if user_message:
        full_history.append(("user", user_message))
    full_history.append(("model", assistant_text))

    try:
        extracted = await gemini_client.extract_structured_values(
            system_instruction=build_extraction_instruction(document_type),
            history=full_history,
            schema=build_extraction_model(document_type),
        )
    except Exception:
        yield {"type": "error", "detail": "Não foi possível atualizar os campos automaticamente."}
        yield {"type": "done"}
        return

    extracted_values = extracted.model_dump(exclude={"memory_note"})
    memory_note = (extracted.memory_note or "").strip()
    new_values = merge_values(current_values, extracted_values)

    with SessionLocal() as db:
        session = db.get(ChatSession, session_id)
        session.values = new_values
        db.commit()

    yield {"type": "values", "values": new_values}

    if memory_note:
        with SessionLocal() as db:
            user_memory = db.query(UserMemory).filter(UserMemory.user_id == user_id).first()
            if user_memory is None:
                user_memory = UserMemory(user_id=user_id, content="")
                db.add(user_memory)
            user_memory.content = f"{user_memory.content}\n- {memory_note}".strip()
            db.commit()
        yield {"type": "memory", "note": memory_note}

    yield {"type": "done"}
