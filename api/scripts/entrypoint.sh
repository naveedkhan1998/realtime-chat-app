#!/bin/bash

set -e

echo "Entrypoint script starting..."

# Check if we are in production or development
# If DJANGO_DEBUG is missing, default to False (Production behavior)
DEBUG=${DJANGO_DEBUG:-False}

if [ "$DEBUG" = "True" ] || [ "$DEBUG" = "true" ] || [ "$DEBUG" = "1" ]; then
    # Development settings
    echo "Running in development mode..."
    echo "Applying migrations..."
    python3 manage.py migrate
    
    echo "Starting Django development server..."
    python3 manage.py runserver 0.0.0.0:8000
else
    # Production settings
    echo "Running in production mode..."
    
    # Migrations and static files are handled externally/locally as per user request
    # to speed up cold starts and avoid conflicts with Supabase/GCS.
    
    echo "Starting Django ASGI server (Daphne)..."
    exec daphne -b 0.0.0.0 -p 8000 config.asgi:application
fi
