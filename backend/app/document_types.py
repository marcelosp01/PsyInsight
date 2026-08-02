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

_COMMON_IDENTIFICATION = DocumentField(
    key="identificacao",
    label="Identificação",
    kind="textarea",
    help_text="Dados de quem é objeto do documento (nome, idade, e demais informações pertinentes).",
)

_DEMANDA = DocumentField(
    key="descricao_demanda",
    label="Descrição da Demanda",
    kind="textarea",
    help_text="Motivo que originou o atendimento ou a solicitação do documento.",
)

_PROCEDIMENTO = DocumentField(
    key="procedimento",
    label="Procedimento",
    kind="textarea",
    help_text="Técnicas, instrumentos e métodos utilizados.",
)

_ANALISE = DocumentField(
    key="analise",
    label="Análise",
    kind="textarea",
    help_text="Análise técnica das informações e dos resultados obtidos.",
)

_CONCLUSAO = DocumentField(key="conclusao", label="Conclusão", kind="textarea")

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
                _COMMON_IDENTIFICATION,
                DocumentField(
                    key="teor_declaracao",
                    label="Teor da declaração",
                    kind="textarea",
                    help_text="Descrição objetiva do que está sendo declarado (ex.: comparecimento, período de atendimento).",
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
                _COMMON_IDENTIFICATION,
                _DEMANDA,
                DocumentField(
                    key="cid",
                    label="CID (opcional)",
                    kind="text",
                    required=False,
                    help_text="Somente com autorização expressa da pessoa avaliada.",
                ),
                DocumentField(
                    key="afastamento_sugerido",
                    label="Afastamento sugerido",
                    kind="text",
                    required=False,
                ),
                _CONCLUSAO,
            ],
        ),
        DocumentTypeOut(
            slug="relatorio_psicologico",
            name="Relatório Psicológico",
            article="Art. 11",
            description="Descreve, de forma articulada, as informações resultantes de acompanhamento psicológico.",
            fields=[
                *_COMMON_HEADER_FIELDS,
                _COMMON_IDENTIFICATION,
                _DEMANDA,
                _PROCEDIMENTO,
                _ANALISE,
                _CONCLUSAO,
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
                    key="equipe_profissional",
                    label="Profissionais envolvidos",
                    kind="textarea",
                    help_text="Nome, formação e registro dos demais profissionais participantes.",
                ),
                _COMMON_IDENTIFICATION,
                _DEMANDA,
                _PROCEDIMENTO,
                _ANALISE,
                _CONCLUSAO,
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
                _COMMON_IDENTIFICATION,
                _DEMANDA,
                DocumentField(
                    key="quesitos",
                    label="Quesitos",
                    kind="textarea",
                    required=False,
                    help_text="Perguntas formuladas por quem solicitou o laudo, quando houver.",
                ),
                _PROCEDIMENTO,
                _ANALISE,
                _CONCLUSAO,
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
                    key="consulta",
                    label="Consulta / quesito formulado",
                    kind="textarea",
                ),
                _ANALISE,
                _CONCLUSAO,
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
