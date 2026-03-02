const fs = require('node:fs/promises');
const path = require('node:path');
const vscode = require('vscode');

class ScriptItem extends vscode.TreeItem {
  constructor(relativeLabel, absPath, shortcutLabel) {
    super(relativeLabel, vscode.TreeItemCollapsibleState.None);
    this.tooltip = absPath;
    this.description = shortcutLabel || '';
    this.contextValue = 'script';
    this.absPath = absPath;
    this.command = {
      command: 'localTaskRunner.runScript',
      title: 'Run Script',
      arguments: [this]
    };
  }
}

class ScriptTreeProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.items = [];
    this.currentDirectoryScripts = [];
  }

  refresh() {
    this._onDidChangeTreeData.fire(undefined);
  }

  async getChildren(element) {
    if (element) {
      return [];
    }

    const scanResult = await scanScriptsForActiveEditor();
    this.currentDirectoryScripts = scanResult.currentDirectoryScripts;
    const shortcuts = new Map();
    for (let i = 0; i < Math.min(9, this.currentDirectoryScripts.length); i += 1) {
      shortcuts.set(this.currentDirectoryScripts[i], `Ctrl+Shift+${i + 1}`);
    }

    this.items = scanResult.allScripts.map((script) => (
      new ScriptItem(script.relativePath, script.absPath, shortcuts.get(script.absPath))
    ));
    return this.items;
  }

  getTreeItem(element) {
    return element;
  }

  getCurrentDirectoryScripts() {
    return this.currentDirectoryScripts;
  }
}

function getSupportedExtensions() {
  if (process.platform === 'win32') {
    return new Set(['.bat', '.cmd', '.ps1']);
  }
  return new Set(['.sh']);
}

async function scanScriptsForActiveEditor() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.uri.scheme !== 'file') {
    return { allScripts: [], currentDirectoryScripts: [] };
  }

  const activeFilePath = editor.document.uri.fsPath;
  const activeDir = path.dirname(activeFilePath);
  const wsFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
  const rootPath = wsFolder ? wsFolder.uri.fsPath : null;

  const dirsToScan = buildDirectoryChain(activeDir, rootPath);
  const supported = getSupportedExtensions();
  const allScripts = [];
  let currentDirectoryScripts = [];

  for (let i = 0; i < dirsToScan.length; i += 1) {
    const dirPath = dirsToScan[i];
    let entries;
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      continue;
    }

    const scripts = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => supported.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map((name) => path.join(dirPath, name));

    if (i === 0) {
      currentDirectoryScripts = scripts;
    }

    for (const scriptPath of scripts) {
      allScripts.push({
        absPath: scriptPath,
        relativePath: toRelativeDisplayPath(activeDir, scriptPath)
      });
    }
  }

  return { allScripts, currentDirectoryScripts };
}

function buildDirectoryChain(activeDir, rootPath) {
  if (!rootPath) {
    return [activeDir];
  }

  const chain = [];
  let current = activeDir;

  while (true) {
    chain.push(current);
    if (path.resolve(current) === path.resolve(rootPath)) {
      break;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return chain;
}

function toRelativeDisplayPath(baseDir, targetPath) {
  const rel = path.relative(baseDir, targetPath).replaceAll(path.sep, '/');
  if (!rel || rel === '.') {
    return './';
  }
  if (rel.startsWith('../')) {
    return rel;
  }
  return `./${rel}`;
}

async function runScript(scriptPath) {
  if (!vscode.workspace.isTrusted) {
    vscode.window.showWarningMessage('Local Task Runner: Script execution is disabled in untrusted workspaces.');
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.uri.scheme !== 'file') {
    vscode.window.showInformationMessage('Local Task Runner: Open a file editor first.');
    return;
  }

  const cwd = path.dirname(editor.document.uri.fsPath);
  const ext = path.extname(scriptPath).toLowerCase();

  let execution;
  if (ext === '.ps1') {
    execution = new vscode.ShellExecution('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath
    ], { cwd });
  } else {
    execution = new vscode.ShellExecution(scriptPath, [], { cwd });
  }

  const task = new vscode.Task(
    { type: 'shell', task: 'localTaskRunner.runScript' },
    vscode.TaskScope.Workspace,
    `Run ${path.basename(scriptPath)}`,
    'Local Task Runner',
    execution
  );

  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Shared,
    clear: false,
    focus: false
  };

  await vscode.tasks.executeTask(task);
}

function activate(context) {
  const provider = new ScriptTreeProvider();
  let refreshTimer;

  const scheduleRefresh = () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    refreshTimer = setTimeout(() => {
      provider.refresh();
    }, 80);
  };

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('localTaskRunner.scripts', provider)
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => scheduleRefresh())
  );

  context.subscriptions.push(
    vscode.window.onDidChangeWindowState((state) => {
      if (state.focused && vscode.window.activeTextEditor) {
        scheduleRefresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('localTaskRunner.refresh', () => provider.refresh())
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('localTaskRunner.runScript', async (item) => {
      if (!item || !item.absPath) {
        return;
      }
      await runScript(item.absPath);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('localTaskRunner.runByIndex', async (index) => {
      const oneBased = Number(index);
      if (!Number.isInteger(oneBased) || oneBased < 1 || oneBased > 9) {
        return;
      }

      const scripts = provider.getCurrentDirectoryScripts();
      const scriptPath = scripts[oneBased - 1];
      if (!scriptPath) {
        return;
      }

      await runScript(scriptPath);
    })
  );

  context.subscriptions.push(
    new vscode.Disposable(() => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    })
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
