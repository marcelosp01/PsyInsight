from collections.abc import AsyncIterator
from typing import Any

from app import gemini_client
from app.database import SessionLocal
from app.document_types import build_extraction_model
from app.models import ChatMessage, ChatSession, UserMemory
from app.schemas import DocumentTypeOut


def _role_for_gemini(role: str) -> str:
    return "model" if role == "assistant" else "user"


def build_chat_instruction(
    document_type: DocumentTypeOut, values: dict[str, str], memory: str
) -> str:
    filled = (
        "\n".join(
            f"- {field.label}: {values[field.key]}"
            for field in document_type.fields
            if (values.get(field.key) or "").strip()
        )
        or "(nenhum campo preenchido ainda)"
    )
    pending = (
        "\n".join(
            f"- {field.label}{' (obrigatório)' if field.required else ''}"
            + (f" — {field.help_text}" if field.help_text else "")
            for field in document_type.fields
            if not (values.get(field.key) or "").strip()
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
        "apropriada), ou deixe nulo se ainda não foi mencionado. Preencha 'memory_note' "
        "apenas se o profissional pediu explicitamente para lembrar de algo para laudos "
        "futuros; caso contrário, deixe nulo."
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
