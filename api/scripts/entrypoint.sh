#!/bin/bash

# Run migrations
echo "Applying database migrations..."
# python3 manage.py makemigrations
# python3 manage.py migrate

# python3 manage.py initadmin

# Collect static files (if needed)
# echo "Collecting static files..."
#python3 manage.py collectstatic --noinput

# Start the server with Uvicorn ASGI workers
echo "Starting Django ASGI server..."
# uvicorn
# exec gunicorn config.asgi:application --bind 0.0.0.0:8000 -k uvicorn.workers.UvicornWorker
# daphne
python3 manage.py runserver 0.0.0.0:8000
