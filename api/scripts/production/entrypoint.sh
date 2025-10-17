#!/bin/bash

# Run migrations
echo "Applying database migrations..."
# uv run manage.py makemigrations
uv run manage.py migrate

# uv run manage.py initadmin

# Collect static files (if needed)
# echo "Collecting static files..."
#uv run manage.py collectstatic --noinput

# Start the server with Uvicorn ASGI workers
echo "Starting Django ASGI server..."
# uvicorn
# exec gunicorn config.asgi:application --bind 0.0.0.0:8000 -k uvicorn.workers.UvicornWorker
# daphne
uv run manage.py runserver 0.0.0.0:8000
