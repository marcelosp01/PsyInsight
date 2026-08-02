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

**Estado atual (PSYIN-1 e PSYIN-2 concluídos):** a plataforma já suporta a criação manual (via formulário) e a pré-visualização/exportação de todas as 6 modalidades de documentos regulamentadas, com autenticação completa de usuários e persistência de dados. Cada psicólogo também pode salvar, renomear, reabrir para edição e excluir seus próprios laudos preenchidos, através da tela "Meus Laudos" (repositório de laudos por usuário, PSYIN-2). A geração e edição **orientada por IA** (chat de mapeamento de demanda, preenchimento assistido via Gemini) ainda **não foi implementada** — está descrita na seção "Design da IA" como diretriz para quando essa funcionalidade for desenvolvida.

## Processo de Desenvolvimento

Quando instruído a criar uma funcionalidade:
1. Utilize suas ferramentas Atlassian para ler as instruções da funcionalidade no Jira.
2. Desenvolva a funcionalidade — não pule nenhuma etapa do processo de desenvolvimento em 7 passos (feature-dev).
3. Teste exaustivamente a funcionalidade com testes unitários e de integração, corrigindo eventuais falhas.
4. Envie um PR utilizando suas ferramentas do GitHub.

## Design da IA

> Diretriz para funcionalidades futuras — a integração com LLM ainda não foi implementada nesta base de código.

Ao escrever código para realizar chamadas a LLMs, utilize a SDK oficial do Google GenAI ou o LiteLLM integrados ao modelo **Gemini 1.5 Pro** (para raciocínio complexo e redação dos laudos) e **Gemini 1.5 Flash** (para interações rápidas no chat).

- **Respostas Estruturadas (Structured Outputs):** Utilize o recurso nativo de *Structured Outputs* (exigindo schemas JSON rígidos) para garantir o preenchimento correto dos campos regulamentares de cada documento psicológico (Identificação, Descrição da Demanda, Procedimento, Análise, Conclusão, Referências) conforme a Resolução CFP nº 06/2019.
- **Streaming & Chat:** Implemente respostas em *streaming* no chat de interações para fornecer feedback em tempo real ao psicólogo durante o mapeamento da demanda clínica.

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
- **Modalidades de documento** (`app/document_types.py`): schema de campos por modalidade (Declaração, Atestado, Relatório Psicológico, Relatório Multiprofissional, Laudo, Parecer) conforme os artigos da Resolução CFP nº 06/2019. Exposto via `GET /api/documents/types` (rota protegida).
- **Geração de PDF** (`app/pdf.py`, `POST /api/documents/pdf`): usa `fpdf2`. Atenção ao usar `multi_cell(0, ...)`: sempre chamar `pdf.set_x(pdf.l_margin)` antes — combinar `align="C"` com largura automática (`0`) sem resetar `x` faz o fpdf2 herdar a posição do cursor da chamada anterior e pode disparar `FPDFException: Not enough horizontal space` (ver helper `_write_line` em `pdf.py`).
- **Repositório de laudos por usuário** (`app/models.py::SavedDocument`, `app/routers/saved_documents.py`, prefixo `/api/documents/saved`): CRUD completo (`POST`, `GET` lista resumida, `GET /{id}` detalhe, `PUT /{id}` atualiza título/valores — usado tanto para salvar de novo quanto para renomear —, `DELETE /{id}`), sempre filtrado por `user_id` (um usuário nunca acessa laudo de outro; tentativa retorna 404 genérico). Os valores preenchidos são guardados como JSON (`SavedDocument.values`).
- **Testes:** `backend/app/tests/` (pytest + `TestClient`), banco SQLite temporário isolado por sessão de teste via `conftest.py` (usa `reset_database()`, não `init_database()`). Rodar com `uv run pytest`.
- Dependência `email-validator` é necessária para o `EmailStr` do Pydantic (não vem por padrão com `pydantic[email]`).

### Frontend (`frontend/`)

- **Stack:** Vite + React 19 + TypeScript + React Router + Tailwind CSS v4 (config via `@theme` em `src/index.css`, sem `tailwind.config.js`).
- **Paleta de cores calmas:** tons `nude` (terracota/areia suave — trocado do antigo verde-sálvia) e `slate` (azul-acinzentado) definidos em `src/index.css`.
- **Estrutura:** `src/api/client.ts` (cliente fetch com cookies, inclui `api.savedDocuments.{list,get,create,update,remove}`), `src/context/AuthContext.tsx`, `src/components/` (`DocumentForm`, `DocumentPreview`, `ProtectedRoute`, `SaveDocumentModal`), `src/pages/` (`LoginPage`, `SignupPage`, `DashboardPage`, `MeusLaudosPage`).
- **`DashboardPage`:** layout de duas colunas (formulário à esquerda, preview em tempo real à direita), empilha em telas estreitas (`grid-cols-1 lg:grid-cols-2`). Seletor de modalidade, botão **Salvar** (abre `SaveDocumentModal` pedindo um título, cria ou atualiza via `api.savedDocuments`), download de PDF e impressão (`window.print()` com CSS de impressão em `src/index.css` restrito a `#document-preview`). Abrir um laudo salvo em "Meus Laudos" navega para `/?laudoId={id}`; um efeito carrega os valores e a modalidade de volta no formulário e passa a sobrescrever esse mesmo registro ao salvar novamente.
- **`MeusLaudosPage`** (rota `/meus-laudos`): lista os laudos salvos do usuário logado, com ações para abrir (carrega no `DashboardPage`), renomear (inline, `PUT` só com `title`) e excluir (`DELETE`, com confirmação).
- **Testes:** Vitest + Testing Library (`*.test.tsx` ao lado dos componentes/páginas). Rodar com `npm test`. Setup em `src/test/setup.ts`.
- Em desenvolvimento, o Vite (porta 5173) faz proxy de `/api` para o backend (porta 8000) — ver `vite.config.ts`.

### Dependências de terceiros — decisões relevantes

- `react-router-dom` fixado em `^7.18.2`: versões `6.0.0–7.17.0` têm múltiplos advisories de alta severidade (a maioria SSR/RSC, não aplicável a este SPA client-side); `7.18.2` é a versão mais recente que resolve todos exceto um advisory específico de modo RSC (não utilizado aqui).