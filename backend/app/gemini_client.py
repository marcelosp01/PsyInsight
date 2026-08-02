from collections.abc import AsyncIterator

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.config import settings

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def _to_content(role: str, text: str) -> types.Content:
    return types.Content(role=role, parts=[types.Part(text=text)])


async def stream_chat_reply(
    *, system_instruction: str, history: list[tuple[str, str]], user_message: str | None
) -> AsyncIterator[str]:
    """Resposta conversacional em streaming, texto puro (sem response_schema —
    não é confiável misturar JSON parcial com texto solto em streaming)."""
    contents = [_to_content(role, text) for role, text in history]
    contents.append(_to_content("user", user_message or "Vamos começar."))

    stream = await _get_client().aio.models.generate_content_stream(
        model=settings.gemini_chat_model,
        contents=contents,
        config=types.GenerateContentConfig(system_instruction=system_instruction),
    )
    async for chunk in stream:
        if chunk.text:
            yield chunk.text


async def extract_structured_values(
    *, system_instruction: str, history: list[tuple[str, str]], schema: type[BaseModel]
) -> BaseModel:
    """Chamada síncrona (não-streaming) com response_schema rígido, para
    extrair/atualizar os campos do documento a partir da conversa até aqui."""
    contents = [_to_content(role, text) for role, text in history]

    response = await _get_client().aio.models.generate_content(
        model=settings.gemini_extraction_model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=schema,
        ),
    )
    return response.parsed
