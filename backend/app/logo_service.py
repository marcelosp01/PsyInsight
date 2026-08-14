import os
import tempfile
from io import BytesIO
from pathlib import Path

from fastapi import UploadFile
from PIL import Image, ImageOps

from app.config import settings

MAX_LOGO_BYTES = 2 * 1024 * 1024
MAX_LOGO_HEIGHT_PX = 480
_ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}
_READ_CHUNK_SIZE = 64 * 1024


class InvalidLogoError(ValueError):
    """Levantado quando o arquivo enviado não é uma imagem de logo aceitável."""


def logo_path_for(user_id: int) -> Path:
    # Caminho fixo por usuário: um novo upload sempre sobrescreve o anterior,
    # nunca deixando arquivo órfão mesmo que o formato de origem mude.
    return settings.logos_dir / f"{user_id}.png"


def _read_bounded(upload: UploadFile) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = upload.file.read(_READ_CHUNK_SIZE)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_LOGO_BYTES:
            raise InvalidLogoError("A imagem excede o tamanho máximo de 2MB.")
        chunks.append(chunk)
    return b"".join(chunks)


def save_logo(user_id: int, upload: UploadFile) -> None:
    data = _read_bounded(upload)
    if not data:
        raise InvalidLogoError("Nenhum arquivo enviado.")

    # Nunca confia em Content-Type/extensão do request (facilmente forjáveis) —
    # só a decodificação real dos bytes pelo Pillow decide se é uma imagem válida.
    try:
        Image.open(BytesIO(data)).verify()
    except Exception as exc:
        raise InvalidLogoError("O arquivo enviado não é uma imagem válida.") from exc

    # `.verify()` invalida o objeto para uso posterior; reabre para processar.
    image = Image.open(BytesIO(data))
    if image.format not in _ALLOWED_FORMATS:
        raise InvalidLogoError("Formato de imagem não suportado. Use PNG, JPG ou WEBP.")

    image = ImageOps.exif_transpose(image)
    image = image.convert("RGBA")

    if image.height > MAX_LOGO_HEIGHT_PX:
        ratio = MAX_LOGO_HEIGHT_PX / image.height
        new_size = (max(1, round(image.width * ratio)), MAX_LOGO_HEIGHT_PX)
        image = image.resize(new_size, Image.Resampling.LANCZOS)

    settings.logos_dir.mkdir(parents=True, exist_ok=True)
    target = logo_path_for(user_id)
    fd, tmp_path = tempfile.mkstemp(dir=settings.logos_dir, suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as tmp_file:
            image.save(tmp_file, format="PNG")
        os.replace(tmp_path, target)  # atômico: um leitor concorrente nunca vê arquivo truncado
    except Exception:
        Path(tmp_path).unlink(missing_ok=True)
        raise


def delete_logo(user_id: int) -> None:
    logo_path_for(user_id).unlink(missing_ok=True)
