import io

from PIL import Image

from app.config import settings


def _image_bytes(fmt: str = "PNG", size: tuple[int, int] = (50, 30), color=(200, 50, 50)) -> bytes:
    image = Image.new("RGB", size, color)
    buffer = io.BytesIO()
    image.save(buffer, format=fmt)
    return buffer.getvalue()


def test_logo_endpoints_require_authentication(client):
    assert client.post("/api/auth/me/logo", files={"file": ("logo.png", _image_bytes(), "image/png")}).status_code == 401
    assert client.get("/api/auth/me/logo").status_code == 401
    assert client.delete("/api/auth/me/logo").status_code == 401


def test_get_logo_returns_404_before_any_upload(signed_up_client):
    response = signed_up_client.get("/api/auth/me/logo")
    assert response.status_code == 404


def test_upload_logo_sets_has_logo_and_returns_versioned_url(signed_up_client):
    response = signed_up_client.post(
        "/api/auth/me/logo", files={"file": ("logo.png", _image_bytes(), "image/png")}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["logo_url"] == "/api/auth/me/logo?v=1"
    assert "has_logo" not in body
    assert "logo_version" not in body


def test_get_logo_returns_image_after_upload(signed_up_client):
    signed_up_client.post("/api/auth/me/logo", files={"file": ("logo.png", _image_bytes(), "image/png")})

    response = signed_up_client.get("/api/auth/me/logo")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content.startswith(b"\x89PNG")


def test_upload_logo_rejects_oversized_file(signed_up_client):
    oversized = b"a" * (2 * 1024 * 1024 + 1)
    response = signed_up_client.post(
        "/api/auth/me/logo", files={"file": ("logo.png", oversized, "image/png")}
    )

    assert response.status_code == 422


def test_upload_logo_rejects_invalid_image_bytes(signed_up_client):
    response = signed_up_client.post(
        "/api/auth/me/logo",
        files={"file": ("logo.png", b"isso nao e uma imagem", "image/png")},
    )

    assert response.status_code == 422


def test_upload_logo_rejects_unsupported_format(signed_up_client):
    response = signed_up_client.post(
        "/api/auth/me/logo",
        files={"file": ("logo.bmp", _image_bytes(fmt="BMP"), "image/bmp")},
    )

    assert response.status_code == 422


def test_replace_logo_overwrites_previous_file_without_orphan(signed_up_client):
    signed_up_client.post(
        "/api/auth/me/logo", files={"file": ("logo.png", _image_bytes(color=(1, 2, 3)), "image/png")}
    )
    first = signed_up_client.get("/api/auth/me/logo").content

    replace_response = signed_up_client.post(
        "/api/auth/me/logo",
        files={"file": ("logo.jpg", _image_bytes(fmt="JPEG", color=(4, 5, 6)), "image/jpeg")},
    )
    second = signed_up_client.get("/api/auth/me/logo").content

    assert replace_response.json()["logo_url"] == "/api/auth/me/logo?v=2"
    assert first != second
    me_id = signed_up_client.get("/api/auth/me").json()["id"]
    matching_files = list(settings.logos_dir.glob(f"{me_id}.*"))
    assert len(matching_files) == 1


def test_remove_logo_clears_flag_and_deletes_file(signed_up_client):
    signed_up_client.post("/api/auth/me/logo", files={"file": ("logo.png", _image_bytes(), "image/png")})
    me_id = signed_up_client.get("/api/auth/me").json()["id"]

    response = signed_up_client.delete("/api/auth/me/logo")

    assert response.status_code == 200
    assert response.json()["logo_url"] is None
    assert signed_up_client.get("/api/auth/me/logo").status_code == 404
    assert not list(settings.logos_dir.glob(f"{me_id}.*"))


def test_remove_logo_is_idempotent_when_no_logo_exists(signed_up_client):
    response = signed_up_client.delete("/api/auth/me/logo")

    assert response.status_code == 200
    assert response.json()["logo_url"] is None
