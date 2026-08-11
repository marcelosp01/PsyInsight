import pytest

from app.chat_service import (
    build_chat_instruction,
    build_extraction_instruction,
    build_test_suggestion_instruction,
)
from app.document_types import get_document_type


@pytest.mark.parametrize(
    "slug", ["laudo", "relatorio_psicologico", "relatorio_multiprofissional"]
)
def test_build_test_suggestion_instruction_includes_catalog_for_supported_modalities(slug):
    instruction = build_test_suggestion_instruction(slug)
    assert "SATEPSI" in instruction
    assert "WISC-IV" in instruction


@pytest.mark.parametrize("slug", ["declaracao", "atestado", "parecer"])
def test_build_test_suggestion_instruction_is_empty_for_unsupported_modalities(slug):
    assert build_test_suggestion_instruction(slug) == ""


def test_build_chat_instruction_includes_test_suggestion_guidance_for_laudo():
    document_type = get_document_type("laudo")
    instruction = build_chat_instruction(document_type, {}, "")
    assert "SATEPSI" in instruction


def test_build_chat_instruction_omits_test_suggestion_guidance_for_declaracao():
    document_type = get_document_type("declaracao")
    instruction = build_chat_instruction(document_type, {}, "")
    assert "SATEPSI" not in instruction


@pytest.mark.parametrize(
    "slug", ["laudo", "relatorio_psicologico", "relatorio_multiprofissional"]
)
def test_build_extraction_instruction_warns_against_treating_suggestions_as_applied(slug):
    document_type = get_document_type(slug)
    instruction = build_extraction_instruction(document_type)
    assert "NÃO significam que o instrumento foi aplicado" in instruction


@pytest.mark.parametrize("slug", ["declaracao", "atestado", "parecer"])
def test_build_extraction_instruction_omits_test_suggestion_caveat_for_unsupported_modalities(
    slug,
):
    document_type = get_document_type(slug)
    instruction = build_extraction_instruction(document_type)
    assert "instrumento foi aplicado" not in instruction
