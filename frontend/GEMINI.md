# UI/UX Redesign Plan

This document outlines the plan for a complete UI/UX redesign of the frontend, focusing on a modern, intuitive chat application experience. The goal is to improve usability and aesthetics without breaking existing functionality.

## Core Principles

- **Two-Column Layout:** Persistent left sidebar for navigation and lists, main content area for active views.
- **Responsiveness:** Adaptable design for mobile, tablet, and desktop.
- **Clarity & Simplicity:** Clean interface, easy to understand interactions.
- **Accessibility:** Leverage Radix UI for accessible components.

## File Modifications & New Components

### 1. `frontend/GEMINI.md` (This file)

    -   Document the redesign plan.

### 2. `src/App.tsx`

    -   **Purpose:** Establish the main two-column layout.
    -   **Changes:**
        -   Wrap existing `Routes` within a new layout structure.
        -   Integrate the new `Sidebar` component.
        -   Ensure the main content area dynamically renders based on routing.

### 3. `src/components/custom/Sidebar.tsx` (New Component)

    -   **Purpose:** Left-hand navigation and list display.
    -   **Structure:**
        -   User profile section (avatar, name, status).
        -   Navigation links/icons (e.g., Chats, Friends, Settings).
        -   Search bar.
        -   Dynamic content area for conversation list or friend list (depending on active navigation).
    -   **Dependencies:** Will likely consume data from Redux slices (e.g., `authSlice`, `chatSlice`).

### 4. `src/components/custom/ChatWindow.tsx` (New Component - to be used within `chat-page.tsx`)

    -   **Purpose:** Encapsulate the chat message display and input.
    -   **Structure:**
        -   Chat Header (current chat partner/group info).
        -   Message Display Area (scrollable, distinct message bubbles).
        -   Message Input Area (text input, emoji, attachment, send button).
    -   **Dependencies:** Will interact with `chatSlice` for sending/receiving messages.

### 5. `src/components/custom/MessageBubble.tsx` (New Component - to be used within `ChatWindow.tsx`)

    -   **Purpose:** Display individual chat messages.
    -   **Structure:**
        -   Sender's avatar (if applicable).
        -   Message content.
        -   Timestamp.
        -   Read receipts/status indicators.
    -   **Styling:** Differentiate between sent and received messages.

### 6. `src/pages/chat-page.tsx`

    -   **Purpose:** Integrate the new `ChatWindow` component into the page.
    -   **Changes:**
        -   Simplify the page to primarily render the `ChatWindow` component, passing necessary props.
        -   Remove direct message rendering logic, delegating to `ChatWindow`.

### 7. `src/pages/friends-page.tsx`

    -   **Purpose:** Adapt to the new two-column layout.
    -   **Changes:**
        -   Ensure it renders correctly within the main content area.
        -   No major structural changes to its core functionality, but styling will be updated to match the new design system.

### 8. `src/pages/home-page.tsx` and `src/pages/login-page.tsx`

    -   **Purpose:** Ensure these pages also fit the new design language.
    -   **Changes:**
        -   Mainly styling adjustments to align with the new visual theme.

### 9. `src/index.css` / Tailwind Configuration

    -   **Purpose:** Update global styles and Tailwind configuration if needed.
    -   **Changes:**
        -   Review and potentially adjust base styles.
        -   Ensure Tailwind classes are consistently applied.

## Implementation Steps (Iterative)

1.  **Create `frontend/GEMINI.md` (Done).**
2.  **Modify `src/App.tsx` for the main layout.**
3.  **Create `src/components/custom/Sidebar.tsx` (initial empty component).**
4.  **Integrate `Sidebar` into `App.tsx`.**
5.  **Develop `Sidebar` content (user info, navigation, search).**
6.  **Create `src/components/custom/ChatWindow.tsx` (initial empty component).**
7.  **Create `src/components/custom/MessageBubble.tsx` (initial empty component).**
8.  **Integrate `ChatWindow` into `chat-page.tsx`.**
9.  **Develop `ChatWindow` (header, message display, input).**
10. **Develop `MessageBubble` styling and content.**
11. **Refine styling across all affected components using Tailwind CSS.**
12. **Ensure responsiveness for various screen sizes.**
13. **Thoroughly test all existing functionalities (authentication, chat, friends, etc.) to ensure no regressions.**
