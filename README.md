# Nano Banana 图像生成 Skill

使用 Google Gemini API 的 Nano Banana 模型生成高质量图像。

## 安装

1. 确保已安装 [Bun](https://bun.sh/)
2. 获取 Google API 密钥：访问 https://makersuite.google.com/app/apikey
3. 设置环境变量：

```bash
export GOOGLE_API_KEY="your-api-key-here"
```

或创建独立配置文件 `~/.zhc-skills/nano-banana-gen.env`（推荐）：

```bash
GOOGLE_API_KEY=your-api-key-here
```

## 使用方法

### 基本使用

```bash
# 生成正方形图像（默认 2K 分辨率，使用 Pro 模型）
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts --prompt "A cute cat" --image cat.png

# 使用 Flash 模型（更快）
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts --prompt "A sunset" --image sunset.png --model gemini-3.1-flash-image-preview

# 指定宽高比
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts --prompt "A mountain landscape" --image mountain.png --ar 16:9

# 指定分辨率
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts --prompt "A portrait photo" --image portrait.png --resolution 4k

# 组合使用
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts --prompt "A futuristic city at night" --image city.png --model gemini-3-pro-image-preview --ar 21:9 --resolution 4k
```

### 可用模型

| 模型 | 说明 |
|------|------|
| `gemini-3-pro-image-preview` | Nano Banana Pro - 高质量生成（默认） |
| `gemini-3.1-flash-image-preview` | Nano Banana 2 - 快速生成 |

### 宽高比选项

`1:1` | `2:3` | `3:2` | `3:4` | `4:3` | `4:5` | `5:4` | `9:16` | `16:9` | `21:9`

### 分辨率选项

`1K` | `2K`（默认）| `4K`

## 配置文件

### API 密钥配置

按优先级从高到低，skill 会尝试从以下位置加载 API 密钥：

| 位置 | 路径 | 说明 |
|------|------|------|
| **独立全局配置（推荐）** | `~/.zhc-skills/nano-banana-gen.env` | 仅 Nano Banana 使用，不会和其他 skill 冲突 |
| 共享全局配置（兼容） | `~/.zhc-skills/.env` | 旧配置位置，仍兼容但不再推荐 |
| 项目配置 | `{project}/.env` | 当前项目专用 |

### 默认值配置

可以创建配置文件来设置默认值。

**项目配置**: `<project>/.zhc-skills/nano-banana-gen/EXTEND.md`
**用户配置**: `~/.zhc-skills/nano-banana-gen/EXTEND.md`

```yaml
---
version: 1
default_model: gemini-3-pro-image-preview
default_aspect_ratio: "1:1"
default_resolution: "2K"
---
```

## 在 Claude Code 中使用

在对话中直接要求生成图像：

```
请用 Nano Banana 生成一张可爱的熊猫图片，16:9 比例
```

Claude 会自动调用这个 skill 来生成图像。

## 示例

### 生成手机壁纸
```bash
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts \
  --prompt "梦幻星空，紫色和蓝色渐变，带有闪烁的星星" \
  --image wallpaper.png \
  --ar 9:16 \
  --resolution 4k
```

### 生成文章封面
```bash
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts \
  --prompt "AI 技术文章封面，现代科技感，蓝色主题" \
  --image cover.png \
  --ar 16:9 \
  --resolution 2k
```

### 快速预览（使用 Flash 模型 + 1K 分辨率）
```bash
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts \
  --prompt "A simple tree illustration" \
  --image tree.png \
  --model gemini-3.1-flash-image-preview \
  --resolution 1k
```

## API 参考

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-p, --prompt <text>` | 提示词文本 | 必需 |
| `--image <path>` | 输出图像路径 | 必需 |
| `-m, --model <id>` | 模型 ID | gemini-3-pro-image-preview |
| `--ar <ratio>` | 宽高比 | 1:1 |
| `--resolution <res>` | 分辨率 | 2K |
| `--json` | JSON 输出 | false |
| `-h, --help` | 显示帮助 | - |

## 技术细节

- 使用 Google Gemini API 的 `/v1beta/models/{model}:generateContent` 端点
- 支持 HTTP 代理（通过环境变量配置）
- 自动重试机制（失败后重试一次）
- 支持通过 curl 或 fetch 发送请求（检测到代理时使用 curl）
