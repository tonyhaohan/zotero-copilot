# Zotero Copilot - AI-Powered Literature Reader

A Zotero-based PDF/EPUB/HTML reader with integrated AI assistant functionality. This project extends the Zotero reader with an AI panel for interacting with large language models while reading academic papers.

## Features

### AI Assistant Panel
- **Multiple AI Providers**: Support for ChatGPT, Gemini, Claude, and custom URLs
- **Send Selected Text**: Select text in your document and send it to the AI with a keyboard shortcut
- **Resizable Panel**: Drag to resize the AI panel to your preferred width
- **Copy & Paste Workflow**: Copy selected text to clipboard with visual feedback

### Keyboard Shortcuts
- **Ctrl+Shift+L** (Windows/Linux) or **Cmd+Shift+L** (Mac): Send selected text to AI panel
- The AI panel opens automatically when using this shortcut

### Toolbar Integration
- AI Assistant button in the toolbar for quick access
- Visual indicator when the AI panel is active

## Build

Clone the repository:

```
git clone https://github.com/zotero/reader --recursive
```

With Node 18+, run the following:

```
NODE_OPTIONS=--openssl-legacy-provider npm i
NODE_OPTIONS=--openssl-legacy-provider npm run build
```

This will produce `dev`, `web` and `zotero` builds in the `build/` directory.

## Development

Run `npm start` and open http://localhost:3000/dev/reader.html.

To test with a snapshot (HTML) document: http://localhost:3000/dev/reader.html?type=snapshot

## Usage

1. Open a document in the reader
2. Click the AI button in the toolbar (or press Ctrl+Shift+L)
3. Select your preferred AI provider from the dropdown
4. Select text in your document
5. Press Ctrl+Shift+L to send the selected text to the AI panel
6. Click "Copy" to copy the text, then paste it into the AI chat interface

