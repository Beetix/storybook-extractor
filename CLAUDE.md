# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Storybook Extractor is a CLI tool that scrapes Storybook instances and extracts metadata, documentation HTML, and screenshots into a JSON file. It uses Puppeteer for headless browser automation.

## Commands

```bash
npm run build          # Compile TypeScript (runs lint first via prebuild)
npm run lint           # ESLint check
npm test               # Run Jest tests with coverage
npm test -- --watch    # Watch mode for tests
npm run clean          # Remove build artifacts

# Run the tool
npx storybook-extractor -c ./examples/example.config.js
```

## Architecture

**Entry Point**: `src/index.ts` - CLI setup using sade, loads config file and calls extract()

**Main Pipeline** (`src/extract.ts`):
1. `extractStorybookGlobals()` - Opens Storybook iframe, extracts `window.__STORYBOOK_STORY_STORE__.extract()`
2. `transformStorybookData()` - Converts raw Storybook data into normalized format with URLs
3. `extractDocs()` - Scrapes docs pages for headings, paragraphs, tables, code snippets
4. `extractScreenshots()` - Takes PNG screenshots of each story's rendered component
5. Writes JSON output, then runs any configured post-process scripts

**Concurrency**: Uses `tiny-async-pool` to run scrapers in parallel (configurable via `concurentScrapers`)

**Types** (`src/types.ts`): `Options` (config), `StorybookFormatedData` (transformed story data), `docsOption` (extracted docs)

## Config File Format

```js
module.exports = {
  url: "http://localhost:4400",     // Storybook URL
  output: "./out.json",              // Output path
  concurentScrapers: 20,             // Parallel browser tabs
  postProcess: ["./script.js"],      // Post-processing scripts
};
```
