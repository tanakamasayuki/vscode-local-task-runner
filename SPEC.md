# Local Task Runner - Specification

## Overview

Tool name: `Local Task Runner`

Repository: <https://github.com/tanakamasayuki/vscode-local-task-runner>

Implementation policy: `JavaScript only` (no TypeScript, no transpilation step)

A VS Code extension that automatically discovers executable scripts in
the active file's directory and its parent hierarchy up to the workspace
root, and allows one-click execution via the sidebar.

This extension is designed for store publication but optimized for
personal workflow efficiency.

------------------------------------------------------------------------

## Script Discovery

### Scan Scope

When the active editor changes, the extension scans:

-   The directory of the active file
-   Each direct parent directory
-   Up to the workspace folder root

Only the direct contents of each directory are scanned (no recursive
search).

If the active file is not part of a workspace: - Only its own directory
is scanned.

Ordering:

-   Scripts within each directory are sorted by filename (ascending)

------------------------------------------------------------------------

## Supported Script Types (MVP)

Scripts are filtered by OS:

### Windows

-   `.bat`
-   `.cmd`
-   `.ps1`

### macOS / Linux

-   `.sh`

Only extensions appropriate to the current OS are shown.

------------------------------------------------------------------------

## PowerShell Execution Strategy (.ps1)

`.ps1` files are executed using:

powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File
"`<scriptPath>`{=html}"

Rationale: - No user configuration required - Does not modify system
execution policy - Avoids profile side effects - Minimizes execution
blocking issues

------------------------------------------------------------------------

## Execution Model

Scripts are executed as VS Code Tasks using `vscode.tasks.executeTask`.

### Execution Behavior

-   `cwd` is set to the active file's directory
-   Shared terminal panel is used
-   Multiple executions are allowed (no deduplication in MVP)
-   No confirmation dialog before click-to-run execution
-   No dedicated log output channel; use standard task execution output only

------------------------------------------------------------------------

## Sidebar UI Behavior

### Structure

Scripts are grouped by directory level:

-   `./` (active file directory)
-   `../`
-   `../../`
-   ...
-   `<workspace root>`

Each directory is a tree group. Only current directory is expanded by
default.

------------------------------------------------------------------------

## Refresh Behavior

The script list updates when: - The active editor changes

------------------------------------------------------------------------

## Keybindings

### Primary Execution

-   Click → Run script (no arguments)

### Keyboard Shortcuts

For scripts in the current directory only:

-   Ctrl+Shift+1 → Run first script
-   Ctrl+Shift+2 → Run second script
-   ...
-   Ctrl+Shift+9 → Run ninth script

Keybindings are active when `editorTextFocus && isWorkspaceTrusted && !terminalFocus`.

------------------------------------------------------------------------

## Argument Handling

Default behavior: - No arguments passed

------------------------------------------------------------------------

## Localization

-   Default language is English (`en`)
-   UI language follows the VS Code display language when available
-   Japanese (`ja`)
-   Chinese (`zh`)
-   French (`fr`)
-   German (`de`)
-   Spanish (`es`)
-   Fallback to English for unsupported locales

------------------------------------------------------------------------

## Security Behavior

If the workspace is not trusted: - Script execution is disabled

------------------------------------------------------------------------

## MVP Scope

Included: - OS-based extension filtering - Parent directory traversal up
to workspace root - Filename ascending sort - VS Code Task-based
execution - PowerShell execution policy bypass handling - Keyboard
execution for current directory (1--9) - JavaScript-only implementation
- No execution confirmation step - No dedicated log channel -
Localization support (`en`, `ja`, `zh`, `fr`, `de`, `es`)

Not Included (Future Enhancements): - Recursive scanning - Custom
extension configuration - User settings additions - Interpreter detection
(bash/pwsh probing) - Execution history - Argument presets
