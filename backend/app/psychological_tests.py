"""Catálogo curado de testes psicológicos que a IA pode sugerir durante a
entrevista do chat, como apoio ao raciocínio clínico do(a) psicólogo(a) (ver
PSYIN-5 e "Sugestão de testes psicológicos" em CLAUDE.md).

A lista é fixa e local — a IA nunca deve sugerir um teste fora dela. Cada
entrada deve ser checada como favorável no SATEPSI (Sistema de Avaliação de
Testes Psicológicos do CFP) pelo profissional antes do uso.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class PsychologicalTest:
    name: str
    category: str
    subcategory: str | None
    description: str
    target_audience: str


PSYCHOLOGICAL_TESTS: tuple[PsychologicalTest, ...] = (
    # Inteligência e Funções Cognitivas Global
    PsychologicalTest(
        name="WISC-IV (Escala de Inteligência Wechsler para Crianças)",
        category="Inteligência e Funções Cognitivas Global",
        subcategory=None,
        description=(
            "Avalia a capacidade intelectual global e o perfil cognitivo em 4 "
            "índices: Compreensão Verbal, Organização Perceptual, Memória "
            "Operacional e Velocidade de Processamento."
        ),
        target_audience="Crianças e adolescentes (6 a 16 anos).",
    ),
    PsychologicalTest(
        name="WAIS-III / WAIS-IV (Escala de Inteligência Wechsler para Adultos)",
        category="Inteligência e Funções Cognitivas Global",
        subcategory=None,
        description=(
            "Padrão-ouro para avaliação do QI global, funcionamento cognitivo e "
            "identificação de déficits, talentos ou declínio cognitivo em adultos."
        ),
        target_audience="Adultos (16 a 89 anos).",
    ),
    PsychologicalTest(
        name="WASI (Escala Abreviada de Inteligência Wechsler)",
        category="Inteligência e Funções Cognitivas Global",
        subcategory=None,
        description=(
            "Avaliação rápida da inteligência (QI Total, Verbal e de Execução) "
            "utilizando apenas 4 subtestes das escalas Wechsler tradicionais."
        ),
        target_audience="Pessoas de 6 a 89 anos.",
    ),
    PsychologicalTest(
        name="RAVEN (Matrizes Progressivas de Raven)",
        category="Inteligência e Funções Cognitivas Global",
        subcategory=None,
        description=(
            "Avalia o Fator 'g' (inteligência geral) e a capacidade "
            "dedutiva/raciocínio não-verbal, independente de cultura ou nível "
            "educacional."
        ),
        target_audience="Crianças, adultos e idosos.",
    ),
    PsychologicalTest(
        name="G-36 / G-38 (Testes Não-Verbais de Inteligência)",
        category="Inteligência e Funções Cognitivas Global",
        subcategory=None,
        description=(
            "Mensura a capacidade intelectual geral através de itens de "
            "raciocínio por analogia visual e complemento de figuras."
        ),
        target_audience="A partir de 18 anos / Nível médio e superior.",
    ),
    PsychologicalTest(
        name="R-1 (Teste Não-Verbal de Inteligência)",
        category="Inteligência e Funções Cognitivas Global",
        subcategory=None,
        description=(
            "Avalia o fator 'g' de inteligência por meio de sequências lógicas "
            "e raciocínio abstrato com figuras geométricas."
        ),
        target_audience="Adultos com diferentes níveis de escolaridade.",
    ),
    PsychologicalTest(
        name="TONI-3 (Teste de Inteligência Não-Verbal)",
        category="Inteligência e Funções Cognitivas Global",
        subcategory=None,
        description=(
            "Mede o raciocínio abstrato e a resolução de problemas sem a "
            "necessidade de habilidades de linguagem falada ou escrita."
        ),
        target_audience="Pessoas de 6 a 89 anos.",
    ),
    PsychologicalTest(
        name="SON-R (Teste Não-Verbal de Inteligência SON-R 2½-7)",
        category="Inteligência e Funções Cognitivas Global",
        subcategory=None,
        description=(
            "Avalia a inteligência geral de forma não-verbal, sendo altamente "
            "indicado para crianças com distúrbios de fala, linguagem ou "
            "audição."
        ),
        target_audience="Crianças de 2 anos e meio a 7 anos.",
    ),
    # Personalidade e Psicopatologia > Inventários e Baterias Objetivas
    PsychologicalTest(
        name="BFP (Bateria Fatorial de Personalidade)",
        category="Personalidade e Psicopatologia",
        subcategory="Inventários e Baterias Objetivas",
        description=(
            "Avalia a personalidade com base no modelo dos Big Five (Cinco "
            "Grandes Fatores): Neuroticismo, Extroversão, Socialização, "
            "Realização e Abertura."
        ),
        target_audience="Pessoas de 18 a 60 anos (com ensino fundamental completo).",
    ),
    PsychologicalTest(
        name="NEO-PI-R / NEO-FFI (Inventário de Personalidade NEO Revisado)",
        category="Personalidade e Psicopatologia",
        subcategory="Inventários e Baterias Objetivas",
        description=(
            "Mapeia traços e facetas da personalidade adulta sob a teoria dos "
            "Cinco Grandes Fatores. A versão FFI é a forma reduzida."
        ),
        target_audience="Jovens e adultos (a partir de 18 anos).",
    ),
    PsychologicalTest(
        name="IFP-II (Inventário Fatorial de Personalidade)",
        category="Personalidade e Psicopatologia",
        subcategory="Inventários e Baterias Objetivas",
        description=(
            "Mensura as necessidades ou motivos psicológicos fundamentais (ex: "
            "Afago, Dominância, Afiliação, Autonomia) segundo a teoria de Murray."
        ),
        target_audience="A partir dos 18 anos.",
    ),
    PsychologicalTest(
        name="EPQ-R (Questionário de Personalidade de Eysenck)",
        category="Personalidade e Psicopatologia",
        subcategory="Inventários e Baterias Objetivas",
        description=(
            "Avalia as três dimensões centrais do modelo biofatorial de "
            "Eysenck: Extroversão, Neuroticismo e Psicoticismo."
        ),
        target_audience="Pessoas de 16 a 70 anos.",
    ),
    # Personalidade e Psicopatologia > Escalas de Sintomas e Rastreadores
    PsychologicalTest(
        name="BDI-II (Inventário de Depressão de Beck)",
        category="Personalidade e Psicopatologia",
        subcategory="Escalas de Sintomas e Rastreadores",
        description=(
            "Escala autoaplicável que mede a gravidade de sintomas depressivos "
            "alinhada aos critérios do DSM."
        ),
        target_audience="Adolescentes e adultos (13 a 80 anos).",
    ),
    PsychologicalTest(
        name="BAI (Inventário de Ansiedade de Beck)",
        category="Personalidade e Psicopatologia",
        subcategory="Escalas de Sintomas e Rastreadores",
        description=(
            "Avalia a intensidade de sintomas somáticos, afetivos e cognitivos "
            "de ansiedade."
        ),
        target_audience="A partir de 17 anos.",
    ),
    PsychologicalTest(
        name="BHS (Escala de Desesperança de Beck)",
        category="Personalidade e Psicopatologia",
        subcategory="Escalas de Sintomas e Rastreadores",
        description=(
            "Avalia a dimensão da desesperança e atitudes negativas em relação "
            "ao futuro, indicativo de risco suicida."
        ),
        target_audience="Adolescentes e adultos (17 a 80 anos).",
    ),
    PsychologicalTest(
        name="ETDAH (Escala de Transtorno de Déficit de Atenção/Hiperatividade)",
        category="Personalidade e Psicopatologia",
        subcategory="Escalas de Sintomas e Rastreadores",
        description=(
            "Identifica a presença e intensidade de sintomas de TDAH em "
            "ambiente escolar, familiar ou de trabalho."
        ),
        target_audience="Crianças, adolescentes e adultos.",
    ),
    # Personalidade e Psicopatologia > Técnicas Expressivas e Projetivas
    PsychologicalTest(
        name="Rorschach (Método de Rorschach - Sistema Compreensivo / R-PAS)",
        category="Personalidade e Psicopatologia",
        subcategory="Técnicas Expressivas e Projetivas",
        description=(
            "Avalia a estrutura da personalidade, organização afetiva, "
            "percepção da realidade, defesas e funcionamento cognitivo por meio "
            "de pranchas com manchas de tinta."
        ),
        target_audience="Crianças, adolescentes e adultos.",
    ),
    PsychologicalTest(
        name="Z-Teste (Teste de Zulliger)",
        category="Personalidade e Psicopatologia",
        subcategory="Técnicas Expressivas e Projetivas",
        description=(
            "Técnica projetiva coletiva ou individual para avaliação rápida da "
            "estrutura de personalidade e ajuste emocional baseada nos "
            "princípios do Rorschach."
        ),
        target_audience="A partir de 16 anos.",
    ),
    PsychologicalTest(
        name="TAT (Teste de Apercepção Temática)",
        category="Personalidade e Psicopatologia",
        subcategory="Técnicas Expressivas e Projetivas",
        description=(
            "Avalia dinâmicas inconscientes, conflitos centrais, motivações e "
            "necessidades da personalidade através da criação de histórias "
            "sobre cenas estruturadas."
        ),
        target_audience="Adolescentes e adultos.",
    ),
    PsychologicalTest(
        name="CAT-A / CAT-H (Teste de Apercepção Infantil - Animais / Humanos)",
        category="Personalidade e Psicopatologia",
        subcategory="Técnicas Expressivas e Projetivas",
        description=(
            "Investiga a estrutura de personalidade infantil, mecanismos de "
            "defesa e dinâmica de conflitos em relação às figuras parentais e "
            "ambiente."
        ),
        target_audience="Crianças de 3 a 10 anos.",
    ),
    PsychologicalTest(
        name="HTP (Casa-Árvore-Pessoa / House-Tree-Person)",
        category="Personalidade e Psicopatologia",
        subcategory="Técnicas Expressivas e Projetivas",
        description=(
            "Técnica de desenho projetivo que revela percepções do self, "
            "imagem corporal, ambiente familiar e dinâmica emocional "
            "inconsciente."
        ),
        target_audience="A partir de 8 anos.",
    ),
    PsychologicalTest(
        name="Palográfico (Teste Palográfico)",
        category="Personalidade e Psicopatologia",
        subcategory="Técnicas Expressivas e Projetivas",
        description=(
            "Avalia a personalidade, controle emocional, ritmo de trabalho, "
            "produtividade e inibição/impulsividade por meio de traços "
            "verticais contínuos."
        ),
        target_audience="A partir de 18 anos.",
    ),
    PsychologicalTest(
        name="Pfister (Teste das Pirâmides Coloridas de Pfister)",
        category="Personalidade e Psicopatologia",
        subcategory="Técnicas Expressivas e Projetivas",
        description=(
            "Técnica expressiva que avalia aspectos afetivos, estabilidade "
            "emocional, nível de ansiedade e mecanismos de defesa através do "
            "uso de cores em pirâmides."
        ),
        target_audience="Crianças, adolescentes e adultos.",
    ),
    # Atenção, Memória e Funções Executivas
    PsychologicalTest(
        name="BPA (Bateria Psicológica de Atenção)",
        category="Atenção, Memória e Funções Executivas",
        subcategory=None,
        description=(
            "Avalia a capacidade atencional dividida em três frentes: Atenção "
            "Concentrada (AC), Atenção Difusa (AD) e Atenção Alternada (AA)."
        ),
        target_audience="Pessoas de 6 a 82 anos.",
    ),
    PsychologicalTest(
        name="FDT (Five Digit Test / Teste dos Cinco Dígitos)",
        category="Atenção, Memória e Funções Executivas",
        subcategory=None,
        description=(
            "Avalia a velocidade de processamento, atenção sustentada, "
            "flexibilidade cognitiva e inibição (efeito Stroop) sem depender "
            "da linguagem."
        ),
        target_audience="A partir dos 6 anos (crianças, adultos e idosos).",
    ),
    PsychologicalTest(
        name="NEUPSILIN (Instrumento de Avaliação Neuropsicológica Breve)",
        category="Atenção, Memória e Funções Executivas",
        subcategory=None,
        description=(
            "Examina o perfil neuropsicológico geral cobrindo 8 funções: "
            "Orientação, Atenção, Percepção, Memória, Linguagem, Habilidades "
            "Visuoconstrutivas, Praxias e Funções Executivas."
        ),
        target_audience="Adolescentes e adultos (12 a 90 anos).",
    ),
    PsychologicalTest(
        name="TEMPLAM (Teste de Memória de Pontos)",
        category="Atenção, Memória e Funções Executivas",
        subcategory=None,
        description=(
            "Avalia a memória visual de curto prazo e a capacidade de retenção "
            "espacial através do resgate de posições de pontos."
        ),
        target_audience="Crianças, adolescentes e adultos.",
    ),
    PsychologicalTest(
        name="BICA (Bateria Infantil de Funções Executivas)",
        category="Atenção, Memória e Funções Executivas",
        subcategory=None,
        description=(
            "Avalia componentes-chave do controle executivo infantil, como "
            "memória de trabalho, inibição de resposta e planejamento."
        ),
        target_audience="Crianças em idade escolar.",
    ),
    # Desenvolvimento Infantil e Contexto Profissional
    PsychologicalTest(
        name="Vineland-3 (Escalas de Comportamento Adaptativo Vineland)",
        category="Desenvolvimento Infantil e Contexto Profissional",
        subcategory=None,
        description=(
            "Mede o comportamento adaptativo (comunicação, vida diária, "
            "socialização e habilidades motoras) para auxílio no diagnóstico de "
            "Transtorno do Espectro Autista (TEA) e Deficiência Intelectual."
        ),
        target_audience="Do nascimento aos 90 anos.",
    ),
    PsychologicalTest(
        name="QUATI (Questionário Tipológico de Personalidade)",
        category="Desenvolvimento Infantil e Contexto Profissional",
        subcategory=None,
        description=(
            "Identifica preferências tipológicas com base na teoria de Jung "
            "(Extroversão/Introversão, Sensação/Intuição, Pensamento/"
            "Sentimento). Muito usado em RH e orientação profissional."
        ),
        target_audience="A partir de 16 anos (ensino fundamental incompleto).",
    ),
    PsychologicalTest(
        name="BPR-5 (Bateria de Provas de Raciocínio)",
        category="Desenvolvimento Infantil e Contexto Profissional",
        subcategory=None,
        description=(
            "Avalia 5 formas de raciocínio: Abstrato, Verbal, Espacial, "
            "Numérico e Mecânico. Indicado para seleção de pessoal e "
            "orientação vocacional."
        ),
        target_audience="Formas para Ensino Fundamental II e Ensino Médio/Superior.",
    ),
    PsychologicalTest(
        name="AIP (Avaliação dos Interesses Profissionais)",
        category="Desenvolvimento Infantil e Contexto Profissional",
        subcategory=None,
        description=(
            "Mapeia o perfil de interesse do indivíduo em relação a campos "
            "ocupacionais e carreiras profissionais."
        ),
        target_audience="A partir do ensino médio.",
    ),
)

# Modalidades em que a Resolução CFP nº 06/2019 prevê a menção a instrumentos/
# técnicas de avaliação (ver comentário ao Art. 13, item "Procedimento") —
# Declaração, Atestado e Parecer não envolvem esse tipo de conteúdo.
SUPPORTED_DOCUMENT_TYPE_SLUGS = frozenset(
    {"laudo", "relatorio_psicologico", "relatorio_multiprofissional"}
)


def supports_test_suggestions(document_type_slug: str) -> bool:
    return document_type_slug in SUPPORTED_DOCUMENT_TYPE_SLUGS


def format_tests_for_prompt() -> str:
    """Renderiza o catálogo agrupado por categoria/subcategoria, pronto para
    ser embutido na instrução de sistema do chat."""
    lines: list[str] = []
    last_category: str | None = None
    last_subcategory: str | None = None
    for test in PSYCHOLOGICAL_TESTS:
        if test.category != last_category:
            lines.append(f"\n{test.category}:")
            last_category = test.category
            last_subcategory = None
        if test.subcategory != last_subcategory:
            if test.subcategory:
                lines.append(f"  {test.subcategory}:")
            last_subcategory = test.subcategory
        prefix = "    - " if test.subcategory else "  - "
        lines.append(
            f"{prefix}{test.name}: {test.description} "
            f"(Público-alvo: {test.target_audience})"
        )
    return "\n".join(lines).strip()
