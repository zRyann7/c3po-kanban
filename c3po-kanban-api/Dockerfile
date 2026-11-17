# --- Estágio 1: Builder (instala dependências isoladas) ---
FROM python:3.12-slim AS builder

WORKDIR /build

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# --- Estágio 2: Runtime (imagem final leve e segura) ---
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    PORT=8000

# Copia apenas o ambiente virtual já compilado do estágio anterior
COPY --from=builder /opt/venv /opt/venv

# Cria usuário sem privilégios de root
RUN useradd --create-home appuser
USER appuser

# Copia o código da aplicação
COPY --chown=appuser:appuser ./app ./app

EXPOSE 8000

# Usa shell form para respeitar a variável $PORT injetada por provedores cloud
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}