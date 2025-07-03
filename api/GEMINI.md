# Project Overview

This is a Django web application that provides real-time chat functionality and user account management.

## Project Structure

- `manage.py`: Django's command-line utility for administrative tasks.
- `apps/`: Contains individual Django applications.
    - `accounts/`: Handles user authentication, registration, and profile management.
    - `chat/`: Implements real-time chat features.
- `config/`: Project-level configuration.
    - `settings.py`: Main Django settings file.
    - `urls.py`: Project URL routing.
    - `asgi.py`: ASGI configuration for Django Channels (for real-time features).
    - `wsgi.py`: WSGI configuration.
- `requirements.txt`: Lists Python dependencies for the project.
- `Dockerfile`, `entrypoint.sh`: Files for Dockerizing the application.
- `media/`: Directory for user-uploaded media files (e.g., avatars).
- `static/`: Directory for static assets (CSS, JavaScript, images).

## Setup Instructions

1.  **Prerequisites:** Ensure Python and `uv` are installed.
2.  **Install Dependencies:**
    ```bash
    uv sync
    ```
3.  **Database Migrations:**
    ```bash
    python manage.py migrate
    ```
4.  **Create Superuser (Optional):**
    ```bash
    python manage.py createsuperuser
    ```
5.  **Run Development Server:**
    ```bash
    python manage.py runserver
    ```

## Key Features

-   User authentication and authorization.
-   User profile management, including avatars.
-   Real-time chat using Django Channels.

## Important Notes

-   The `id` field is used for querying.
-   The project uses Django REST Framework for API endpoints.
-   Real-time communication is handled via WebSockets, likely configured in `apps/chat/consumers.py` and `apps/chat/routing.py`.