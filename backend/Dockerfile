# Backend image: Django + DRF + gunicorn, static via WhiteNoise.
# Build context is the REPO ROOT (requirements.txt lives there).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY tests/ ./tests/
COPY pytest.ini ./

WORKDIR /app/backend

# Collect static files (needs no DB; settings carry working defaults).
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120"]
