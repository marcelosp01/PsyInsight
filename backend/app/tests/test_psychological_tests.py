import pytest

from app.psychological_tests import (
    PSYCHOLOGICAL_TESTS,
    format_tests_for_prompt,
    supports_test_suggestions,
)


def test_every_entry_has_required_attributes():
    for test in PSYCHOLOGICAL_TESTS:
        assert test.name.strip()
        assert test.category.strip()
        assert test.description.strip()
        assert test.target_audience.strip()


def test_no_duplicate_test_names():
    names = [test.name for test in PSYCHOLOGICAL_TESTS]
    assert len(names) == len(set(names))


def test_catalog_covers_all_four_categories():
    categories = {test.category for test in PSYCHOLOGICAL_TESTS}
    assert categories == {
        "Inteligência e Funções Cognitivas Global",
        "Personalidade e Psicopatologia",
        "Atenção, Memória e Funções Executivas",
        "Desenvolvimento Infantil e Contexto Profissional",
    }


def test_format_tests_for_prompt_includes_every_test_name():
    rendered = format_tests_for_prompt()
    for test in PSYCHOLOGICAL_TESTS:
        assert test.name in rendered


@pytest.mark.parametrize(
    "slug,expected",
    [
        ("laudo", True),
        ("relatorio_psicologico", True),
        ("relatorio_multiprofissional", True),
        ("declaracao", False),
        ("atestado", False),
        ("parecer", False),
        ("inexistente", False),
    ],
)
def test_supports_test_suggestions_scope(slug, expected):
    assert supports_test_suggestions(slug) is expected
