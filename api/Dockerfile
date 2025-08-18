ARG PY_TAG=3.13
FROM python:${PY_TAG}-slim-bookworm AS base
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
COPY --from=ghcr.io/astral-sh/uv:0.8.11 /uv /uvx /bin/



########## Builder ###############
FROM base AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential libpq-dev curl wget git chromium-driver \
  && rm -rf /var/lib/apt/lists/*


WORKDIR /src
COPY pyproject.toml uv.lock* /src/

# 3. Install project deps 
RUN uv sync --locked

########## Runtime ###############
FROM base AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
      netcat-openbsd libpq5 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app

RUN chmod +x /app/scripts/*.sh /app/scripts/production/*.sh
EXPOSE 8000
ENTRYPOINT ["./scripts/entrypoint.sh"]
