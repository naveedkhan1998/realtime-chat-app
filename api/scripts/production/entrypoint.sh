#!/bin/bash

set -e

echo "Entrypoint script starting..."
echo "Running in production mode..."

# Migrations and static files are handled externally/locally as per user request
# to speed up cold starts and avoid conflicts with Supabase/GCS.

echo "Starting Django ASGI server (Daphne)..."
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application
