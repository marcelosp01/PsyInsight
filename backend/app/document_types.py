"""Field definitions for the document modalities regulated by the CFP
Resolucao no 06/2019 (see /docs/Resolucao-CFP-n-06-2019-comentada.pdf).
"""

from pydantic import BaseModel, Field, create_model

from app.schemas import DocumentField, DocumentTypeOut

_COMMON_HEADER_FIELDS = [
    DocumentField(key="profissional_nome", label="Nome do(a) psicólogo(a)", kind="text"),
    DocumentField(key="profissional_crp", label="CRP", kind="text"),
    DocumentField(key="cidade_data", label="Cidade e data", kind="text"),
]

_REFERENCIAS = DocumentField(
    key="referencias",
    label="Referências",
    kind="textarea",
    required=False,
    help_text="Referências bibliográficas e técnicas utilizadas (quando aplicável).",
)

DOCUMENT_TYPES: dict[str, DocumentTypeOut] = {
    dt.slug: dt
    for dt in [
        DocumentTypeOut(
            slug="declaracao",
            name="Declaração",
            article="Art. 9º",
            description="Confirma a ocorrência de um atendimento psicológico, sem detalhar procedimentos, análises ou conclusões.",
            fields=[
                *_COMMON_HEADER_FIELDS,
                DocumentField(
                    key="texto_declaracao",
                    label="Texto da declaração",
                    kind="prose",
                    help_text=(
                        "Texto corrido e contínuo da declaração, redigido pela própria IA à "
                        "medida que a conversa avança. Deve cobrir a identificação da "
                        "pessoa atendida e o teor objetivo do que está sendo declarado "
                        "(ex.: comparecimento, período de atendimento), sem detalhar "
                        "procedimentos, análises ou conclusões."
                    ),
                ),
            ],
        ),
        DocumentTypeOut(
            slug="atestado",
            name="Atestado Psicológico",
            article="Art. 10",
            description="Atesta, a partir da avaliação psicológica, a existência ou não de transtorno ou impedimento.",
            fields=[
                *_COMMON_HEADER_FIELDS,
                DocumentField(
                    key="texto_atestado",
                    label="Texto do atestado",
                    kind="prose",
                    help_text=(
                        "Texto corrido e contínuo do atestado, redigido pela própria IA à "
                        "medida que a conversa avança — não uma lista de campos separados. "
                        "Deve cobrir a identificação da pessoa avaliada, o motivo da "
                        "avaliação, a existência ou não de transtorno/impedimento "
                        "identificado e, apenas com autorização expressa da pessoa "
                        "avaliada, o CID correspondente e eventual afastamento sugerido."
                    ),
                ),
            ],
        ),
        DocumentTypeOut(
            slug="relatorio_psicologico",
            name="Relatório Psicológico",
            article="Art. 11",
            description="Descreve, de forma articulada, as informações resultantes de acompanhamento psicológico.",
            fields=[
                *_COMMON_HEADER_FIELDS,
                DocumentField(
                    key="texto_relatorio",
                    label="Texto do relatório",
                    kind="prose",
                    help_text=(
                        "Texto corrido e contínuo do relatório, redigido pela própria IA à "
                        "medida que a conversa avança, articulando de forma coesa a "
                        "identificação da pessoa atendida, a descrição da demanda, o "
                        "procedimento (técnicas e instrumentos utilizados), a análise "
                        "técnica dos resultados e a conclusão."
                    ),
                ),
                _REFERENCIAS,
            ],
        ),
        DocumentTypeOut(
            slug="relatorio_multiprofissional",
            name="Relatório Multiprofissional",
            article="Art. 12",
            description="Relatório psicológico elaborado em conjunto com outros profissionais.",
            fields=[
                *_COMMON_HEADER_FIELDS,
                DocumentField(
                    key="texto_relatorio",
                    label="Texto do relatório",
                    kind="prose",
                    help_text=(
                        "Texto corrido e contínuo do relatório, redigido pela própria IA à "
                        "medida que a conversa avança, articulando de forma coesa os "
                        "demais profissionais envolvidos (nome, formação e registro), a "
                        "identificação da pessoa atendida, a descrição da demanda, o "
                        "procedimento, a análise técnica dos resultados e a conclusão."
                    ),
                ),
                _REFERENCIAS,
            ],
        ),
        DocumentTypeOut(
            slug="laudo",
            name="Laudo Psicológico",
            article="Art. 13",
            description="Documento mais completo, com exposição minuciosa de exames, técnicas, análises e conclusões.",
            fields=[
                *_COMMON_HEADER_FIELDS,
                DocumentField(
                    key="texto_laudo",
                    label="Texto do laudo",
                    kind="prose",
                    help_text=(
                        "Texto corrido e contínuo do laudo, redigido pela própria IA à "
                        "medida que a conversa avança, articulando de forma coesa a "
                        "identificação da pessoa avaliada, a descrição da demanda, os "
                        "quesitos formulados por quem solicitou o laudo (quando houver), o "
                        "procedimento (exames, técnicas e instrumentos utilizados), a "
                        "análise minuciosa dos resultados e a conclusão."
                    ),
                ),
                _REFERENCIAS,
            ],
        ),
        DocumentTypeOut(
            slug="parecer",
            name="Parecer Psicológico",
            article="Art. 14",
            description="Resposta técnica a uma consulta específica, com base em revisão e análise de informações já existentes.",
            fields=[
                *_COMMON_HEADER_FIELDS,
                DocumentField(
                    key="texto_parecer",
                    label="Texto do parecer",
                    kind="prose",
                    help_text=(
                        "Texto corrido e contínuo do parecer, redigido pela própria IA à "
                        "medida que a conversa avança, articulando de forma coesa a "
                        "consulta ou quesito formulado, a análise técnica com base na "
                        "revisão de informações já existentes e a conclusão."
                    ),
                ),
                _REFERENCIAS,
            ],
        ),
    ]
}


def list_document_types() -> list[DocumentTypeOut]:
    return list(DOCUMENT_TYPES.values())


def get_document_type(slug: str) -> DocumentTypeOut | None:
    return DOCUMENT_TYPES.get(slug)


def build_extraction_model(document_type: DocumentTypeOut) -> type[BaseModel]:
    """Modelo Pydantic dinâmico usado como response_schema do Gemini para
    extrair/atualizar os campos da modalidade a partir da conversa do chat.

    Todos os campos são opcionais aqui de propósito: "obrigatório" no sentido
    da Resolução CFP é regra de negócio de _validate_values (aplicada só ao
    salvar/gerar PDF), não do schema de extração incremental do chat.
    """
    field_definitions: dict[str, tuple[type, object]] = {
        field.key: (
            str | None,
            Field(
                default=None,
                description=field.label + (f" — {field.help_text}" if field.help_text else ""),
            ),
        )
        for field in document_type.fields
    }
    field_definitions["memory_note"] = (
        str | None,
        Field(
            default=None,
            description=(
                "Preencha apenas se o usuário pediu explicitamente para lembrar "
                "algo para laudos futuros; caso contrário, deixe nulo."
            ),
        ),
    )
    return create_model(f"Extraction_{document_type.slug}", **field_definitions)
