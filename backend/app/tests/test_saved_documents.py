_VALID_VALUES = {
    "profissional_nome": "Ana Souza",
    "profissional_crp": "06/12345",
    "cidade_data": "São Paulo, 31 de julho de 2026",
    "identificacao": "João da Silva, 30 anos.",
    "teor_declaracao": "Compareceu a 4 sessões de atendimento psicológico.",
}


def _create_saved_document(client, title="Laudo João", document_type="declaracao", values=None):
    return client.post(
        "/api/documents/saved",
        json={
            "title": title,
            "document_type": document_type,
            "values": values if values is not None else _VALID_VALUES,
        },
    )


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


def test_list_saved_documents_requires_authentication(client):
    response = client.get("/api/documents/saved")
    assert response.status_code == 401


def test_create_saved_document(signed_up_client):
    response = _create_saved_document(signed_up_client)

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Laudo João"
    assert body["document_type"] == "declaracao"
    assert body["values"] == _VALID_VALUES


def test_create_saved_document_rejects_unknown_document_type(signed_up_client):
    response = _create_saved_document(signed_up_client, document_type="inexistente")
    assert response.status_code == 404


def test_create_saved_document_rejects_missing_required_fields(signed_up_client):
    response = _create_saved_document(signed_up_client, values={})
    assert response.status_code == 422
    assert "obrigatórios" in response.json()["detail"]


def test_list_saved_documents_returns_only_current_user_documents(signed_up_client):
    _create_saved_document(signed_up_client)

    _login_as_other_user(signed_up_client)
    other_user_response = signed_up_client.get("/api/documents/saved")

    assert other_user_response.status_code == 200
    assert other_user_response.json() == []


def test_get_saved_document_rejects_document_owned_by_another_user(signed_up_client):
    created = _create_saved_document(signed_up_client)
    document_id = created.json()["id"]

    _login_as_other_user(signed_up_client)
    response = signed_up_client.get(f"/api/documents/saved/{document_id}")

    assert response.status_code == 404


def test_update_saved_document_overwrites_title_and_values(signed_up_client):
    created = _create_saved_document(signed_up_client)
    document_id = created.json()["id"]
    new_values = {**_VALID_VALUES, "identificacao": "Novo texto."}

    response = signed_up_client.put(
        f"/api/documents/saved/{document_id}",
        json={"title": "Laudo João - revisado", "values": new_values},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Laudo João - revisado"
    assert body["values"] == new_values


def test_update_saved_document_title_only_keeps_values(signed_up_client):
    created = _create_saved_document(signed_up_client)
    document_id = created.json()["id"]

    response = signed_up_client.put(
        f"/api/documents/saved/{document_id}", json={"title": "Novo título"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Novo título"
    assert body["values"] == _VALID_VALUES


def test_update_saved_document_rejects_missing_required_fields(signed_up_client):
    created = _create_saved_document(signed_up_client)
    document_id = created.json()["id"]

    response = signed_up_client.put(f"/api/documents/saved/{document_id}", json={"values": {}})

    assert response.status_code == 422
    assert "obrigatórios" in response.json()["detail"]


def test_delete_saved_document(signed_up_client):
    created = _create_saved_document(signed_up_client)
    document_id = created.json()["id"]

    delete_response = signed_up_client.delete(f"/api/documents/saved/{document_id}")
    assert delete_response.status_code == 204

    get_response = signed_up_client.get(f"/api/documents/saved/{document_id}")
    assert get_response.status_code == 404


def test_delete_saved_document_rejects_document_owned_by_another_user(signed_up_client):
    created = _create_saved_document(signed_up_client)
    document_id = created.json()["id"]

    _login_as_other_user(signed_up_client)
    response = signed_up_client.delete(f"/api/documents/saved/{document_id}")

    assert response.status_code == 404
