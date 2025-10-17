# Project Overview

This is a full-stack real-time chat application, consisting of a Django backend API and a React frontend.

## Backend (Django)

### Project Structure

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

### Setup Instructions

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

### Key Features

-   User authentication and authorization.
-   User profile management, including avatars.
-   Real-time chat using Django Channels.

### Important Notes

-   The `id` field is used for querying.
-   The project uses Django REST Framework for API endpoints.
-   Real-time communication is handled via WebSockets, likely configured in `apps/chat/consumers.py` and `apps/chat/routing.py`.

## Frontend (React)

### Project Overview

This is the frontend for a real-time chat application, built with React and Vite. It utilizes Redux Toolkit for state management, Tailwind CSS for styling, and Radix UI for accessible UI components.

### Technologies Used

- **Framework:** React
- **Build Tool:** Vite
- **State Management:** Redux Toolkit
- **Styling:** Tailwind CSS, Radix UI
- **Routing:** React Router DOM
- **API Client:** Axios
- **Authentication:** Google OAuth (via `@react-oauth/google`), JWT (via `jwt-decode`)
- **Utilities:** `js-cookie`, `date-fns`, `framer-motion`

### Project Structure

- `src/app`: Redux store and hooks.
- `src/assets`: Static assets like images.
- `src/components`: Reusable UI components, categorized into `custom` (application-specific) and `ui` (generic, likely Radix UI based).
    - `src/components/custom/chat-page`: Components specific to the chat interface.
- `src/constants`: API routes.
- `src/features`: Redux slices for different application features (auth, chat, error, theme, UI).
- `src/hooks`: Custom React hooks.
- `src/lib`: Utility functions (e.g., `utils.ts` for `cn` function).
- `src/pages`: Top-level page components for different routes.
- `src/services`: API service definitions using Redux Toolkit Query.
- `src/utils`: General utility functions (cookie handling, websocket).

### Setup and Development

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
    (or `uv sync` if `uv` is installed, as per the memory)

2.  **Run Development Server:**
    ```bash
    npm run dev
    ```

3.  **Build for Production:**
    ```bash
    npm run build
    ```

4.  **Linting:**
    ```bash
    npm run lint
    ```

### Key Features

- User Authentication (Login/Registration, Google OAuth)
- Real-time Chat functionality
- User Management (Friends page)
- Theming (via `themeSlice`)
- Error Handling and Toasts

### Conventions

- **State Management:** Redux Toolkit for global state.
- **Styling:** Tailwind CSS classes and Radix UI components.
- **API Calls:** Redux Toolkit Query for data fetching and caching.
- **Component Structure:** Functional components with React hooks.