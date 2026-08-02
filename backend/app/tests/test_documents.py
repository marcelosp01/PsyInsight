def test_document_types_requires_authentication(client):
    response = client.get("/api/documents/types")
    assert response.status_code == 401


def test_document_types_lists_all_six_modalities(signed_up_client):
    response = signed_up_client.get("/api/documents/types")

    assert response.status_code == 200
    slugs = {doc["slug"] for doc in response.json()}
    assert slugs == {
        "declaracao",
        "atestado",
        "relatorio_psicologico",
        "relatorio_multiprofissional",
        "laudo",
        "parecer",
    }


def test_generate_pdf_requires_authentication(client):
    response = client.post(
        "/api/documents/pdf",
        json={"document_type": "declaracao", "values": {}},
    )
    assert response.status_code == 401


def test_generate_pdf_rejects_unknown_document_type(signed_up_client):
    response = signed_up_client.post(
        "/api/documents/pdf",
        json={"document_type": "inexistente", "values": {}},
    )
    assert response.status_code == 404


def test_generate_pdf_rejects_missing_required_fields(signed_up_client):
    response = signed_up_client.post(
        "/api/documents/pdf",
        json={"document_type": "declaracao", "values": {}},
    )
    assert response.status_code == 422
    assert "obrigatórios" in response.json()["detail"]


def test_generate_pdf_returns_pdf_bytes_when_valid(signed_up_client):
    response = signed_up_client.post(
        "/api/documents/pdf",
        json={
            "document_type": "declaracao",
            "values": {
                "profissional_nome": "Ana Souza",
                "profissional_crp": "06/12345",
                "cidade_data": "São Paulo, 31 de julho de 2026",
                "texto_declaracao": "João da Silva, 30 anos, compareceu a 4 sessões de atendimento psicológico.",
            },
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")
