import json

from app import gemini_client

_VALID_VALUES = {
    "profissional_nome": "Ana Souza",
    "profissional_crp": "06/12345",
    "cidade_data": "São Paulo, 31 de julho de 2026",
    "texto_declaracao": "João da Silva, 30 anos, compareceu a 4 sessões de atendimento psicológico.",
}


def _iter_events(response):
    events = []
    for line in response.iter_lines():
        if line.startswith("data: "):
            events.append(json.loads(line[len("data: ") :]))
    return events


async def _fake_stream_chat_reply(*, system_instruction, history, user_message):
    for chunk in ["Olá! ", "Como posso ajudar?"]:
        yield chunk


def _make_fake_extraction(values: dict[str, str], memory_note: str | None = None):
    async def _fake_extract_structured_values(*, system_instruction, history, schema):
        return schema(memory_note=memory_note, **values)

    return _fake_extract_structured_values


def _create_saved_document(client):
    return client.post(
        "/api/documents/saved",
        json={"title": "Laudo João", "document_type": "declaracao", "values": _VALID_VALUES},
    ).json()


def _login_as_other_user(client):
    client.post("/api/auth/logout")
    client.post(
        "/api/auth/signup",
        json={
            "name": "Outra Pessoa",
            "email": "outra@example.com",
            "crp": "06/54321",
            "password": "outra-senha-123",
        },
    )


def test_create_session_requires_authentication(client):
    response = client.post("/api/chat/sessions", json={"document_type": "declaracao"})
    assert response.status_code == 401


def test_create_session_rejects_unknown_document_type(signed_up_client):
    response = signed_up_client.post("/api/chat/sessions", json={"document_type": "inexistente"})
    assert response.status_code == 404


def test_create_new_session_seeds_professional_data_from_current_user(signed_up_client):
    response = signed_up_client.post("/api/chat/sessions", json={"document_type": "declaracao"})

    assert response.status_code == 201
    body = response.json()
    assert body["values"] == {"profissional_nome": "Ana Souza", "profissional_crp": "06/12345"}
    assert body["messages"] == []
    assert body["saved_document_id"] is None


def test_create_session_from_saved_document_seeds_values(signed_up_client):
    saved = _create_saved_document(signed_up_client)

    response = signed_up_client.post(
        "/api/chat/sessions", json={"document_type": "declaracao", "saved_document_id": saved["id"]}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["values"] == _VALID_VALUES
    assert body["saved_document_id"] == saved["id"]


def test_create_session_from_saved_document_resumes_existing_session(signed_up_client):
    saved = _create_saved_document(signed_up_client)
    payload = {"document_type": "declaracao", "saved_document_id": saved["id"]}

    first = signed_up_client.post("/api/chat/sessions", json=payload).json()
    second = signed_up_client.post("/api/chat/sessions", json=payload).json()

    assert first["id"] == second["id"]


def test_create_session_rejects_saved_document_owned_by_another_user(signed_up_client):
    saved = _create_saved_document(signed_up_client)

    _login_as_other_user(signed_up_client)
    response = signed_up_client.post(
        "/api/chat/sessions", json={"document_type": "declaracao", "saved_document_id": saved["id"]}
    )

    assert response.status_code == 404


def test_send_message_requires_authentication(client):
    response = client.post("/api/chat/sessions/1/messages", json={"content": "oi"})
    assert response.status_code == 401


def test_send_message_rejects_session_owned_by_another_user(signed_up_client):
    session = signed_up_client.post("/api/chat/sessions", json={"document_type": "declaracao"}).json()

    _login_as_other_user(signed_up_client)
    response = signed_up_client.post(
        f"/api/chat/sessions/{session['id']}/messages", json={"content": "oi"}
    )

    assert response.status_code == 404


def test_send_message_rejects_null_content_once_history_exists(signed_up_client, monkeypatch):
    monkeypatch.setattr(gemini_client, "stream_chat_reply", _fake_stream_chat_reply)
    monkeypatch.setattr(gemini_client, "extract_structured_values", _make_fake_extraction({}))
    session = signed_up_client.post("/api/chat/sessions", json={"document_type": "declaracao"}).json()

    with signed_up_client.stream(
        "POST", f"/api/chat/sessions/{session['id']}/messages", json={"content": None}
    ) as response:
        list(_iter_events(response))

    response = signed_up_client.post(
        f"/api/chat/sessions/{session['id']}/messages", json={"content": None}
    )
    assert response.status_code == 400


def test_send_message_streams_tokens_and_updates_values(signed_up_client, monkeypatch):
    monkeypatch.setattr(gemini_client, "stream_chat_reply", _fake_stream_chat_reply)
    monkeypatch.setattr(
        gemini_client,
        "extract_structured_values",
        _make_fake_extraction({"texto_declaracao": "João da Silva, 30 anos."}),
    )
    saved = _create_saved_document(signed_up_client)
    session_payload = {"document_type": "declaracao", "saved_document_id": saved["id"]}
    session = signed_up_client.post("/api/chat/sessions", json=session_payload).json()

    with signed_up_client.stream(
        "POST",
        f"/api/chat/sessions/{session['id']}/messages",
        json={"content": "Meu paciente é o João da Silva, 30 anos."},
    ) as response:
        events = _iter_events(response)

    token_events = [e for e in events if e["type"] == "token"]
    assert "".join(e["text"] for e in token_events) == "Olá! Como posso ajudar?"
    values_events = [e for e in events if e["type"] == "values"]
    assert values_events[-1]["values"]["texto_declaracao"] == "João da Silva, 30 anos."
    assert events[-1]["type"] == "done"

    resumed = signed_up_client.post("/api/chat/sessions", json=session_payload).json()
    assert resumed["values"]["texto_declaracao"] == "João da Silva, 30 anos."


def test_send_message_does_not_overwrite_values_with_empty_extraction(signed_up_client, monkeypatch):
    monkeypatch.setattr(gemini_client, "stream_chat_reply", _fake_stream_chat_reply)
    session = signed_up_client.post("/api/chat/sessions", json={"document_type": "declaracao"}).json()

    monkeypatch.setattr(
        gemini_client, "extract_structured_values", _make_fake_extraction({"texto_declaracao": "João"})
    )
    with signed_up_client.stream(
        "POST", f"/api/chat/sessions/{session['id']}/messages", json={"content": "primeira msg"}
    ) as response:
        list(_iter_events(response))

    monkeypatch.setattr(gemini_client, "extract_structured_values", _make_fake_extraction({}))
    with signed_up_client.stream(
        "POST", f"/api/chat/sessions/{session['id']}/messages", json={"content": "segunda msg"}
    ) as response:
        events = _iter_events(response)

    values_events = [e for e in events if e["type"] == "values"]
    assert values_events[-1]["values"]["texto_declaracao"] == "João"


def test_send_message_persists_memory_note_when_present(signed_up_client, monkeypatch):
    monkeypatch.setattr(gemini_client, "stream_chat_reply", _fake_stream_chat_reply)
    monkeypatch.setattr(
        gemini_client,
        "extract_structured_values",
        _make_fake_extraction({}, memory_note="Sempre citar o CID quando autorizado."),
    )
    session = signed_up_client.post("/api/chat/sessions", json={"document_type": "declaracao"}).json()

    with signed_up_client.stream(
        "POST", f"/api/chat/sessions/{session['id']}/messages", json={"content": "Lembre disso."}
    ) as response:
        events = _iter_events(response)

    memory_events = [e for e in events if e["type"] == "memory"]
    assert memory_events == [{"type": "memory", "note": "Sempre citar o CID quando autorizado."}]


def test_send_message_streams_error_event_when_chat_reply_fails(signed_up_client, monkeypatch):
    async def _failing_stream(*, system_instruction, history, user_message):
        raise RuntimeError("boom")
        yield  # pragma: no cover - only needed to keep this an async generator function

    monkeypatch.setattr(gemini_client, "stream_chat_reply", _failing_stream)
    session = signed_up_client.post("/api/chat/sessions", json={"document_type": "declaracao"}).json()

    with signed_up_client.stream(
        "POST", f"/api/chat/sessions/{session['id']}/messages", json={"content": "oi"}
    ) as response:
        events = _iter_events(response)

    assert events == [
        {"type": "error", "detail": "Não foi possível obter resposta da IA. Tente novamente."}
    ]


def test_send_message_streams_error_event_when_extraction_fails(signed_up_client, monkeypatch):
    async def _failing_extract(*, system_instruction, history, schema):
        raise RuntimeError("boom")

    monkeypatch.setattr(gemini_client, "stream_chat_reply", _fake_stream_chat_reply)
    monkeypatch.setattr(gemini_client, "extract_structured_values", _failing_extract)
    session = signed_up_client.post("/api/chat/sessions", json={"document_type": "declaracao"}).json()

    with signed_up_client.stream(
        "POST", f"/api/chat/sessions/{session['id']}/messages", json={"content": "oi"}
    ) as response:
        events = _iter_events(response)

    assert events[-2] == {
        "type": "error",
        "detail": "Não foi possível atualizar os campos automaticamente.",
    }
    assert events[-1] == {"type": "done"}


def test_select_modality_requires_authentication(client):
    response = client.post("/api/chat/modality-selection", json={"history": [], "content": None})
    assert response.status_code == 401


def test_select_modality_rejects_null_content_when_history_exists(signed_up_client):
    response = signed_up_client.post(
        "/api/chat/modality-selection",
        json={"history": [{"role": "assistant", "content": "Olá!"}], "content": None},
    )
    assert response.status_code == 400


def test_select_modality_streams_tokens_and_resolves_document_type(signed_up_client, monkeypatch):
    monkeypatch.setattr(gemini_client, "stream_chat_reply", _fake_stream_chat_reply)
    monkeypatch.setattr(
        gemini_client,
        "extract_structured_values",
        _make_fake_extraction({"slug": "declaracao"}),
    )

    with signed_up_client.stream(
        "POST",
        "/api/chat/modality-selection",
        json={"history": [], "content": "Preciso de uma declaração de comparecimento."},
    ) as response:
        events = _iter_events(response)

    token_events = [e for e in events if e["type"] == "token"]
    assert "".join(e["text"] for e in token_events) == "Olá! Como posso ajudar?"
    assert {"type": "document_type", "slug": "declaracao"} in events
    assert events[-1] == {"type": "done"}


def test_select_modality_stays_unresolved_without_a_clear_slug(signed_up_client, monkeypatch):
    monkeypatch.setattr(gemini_client, "stream_chat_reply", _fake_stream_chat_reply)
    monkeypatch.setattr(gemini_client, "extract_structured_values", _make_fake_extraction({}))

    with signed_up_client.stream(
        "POST",
        "/api/chat/modality-selection",
        json={"history": [], "content": "Não sei bem o que preciso."},
    ) as response:
        events = _iter_events(response)

    assert not any(e["type"] == "document_type" for e in events)
    assert events == [
        {"type": "token", "text": "Olá! "},
        {"type": "token", "text": "Como posso ajudar?"},
        {"type": "done"},
    ]


def test_select_modality_ignores_invalid_extracted_slug(signed_up_client, monkeypatch):
    monkeypatch.setattr(gemini_client, "stream_chat_reply", _fake_stream_chat_reply)
    monkeypatch.setattr(
        gemini_client, "extract_structured_values", _make_fake_extraction({"slug": "inexistente"})
    )

    with signed_up_client.stream(
        "POST",
        "/api/chat/modality-selection",
        json={"history": [], "content": "Um documento qualquer."},
    ) as response:
        events = _iter_events(response)

    assert not any(e["type"] == "document_type" for e in events)


def test_deleting_saved_document_removes_its_chat_session(signed_up_client, monkeypatch):
    monkeypatch.setattr(gemini_client, "stream_chat_reply", _fake_stream_chat_reply)
    monkeypatch.setattr(gemini_client, "extract_structured_values", _make_fake_extraction({}))
    saved = _create_saved_document(signed_up_client)
    session_payload = {"document_type": "declaracao", "saved_document_id": saved["id"]}
    session = signed_up_client.post("/api/chat/sessions", json=session_payload).json()

    signed_up_client.delete(f"/api/documents/saved/{saved['id']}")

    response = signed_up_client.post(
        f"/api/chat/sessions/{session['id']}/messages", json={"content": "oi"}
    )
    assert response.status_code == 404
