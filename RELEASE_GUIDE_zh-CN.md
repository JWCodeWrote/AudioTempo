# AudioTempo 小白安装指南（Windows / macOS）

这个指南给不会写代码的用户，按步骤操作即可。

## 1. 去哪里下载

1. 打开项目的 GitHub 页面。
2. 点击 `Releases`。
3. 下载对应系统的安装包：
   - Windows: `audiotempo-*-setup.exe`
   - macOS: `audiotempo-*.dmg`

## 2. Windows 安装

1. 双击 `audiotempo-*-setup.exe`。
2. 按提示完成安装。
3. 第一次运行若出现安全提示，点击“更多信息”并允许运行。

## 3. macOS 安装

1. 双击 `audiotempo-*.dmg`。
2. 把 AudioTempo 拖到 `Applications`。
3. 第一次打开若被拦截，进入：
   - `系统设置 -> 隐私与安全性`
   - 选择“仍要打开”。

## 4. 首次使用（FFmpeg）

AudioTempo 需要 FFmpeg 才能转换音频。

### macOS（推荐）

```bash
brew install ffmpeg
```

### Windows（推荐）

```powershell
choco install ffmpeg
```

如果不会装，也可以在应用里点击：

- `FFmpeg 安装指引`
- `选择 FFmpeg 文件` 手动指定 `ffmpeg.exe`（或 macOS 的 `ffmpeg`）

## 5. 基本操作

1. 选择倍速（或手动输入）。
2. 点击 `添加音频文件`。
3. 点击 `开始批量转换`。
4. 看每个文件进度和总进度，完成后在输出路径查看结果。

## 6. 中英切换

- 默认是简体中文。
- 右上角可以切换到 English。
