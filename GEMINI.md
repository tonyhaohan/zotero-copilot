# Zotero Copilot (pdf-reader)

## Project Overview
This project appears to be a custom PDF and EPUB reader for Zotero, built with React and TypeScript. It uses `webpack` for building and `webpack-dev-server` for local development.

在与我对话时，以及写artifacts、task、walkthrough时都使用中文。
暂时不用维护pdf和epub的reader功能，专注实现出html的reader功能。

## Key Components
- **PDF Reader**: Based on `pdfjs`.
- **EPUB Reader**: Based on `epubjs` (custom fork or local version).
- **UI**: React-based interface.
- **Build System**: Webpack with multiple configurations for different targets (Zotero, Web, iOS, Android, Dev).

## Project Structure
- `src/`: Source code.
- `epubjs/`: Local dependency for EPUB functionality.
- `pdfjs/`: PDF.js related files.
- `res/`: Resources (icons, etc.).
- `demo/`: Demo files for development.

## Current Status
- **Build**: `npm start` runs `webpack-dev-server`.
- **Issues**:
    - `epubjs` module resolution errors.
    - Missing `locales` (`.ftl` files).

## Setup
1.  Initialize submodules: `git submodule update --init --recursive`
2.  `npm install`
3.  `npm run build:reader` (to fetch locales)
4.  `npm start`
