# syntax=docker/dockerfile:1

# ---- Frontend build stage ----
FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/index.html frontend/vite.config.ts frontend/tsconfig*.json ./
COPY frontend/public ./public
COPY frontend/src ./src
RUN npm run build

# ---- Backend + final runtime stage ----
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim
WORKDIR /app/backend

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY backend/app ./app
RUN uv sync --frozen --no-dev

COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

ENV PATH="/app/backend/.venv/bin:${PATH}"
EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
