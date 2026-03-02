# Local Task Runner

[English README](./README.md)

Local Task Runner は、アクティブファイル周辺の実行可能スクリプトを検出し、サイドバーから実行できる JavaScript-only の VS Code 拡張機能です。

## スクリーンショット

![実行画面](./images/image.png)

## 現在の状態

このリポジトリには、公開に必要な基本ファイル群と、動作する実装が含まれています。

## 挙動

- アクティブファイルのディレクトリと、その親ディレクトリ（ワークスペースルートまで）をスキャンします。
- 各ディレクトリの直下のみをスキャンします（再帰スキャンなし）。
- OS ごとにスクリプトをフィルタします。
  - Windows: `.bat`, `.cmd`, `.ps1`
  - macOS / Linux: `.sh`
- ファイル名昇順でスクリプトを並べます。
- 共有ターミナル出力を使い、VS Code タスクとして実行します。
- `.ps1` は PowerShell で実行します。
  - `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File <scriptPath>`
- 実行前の確認ダイアログはありません。
- カスタム設定はありません。
- 専用ログチャネルはありません。
- 多言語メタデータ対応:
  - `en`（デフォルト）, `ja`, `zh`, `fr`, `de`, `es`

## キーバインド

キーバインドの適用条件:

`editorTextFocus && isWorkspaceTrusted && !terminalFocus`

- `Ctrl+Shift+1` ... `Ctrl+Shift+9`: カレントディレクトリグループ（`./`）の1番目から9番目のスクリプトを実行します。

## セキュリティ

ワークスペースが信頼されていない場合、スクリプト実行はブロックされます。

## 開発

```bash
npm install
```

その後、このフォルダを VS Code で開き、拡張機能ホストを実行してください（`F5`）。

## リポジトリ

https://github.com/tanakamasayuki/vscode-local-task-runner
