# PsyInsight

Plataforma para auxiliar psicólogos na elaboração de laudos e documentos psicológicos, seguindo as modalidades da Resolução CFP nº 06/2019.

## Executando com Docker

```bash
# Mac
scripts/start-mac.sh
scripts/stop-mac.sh

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```

A aplicação fica disponível em [http://localhost:8000](http://localhost:8000). O banco SQLite é recriado do zero a cada inicialização do contêiner.

## Desenvolvimento local

### Backend (FastAPI + uv)

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
uv run pytest
```

### Frontend (Vite + React + TypeScript)

```bash
cd frontend
npm install
npm run dev
npm test
```

O servidor de desenvolvimento do frontend (porta 5173) faz proxy de `/api` para o backend (porta 8000).
