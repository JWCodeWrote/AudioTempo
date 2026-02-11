# AudioTempo

AudioTempo is a desktop app built from the **official Electron quick-start template** (`@quick-start/create-electron`, Vue + TypeScript).

## Features

- Batch queue for multiple audio files
- Per-file progress + overall progress bar
- Default UI language: Simplified Chinese, with English switch
- Manual speed input (`0.5`, `0.75`, `1`, `1.1`, `1.25`, and any positive number)
- FFmpeg auto-detect + manual FFmpeg path picker
- macOS + Windows support

## Requirements

- Node.js 20+
- FFmpeg installed and available in PATH (or manually selected in the app)

## Install FFmpeg

### macOS

```bash
brew install ffmpeg
```

### Windows

```powershell
choco install ffmpeg
```

## Development

```bash
npm install
npm run dev
```

Dev server is pinned to IPv4 + fixed port in `electron.vite.config.ts`:
- Host: `127.0.0.1`
- Port: `1420`

## Build

```bash
npm run build
```

## Package

```bash
# Windows
npm run build:win

# macOS
npm run build:mac
```

## GitHub 发布

- 已提供 GitHub Actions 工作流：`.github/workflows/release.yml`
- 触发方式：
  - 推送标签：`v*`（例如 `v1.0.1`）
  - 或手动运行 workflow（输入 tag）
- 工作流会自动构建：
  - Windows 安装包（`.exe`）
  - macOS 安装包（`.dmg`）
- 并自动上传到 GitHub Releases

## 给普通用户的安装指引

- 见 `RELEASE_GUIDE_zh-CN.md`
