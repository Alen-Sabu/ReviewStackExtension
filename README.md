# ReviewStack VS Code Extension

This is the frontend for the ReviewStack VS Code extension. It provides a user interface for interacting with the AI-powered features of ReviewStack.

## Features

- **Code Review**: Get AI-powered feedback on your code.
- **Chat Interface**: Interact with the AI agent through a chat interface.
- **Code Lens**: See suggestions and insights directly in your code.
- **Sidebar**: A dedicated sidebar for ReviewStack.

## Project Structure

- `src/extension.ts`: The main entry point for the extension.
- `src/webview/`: Contains the code for the webview UI.
- `src/managers/`: Contains managers for different parts of the extension, like the status bar and decorations.
- `src/providers/`: Contains providers for features like CodeLens and the sidebar.
- `src/services/`: Contains services for interacting with the backend and VS Code APIs.
- `media/`: Contains static assets like icons and stylesheets.

## Getting Started

### Prerequisites

- Node.js 16+
- npm

### Installation

1.  Clone the repository.
2.  Navigate to the `reviewstack` directory.
3.  Install the dependencies:

    ```bash
    npm install
    ```

### Running the extension

1.  Open the `reviewstack` directory in VS Code.
2.  Press `F5` to start a new VS Code window with the extension running.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

