# Projeto PsyInsight

## Visão Geral

O **PsyInsight** é uma plataforma SaaS desenvolvida para auxiliar psicólogos na elaboração, estruturação e redação qualificada de laudos e documentos psicológicos, com suporte de Inteligência Artificial[cite: 1].
O sistema utiliza como diretriz técnica e ética as modalidades de documentos estabelecidas pela **Resolução CFP nº 06/2019** do Conselho Federal de Psicologia[cite: 1].
O profissional pode interagir via chat de IA para estabelecer a demanda, orientar o raciocínio clínico e preencher de forma precisa os campos regulamentares de cada documento[cite: 1].

A regulamentação e as orientações detalhadas sobre a elaboração dos documentos estão descritas no arquivo PDF localizado em `/docs/Resolução-CFP-n-06-2019-comentada.pdf`[cite: 1].

As modalidades cobertas pelo sistema, em conformidade com a Resolução CFP nº 06/2019, englobam[cite: 1]:
- **Declaração** (Art. 9º)[cite: 1]
- **Atestado Psicológico** (Art. 10)[cite: 1]
- **Relatório Psicológico** (Art. 11)[cite: 1]
- **Relatório Multiprofissional** (Art. 12)[cite: 1]
- **Laudo Psicológico** (Art. 13)[cite: 1]
- **Parecer Psicológico** (Art. 14)[cite: 1]

**Estado atual (PSYIN-1, PSYIN-2 e PSYIN-3 concluídos):** a plataforma suporta a pré-visualização/exportação de todas as 6 modalidades de documentos regulamentadas, com autenticação completa de usuários e persistência de dados. Cada psicólogo pode salvar, renomear, reabrir para edição e excluir seus próprios laudos preenchidos, através da tela "Meus Laudos" (repositório de laudos por usuário, PSYIN-2). O preenchimento não é mais feito por formulário manual: um **chat conversacional com IA** (Gemini) conduz a entrevista — primeiro ajudando o(a) psicólogo(a) a escolher a modalidade do documento, depois fazendo perguntas objetivas para cobrir os campos regulamentares de cada modalidade. Para cada modalidade, o corpo do documento é um único texto corrido, redigido e articulado pela própria IA (não uma lista de campos isolados), atualizado na pré-visualização a cada resposta do usuário no chat (PSYIN-3). Preferências de padronização pedidas pelo psicólogo são lembradas entre laudos futuros.

## Processo de Desenvolvimento

Quando instruído a criar uma funcionalidade:
1. Utilize suas ferramentas Atlassian para ler as instruções da funcionalidade no Jira.
2. Desenvolva a funcionalidade — não pule nenhuma etapa do processo de desenvolvimento em 7 passos (feature-dev).
3. Teste exaustivamente a funcionalidade com testes unitários e de integração, corrigindo eventuais falhas.
4. Envie um PR utilizando suas ferramentas do GitHub.

## Design da IA

Implementado com a SDK oficial `google-genai` (`backend/app/gemini_client.py`). Modelos configurados via `app/config.py` com aliases `-latest` (resistentes a depreciação de versões numeradas fixas): `gemini_chat_model` (`gemini-pro-latest`, conversa) e `gemini_extraction_model` (`gemini-flash-latest`, extração estruturada).

- **Streaming & Chat:** `gemini_client.stream_chat_reply` usa `generate_content_stream` para respostas conversacionais em tempo real (SSE), texto puro — sem `response_schema`, pois misturar JSON parcial com texto solto em streaming não é confiável.
- **Respostas Estruturadas (Structured Outputs):** `gemini_client.extract_structured_values` usa `generate_content` (não-streaming) com `response_schema` (schema Pydantic dinâmico, `document_types.build_extraction_model`) para extrair/atualizar os campos de cada modalidade a partir da conversa, a cada turno.
  - **Cuidado:** a API não-streaming do Gemini rejeita `contents` cujo último turno seja `"model"` (`400 Requests ending with a model turn are not supported`) — como o turno mais recente da conversa é sempre a resposta do assistente que acabou de ser gerada, `extract_structured_values` envia o histórico inteiro como um único turno `"user"` contendo a transcrição em texto (`_render_transcript`), em vez de turnos alternados.
- **Texto corrido articulado pela IA:** cada modalidade de documento tem um único campo de corpo com `kind="prose"` (`document_types.py`) — a IA não apenas extrai dados isolados, mas redige o parágrafo completo do documento, reescrevendo-o por inteiro a cada turno conforme a instrução em `chat_service.build_extraction_instruction`. `DocumentPreview.tsx` e `pdf.py` renderizam campos `prose` como texto corrido, sem o rótulo do campo.
- **Seleção de modalidade pelo chat:** antes de existir uma `ChatSession`, `POST /api/chat/modality-selection` (`chat_service.run_modality_selection_turn`) conduz uma conversa sem estado persistido (sem `session_id`) para ajudar o(a) psicólogo(a) a escolher a modalidade; quando resolvida, o frontend cria a `ChatSession` real via `POST /api/chat/sessions`.
- **Memória de padronização:** preferências que o(a) psicólogo(a) pede para lembrar entre laudos ficam em `UserMemory` (uma linha por usuário, `app/models.py`), aplicadas via `chat_service.build_chat_instruction`.

Certifique-se de que a chave `GEMINI_API_KEY` (ou `GOOGLE_API_KEY`) esteja configurada no arquivo `.env` na raiz do projeto.

## Arquitetura Técnica

O projeto completo é empacotado em um contêiner Docker (`Dockerfile` multi-stage na raiz + `docker-compose.yml`).
O backend fica em `backend/`, utilizando **uv** e **FastAPI**.
O frontend fica em `frontend/`.
O banco de dados utiliza **SQLite** e persiste entre restarts do contêiner: `init_database()` no `lifespan` do FastAPI apenas cria as tabelas que ainda não existem (`create_all`), sem apagar dados, e o arquivo (`backend/data/psyinsight.db`) fica no volume nomeado `psyinsight-data` (`docker-compose.yml`, montado em `/app/backend/data`) — sem esse volume, `docker compose down && docker compose up --build` recriaria o contêiner do zero e apagaria tudo, mesmo com `init_database()`. `reset_database()` (drop + create) continua existindo só para isolar cada execução de teste (`conftest.py`) — nunca é chamada em produção.
O frontend é compilado estaticamente (`npm run build`) e servido diretamente via FastAPI (`StaticFiles` + fallback de SPA em `backend/app/main.py`).

Scripts no diretório `scripts/` para operacionalização (todos testados e funcionais):

```bash
# Mac
scripts/start-mac.sh    # Iniciar
scripts/stop-mac.sh     # Parar

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```

Todos os scripts chamam `docker compose up --build -d` / `docker compose down`. A aplicação fica disponível em `http://localhost:8000`.

## Estado Atual da Implementação

### Backend (`backend/`)

- **Stack:** FastAPI + SQLAlchemy (síncrono) + SQLite, gerenciado com `uv` (`pyproject.toml` / `uv.lock`).
- **Autenticação** (`app/auth.py`, `app/routers/auth.py`): senha com hash via `bcrypt` (não `passlib` — incompatibilidade conhecida entre `passlib` e `bcrypt>=4.1`), sessão via JWT (`python-jose`) armazenado em cookie `httponly` (`psyinsight_session`). Endpoints: `POST /api/auth/signup`, `/login`, `/logout`, `GET /api/auth/me`.
- **Modelo de usuário** (`app/models.py`): nome, e-mail, **CRP** (necessário para o cabeçalho dos documentos), senha com hash.
- **Modalidades de documento** (`app/document_types.py`): schema de campos por modalidade (Declaração, Atestado, Relatório Psicológico, Relatório Multiprofissional, Laudo, Parecer) conforme os artigos da Resolução CFP nº 06/2019. Cada modalidade tem os campos de cabeçalho comuns (nome, CRP, cidade e data) mais um único campo de corpo `kind="prose"` (texto corrido articulado pela IA — ver "Design da IA") e, quando aplicável, um campo opcional `referencias` à parte (é uma lista de citações, não faz parte da narrativa). Exposto via `GET /api/documents/types` (rota protegida).
- **Geração de PDF** (`app/pdf.py`, `POST /api/documents/pdf`): usa `fpdf2`. Campos `kind="prose"` são escritos sem o rótulo do campo em negrito (texto corrido puro), os demais mantêm o rótulo. Atenção ao usar `multi_cell(0, ...)`: sempre chamar `pdf.set_x(pdf.l_margin)` antes — combinar `align="C"` com largura automática (`0`) sem resetar `x` faz o fpdf2 herdar a posição do cursor da chamada anterior e pode disparar `FPDFException: Not enough horizontal space` (ver helper `_write_line` em `pdf.py`).
- **Repositório de laudos por usuário** (`app/models.py::SavedDocument`, `app/routers/saved_documents.py`, prefixo `/api/documents/saved`): CRUD completo (`POST`, `GET` lista resumida, `GET /{id}` detalhe, `PUT /{id}` atualiza título/valores — usado tanto para salvar de novo quanto para renomear —, `DELETE /{id}`), sempre filtrado por `user_id` (um usuário nunca acessa laudo de outro; tentativa retorna 404 genérico). Os valores preenchidos são guardados como JSON (`SavedDocument.values`).
- **Chat de IA** (`app/chat_service.py`, `app/gemini_client.py`, `app/routers/chat.py`, prefixo `/api/chat`): `POST /api/chat/modality-selection` (sem sessão persistida) ajuda a escolher a modalidade; `POST /api/chat/sessions` cria ou retoma (por `saved_document_id`) uma `ChatSession`; `POST /api/chat/sessions/{id}/messages` processa um turno e retorna eventos via SSE (`token`, `values`, `memory`, `error`, `done`). `ChatSession`/`ChatMessage`/`UserMemory` em `app/models.py`, sempre filtrados por `user_id`.
- **Testes:** `backend/app/tests/` (pytest + `TestClient`), banco SQLite temporário isolado por sessão de teste via `conftest.py` (usa `reset_database()`, não `init_database()`). Rodar com `uv run pytest`. Testes de chat mockam `gemini_client.stream_chat_reply`/`extract_structured_values` (nunca chamam a API real).
- Dependência `email-validator` é necessária para o `EmailStr` do Pydantic (não vem por padrão com `pydantic[email]`).

### Frontend (`frontend/`)

- **Stack:** Vite + React 19 + TypeScript + React Router + Tailwind CSS v4 (config via `@theme` em `src/index.css`, sem `tailwind.config.js`).
- **Paleta de cores calmas:** tons `nude` (terracota/areia suave — trocado do antigo verde-sálvia) e `slate` (azul-acinzentado) definidos em `src/index.css`.
- **Estrutura:** `src/api/client.ts` (cliente fetch com cookies, inclui `api.savedDocuments.{list,get,create,update,remove}` e `api.chat.{createOrResumeSession,selectModality,sendMessage}`), `src/api/sse.ts` (parsing do stream SSE do chat), `src/context/AuthContext.tsx`, `src/components/` (`ChatPanel`, `DocumentPreview`, `ProtectedRoute`, `SaveDocumentModal`), `src/pages/` (`LoginPage`, `SignupPage`, `DashboardPage`, `MeusLaudosPage`). Não há mais formulário manual (`DocumentForm` foi removido).
- **`DashboardPage`:** layout de duas colunas de mesma altura e cabeçalhos alinhados (`ChatPanel` à esquerda, `DocumentPreview` à direita), empilha em telas estreitas (`grid-cols-1 lg:grid-cols-2`). Não há seletor de modalidade: o próprio `ChatPanel` conduz a seleção da modalidade no início da conversa (`POST /api/chat/modality-selection`, sem sessão) e só depois cria a `ChatSession` real; a pré-visualização mostra um placeholder até a modalidade ser definida. Botão **Novo laudo** no cabeçalho reinicia a conversa (necessário desde que o seletor manual foi removido). Botão **Salvar** (abre `SaveDocumentModal` pedindo um título, cria ou atualiza via `api.savedDocuments`), download de PDF e impressão (`window.print()` com CSS de impressão em `src/index.css` restrito a `#document-preview`) — desabilitados até a modalidade ser definida. Abrir um laudo salvo em "Meus Laudos" navega para `/?laudoId={id}`; um efeito carrega os valores e a modalidade de volta e passa a sobrescrever esse mesmo registro ao salvar novamente.
- **`ChatPanel`:** duas fases internas — seleção de modalidade (histórico mantido só no componente, sem `session_id`) e entrevista real (`ChatSession` persistida). Ao resolver a modalidade mid-conversa, chama `onDocumentTypeChange` (sobe para o `DashboardPage`) e inicia a entrevista real preservando as mensagens já trocadas na tela.
- **`DocumentPreview`:** campos `kind="prose"` são renderizados como parágrafo contínuo (sem rótulo de campo, com placeholder conversacional enquanto vazio); demais campos mantêm rótulo + valor. Fonte da pré-visualização em Helvetica (`--font-preview` em `src/index.css`), igual à usada no PDF gerado.
- **`MeusLaudosPage`** (rota `/meus-laudos`): lista os laudos salvos do usuário logado, com ações para abrir (carrega no `DashboardPage`), renomear (inline, `PUT` só com `title`) e excluir (`DELETE`, com confirmação).
- **Testes:** Vitest + Testing Library (`*.test.tsx` ao lado dos componentes/páginas). Rodar com `npm test`. Setup em `src/test/setup.ts`. Helper `src/test/sse.ts` (`makeSSEResponse`) simula respostas SSE do chat nos testes.
- Em desenvolvimento, o Vite (porta 5173) faz proxy de `/api` para o backend (porta 8000) — ver `vite.config.ts`.

### Dependências de terceiros — decisões relevantes

- `react-router-dom` fixado em `^7.18.2`: versões `6.0.0–7.17.0` têm múltiplos advisories de alta severidade (a maioria SSR/RSC, não aplicável a este SPA client-side); `7.18.2` é a versão mais recente que resolve todos exceto um advisory específico de modo RSC (não utilizado aqui).