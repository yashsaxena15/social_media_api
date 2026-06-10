FROM python:3.12-slim

WORKDIR /app

# Install system dependencies required for:
# - mysqlclient
# - building Python packages
# - health/debugging tools
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    build-essential \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry package manager
RUN pip install --no-cache-dir poetry

# Copy dependency files first
# This improves Docker layer caching:
# dependencies won't reinstall if only source code changes
COPY pyproject.toml /app/

# Install Python dependencies
# virtualenv disabled because container itself is isolated
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root

# Copy project files
COPY . /app/

# Django/Gunicorn will listen on port 8000
EXPOSE 8000

# NOTE:
# collectstatic intentionally removed from build stage.
# Build should not depend on Django settings, DB, Redis, or .env.
#
# Run manually after container starts:
#
# docker exec -it social-media-api \
#     python manage.py collectstatic --noinput

# Start Gunicorn
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120"]