def test_signup_creates_user_and_sets_session_cookie(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "name": "Ana Souza",
            "email": "ana@example.com",
            "crp": "06/12345",
            "password": "senha-forte-123",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "ana@example.com"
    assert "hashed_password" not in body
    assert "psyinsight_session" in response.cookies


def test_signup_rejects_duplicate_email(signed_up_client):
    response = signed_up_client.post(
        "/api/auth/signup",
        json={
            "name": "Outra Pessoa",
            "email": "ana@example.com",
            "crp": "06/54321",
            "password": "outra-senha-123",
        },
    )

    assert response.status_code == 409


def test_login_with_correct_credentials_succeeds(client):
    client.post(
        "/api/auth/signup",
        json={
            "name": "Ana Souza",
            "email": "ana@example.com",
            "crp": "06/12345",
            "password": "senha-forte-123",
        },
    )

    response = client.post(
        "/api/auth/login",
        json={"email": "ana@example.com", "password": "senha-forte-123"},
    )

    assert response.status_code == 200
    assert "psyinsight_session" in response.cookies


def test_login_with_wrong_password_fails(signed_up_client):
    response = signed_up_client.post(
        "/api/auth/login",
        json={"email": "ana@example.com", "password": "senha-errada"},
    )

    assert response.status_code == 401


def test_me_requires_authentication(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_returns_current_user_when_authenticated(signed_up_client):
    response = signed_up_client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == "ana@example.com"


def test_signup_defaults_local_atendimento_to_empty_string(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "name": "Ana Souza",
            "email": "ana@example.com",
            "crp": "06/12345",
            "password": "senha-forte-123",
        },
    )

    assert response.json()["local_atendimento"] == ""


def test_update_me_requires_authentication(client):
    response = client.put("/api/auth/me", json={"local_atendimento": "São Paulo - SP"})
    assert response.status_code == 401


def test_update_me_updates_only_provided_fields(signed_up_client):
    response = signed_up_client.put(
        "/api/auth/me", json={"local_atendimento": "São Paulo - SP"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["local_atendimento"] == "São Paulo - SP"
    assert body["name"] == "Ana Souza"
    assert body["crp"] == "06/12345"


def test_update_me_updates_name_and_crp(signed_up_client):
    response = signed_up_client.put(
        "/api/auth/me", json={"name": "Ana Souza Lima", "crp": "06/99999"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Ana Souza Lima"
    assert body["crp"] == "06/99999"


def test_update_me_persists_across_requests(signed_up_client):
    signed_up_client.put("/api/auth/me", json={"local_atendimento": "Recife - PE"})

    response = signed_up_client.get("/api/auth/me")
    assert response.json()["local_atendimento"] == "Recife - PE"


def test_logout_clears_session(signed_up_client):
    logout_response = signed_up_client.post("/api/auth/logout")
    assert logout_response.status_code == 204

    me_response = signed_up_client.get("/api/auth/me")
    assert me_response.status_code == 401
