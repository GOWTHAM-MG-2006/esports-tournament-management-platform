web: python backend/manage.py migrate && gunicorn config.wsgi --chdir backend --bind 0.0.0.0:${PORT:-8000}
