---
name: nano-banana-gen
description: Nano Banana 图像生成 Skill。使用 Google Gemini API 的 Nano Banana 模型生成高质量图像。支持 gemini-3.1-flash-image-preview (nano banana 2) 和 gemini-3-pro-image-preview (nano banana pro) 模型，多种宽高比和分辨率选项。
---

# Nano Banana 图像生成

使用 Google Gemini API 的 Nano Banana 模型生成高质量图像。

## 🚀 快速开始

```bash
# 基本使用（使用默认模型）
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts \
  --prompt "A cute cat" \
  --image cat.png

# 完整参数
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts \
  --prompt "A sunset over mountains" \
  --image sunset.png \
  --model gemini-3.1-flash-image-preview \
  --ar 16:9 \
  --resolution 2k
```

## ⚠️ 使用前必读

### 📌 图像编辑模式（使用参考图片）

**当用户提供图片要求修改时：**
- ✅ 不需要询问模型、宽高比、分辨率参数
- ✅ 直接使用 `--reference` 参数传递参考图片
- ✅ Gemini 会自动保持原图尺寸和风格

**⚠️ 风格迁移 Prompt 黄金法则：**
```bash
# ✅ 推荐：简洁 prompt，让 AI 自己判断风格
--prompt "将图一改成图二的风格"

# ⚠️ 不推荐：过度描述会限制 AI
--prompt "将第一张图片转换成第二张图片的3D卡通玩具风格，包括3D建模效果、圆润可爱的角色外观、材质质感和光影"
```

### 📌 图像生成模式（从零生成）

**当用户的提示词中没有明确指定模型、宽高比或分辨率时，必须先询问用户再生成！**

#### 🎯 交互式列表选择流程

使用以下步骤引导用户选择配置：

**步骤 1：选择模型**

| 序号 | 模型 | 说明 |
|------|------|------|
| 1 | Nano Banana 2 | ⚡ 快速生成，支持 14 种宽高比（包括超长图） |
| 2 | Nano Banana Pro | 🎨 高质量，支持 10 种宽高比 |

> 💡 **提示：** 在后续步骤中，输入 `0` 可返回上一步重新选择。

---

**步骤 2：选择宽高比**

**Nano Banana 2（14 + 返回）：**

| 序号 | 宽高比 | 说明 |
|------|--------|------|
| 0 | `返回` | ↩️ 返回重新选择模型 |
| 1 | `1:1` | 📵 正方形 - 社交媒体配图 |
| 2 | `9:16` | 📱 竖向 - 手机壁纸 |
| 3 | `16:9` | 🖥️ 横向 - 桌面壁纸 |
| 4 | `3:4` | 📼 照片竖向 |
| 5 | `4:3` | 📺 传统横向 |
| 6 | `3:2` | 🖼️ 经典横向 |
| 7 | `2:3` | 🖼️ 经典竖向 |
| 8 | `5:4` | 📄 大画幅横向 |
| 9 | `4:5` | 📄 大画幅竖向 |
| 10 | `21:9` | 🎬 超宽屏 |
| 11 | `4:1` | 📊 超长横向（信息图）|
| 12 | `1:4` | 📏 超长竖向 |
| 13 | `8:1` | 📈 极长横向 |
| 14 | `1:8` | 📉 极长竖向 |

**Nano Banana Pro（10 + 返回）：**

| 序号 | 宽高比 | 说明 |
|------|--------|------|
| 0 | `返回` | ↩️ 返回重新选择模型 |
| 1 | `1:1` | 📵 正方形 - 社交媒体配图 |
| 2 | `9:16` | 📱 竖向 - 手机壁纸 |
| 3 | `16:9` | 🖥️ 横向 - 桌面壁纸 |
| 4 | `3:4` | 📼 照片竖向 |
| 5 | `4:3` | 📺 传统横向 |
| 6 | `3:2` | 🖼️ 经典横向 |
| 7 | `2:3` | 🖼️ 经典竖向 |
| 8 | `5:4` | 📄 大画幅横向 |
| 9 | `4:5` | 📄 大画幅竖向 |
| 10 | `21:9` | 🎬 超宽屏 |

---

**步骤 3：选择分辨率**

**Nano Banana 2（4 + 返回）：**

| 序号 | 分辨率 | 说明 |
|------|--------|------|
| 0 | `返回` | ↩️ 返回重新选择宽高比 |
| 1 | `512` | ⚡ 超快预览 |
| 2 | `1k` | 👁️ 快速预览 |
| 3 | `2k` | 🎨 标准质量（推荐）|
| 4 | `4k` | 💎 高质量/打印 |

**Nano Banana Pro（3 + 返回）：**

| 序号 | 分辨率 | 说明 |
|------|--------|------|
| 0 | `返回` | ↩️ 返回重新选择宽高比 |
| 1 | `1k` | 👁️ 快速预览 |
| 2 | `2k` | 🎨 标准质量（推荐）|
| 3 | `4k` | 💎 高质量/打印 |

---

**步骤 4：确认并生成**

汇总用户的选择，生成完整的命令并执行。

**示例对话：**
```
🍌 选择模型 (1-2)
用户: 1

✅ 已选择：Nano Banana 2

🍌 选择宽高比 (0-14)
用户: 13

✅ 已选择：8:1（极长横向）

🍌 选择分辨率 (0-4)
用户: 0

🍌 返回：选择宽高比 (0-14)
用户: 11

✅ 已选择：4:1（超长横向）

🍌 选择分辨率 (0-4)
用户: 3

✅ 已选择：2K（标准质量）

正在生成...
```

### 🚨 提示词处理规则（重要）

**绝对禁止修改用户的提示词：**
- ✅ 用户给什么提示词，就直接使用什么提示词
- ✅ 中文提示词保持中文，不要翻译
- ✅ 保留所有细节，不要精简或重组
- ✅ 不要添加任何解释性文字
- ✅ 唯一的例外：在提示词末尾添加宽高比信息（如 `Aspect ratio: 3:4.`）

## 模型对比

| 特性 | Nano Banana 2 | Nano Banana Pro |
|------|---------------|-----------------|
| **模型 ID** | `gemini-3.1-flash-image-preview` | `gemini-3-pro-image-preview` |
| **速度** | ⚡ 快速生成 | 🎨 高质量生成 |
| **适用场景** | 预览、日常使用 | 专业作品、打印 |
| **分辨率** | 512、1K、2K、4K | 1K、2K、4K |
| **宽高比** | 1:1、9:16、16:9、3:4、4:3、3:2、2:3、5:4、4:5、21:9<br>**+ 4:1、1:4、8:1、1:8（超长图）** | 1:1、9:16、16:9、3:4、4:3、3:2、2:3、5:4、4:5、21:9 |
| **独特优势** | 支持超长宽高比，512 超快预览 | 更高的图像质量 |

**选择建议：**
- 📱 **社交媒体配图** → Nano Banana 2（512 或 1K）
- 📊 **信息图/长图** → Nano Banana 2（1:8 或 8:1）
- 🖼️ **海报/宣传图** → Nano Banana Pro（2K 或 4K）
- 🎨 **艺术作品/打印** → Nano Banana Pro（4K）

## 选项

| 选项 | 说明 |
|------|------|
| `--prompt <text>`, `-p` | 提示词文本 |
| `--image <path>` | 输出图像路径（必需） |
| `--reference <path/url>` | 参考图片（支持本地文件路径或 URL，可多次使用） |
| `--model <id>`, `-m` | 模型 ID（默认：gemini-3.1-flash-image-preview） |
| `--ar <ratio>` | 宽高比（默认：1:1） |
| `--resolution <res>` | 分辨率（默认：2k） |
| `--json` | JSON 输出格式 |

### 🎨 图像编辑模式（使用参考图片）

**⚠️ 重要：当用户要求基于已有图片进行修改时，必须使用 `--reference` 参数！**

**正确用法：**
```bash
# ✅ 使用 --reference 参数传递参考图片
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts \
  --prompt "将图片中的猫替换成狗，其他保持不变" \
  --image output.png \
  --reference "/path/to/local/image.png"

# ✅ 使用多张参考图片
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts \
  --prompt "让图三的模特穿上图一的衣服和图二的裙子" \
  --image output.png \
  --reference "/path/to/shirt.png" \
  --reference "/path/to/skirt.png" \
  --reference "/path/to/model.webp" \
  --ar 3:4
```

**错误用法：**
```bash
# ❌ 不要在 prompt 中放图片 URL
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts \
  --prompt "基于这张图片修改：https://example.com/original.png，把猫改成狗" \
  --image output.png
```

## 宽高比

### Nano Banana 2 支持的宽高比：
- `1:1` - 正方形（默认）
- `9:16` - 竖向（手机全屏）
- `16:9` - 横向（宽屏）
- `3:4` - 竖向（海报常用）
- `4:3` - 横向
- `3:2` - 横向
- `2:3` - 竖向
- `5:4` - 横向
- `4:5` - 竖向
- `21:9` - 超宽屏
- **`4:1`** - 超长横向（Nano Banana 2 独有）
- **`1:4`** - 超长竖向（Nano Banana 2 独有）
- **`8:1`** - 超长横向（Nano Banana 2 独有）
- **`1:8`** - 超长竖向（Nano Banana 2 独有）

### Nano Banana Pro 支持的宽高比：
- `1:1` - 正方形（默认）
- `9:16` - 竖向（手机全屏）
- `16:9` - 横向（宽屏）
- `3:4` - 竖向（海报常用）
- `4:3` - 横向
- `3:2` - 横向
- `2:3` - 竖向
- `5:4` - 横向
- `4:5` - 竖向
- `21:9` - 超宽屏

## 分辨率

### Nano Banana 2 支持的分辨率：
| 分辨率 | 说明 | 使用场景 |
|--------|------|----------|
| `512` | 超快预览 | 快速草图、速度优先 |
| `1k` | 快速预览 | 草图、快速预览 |
| `2k` | 标准质量（默认） | 日常使用、社交媒体 |
| `4k` | 高质量 | 印刷、专业作品 |

### Nano Banana Pro 支持的分辨率：
| 分辨率 | 说明 | 使用场景 |
|--------|------|----------|
| `1k` | 快速预览 | 草图、快速预览 |
| `2k` | 标准质量（默认） | 日常使用、社交媒体 |
| `4k` | 高质量 | 印刷、专业作品 |

## 环境变量

| 变量 | 说明 |
|------|------|
| `GOOGLE_API_KEY` | Google API 密钥 |
| `GEMINI_API_KEY` | Gemini API 密钥（与 GOOGLE_API_KEY 互换） |

### 获取 API 密钥

访问 [Google AI Studio](https://makersuite.google.com/app/apikey) 获取免费的 API 密钥。

### 配置文件位置

按优先级从高到低，skill 会尝试从以下位置加载 API 密钥：

| 位置 | 路径 | 说明 |
|------|------|------|
| **独立全局配置（推荐）** | `~/.zhc-skills/nano-banana-gen.env` | 仅 Nano Banana 使用，不会和其他 skill 冲突 |
| 共享全局配置（兼容） | `~/.zhc-skills/.env` | 旧配置位置，仍兼容但不再推荐 |
| 项目配置 | `{project}/.env` | 当前项目专用 |

**创建全局配置（推荐）：**
```bash
# 创建全局配置文件
mkdir -p ~/.zhc-skills
echo "GOOGLE_API_KEY=your-api-key-here" > ~/.zhc-skills/nano-banana-gen.env
```

**创建项目配置：**
```bash
# 在项目根目录创建
echo "GOOGLE_API_KEY=your-api-key-here" > .env
```

## 示例

### 生成正方形图像
```bash
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts --prompt "一只可爱的熊猫" --image panda.png --ar 1:1
```

### 生成手机壁纸
```bash
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts --prompt "梦幻星空" --image wallpaper.png --ar 9:16 --resolution 4k
```

### 生成超长竖图（Nano Banana 2 独有）
```bash
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts \
  --prompt "A comprehensive vertical infographic about AI technology. Aspect ratio: 1:8." \
  --image ai-infographic.png \
  --ar 1:8 \
  --resolution 2k \
  --model gemini-3.1-flash-image-preview
```

### 图像编辑（使用参考图片）
```bash
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts \
  --prompt "将图片中的猫替换成可爱的小狗，保持背景和构图不变" \
  --image dogs-playing.png \
  --reference "/path/to/cats-playing.png"
```

### 风格迁移（使用多张参考图片）
```bash
# ✅ 推荐：简洁 prompt
npx -y bun ~/.claude/skills/nano-banana-gen/scripts/main.ts \
  --prompt "将图一改成图二的风格" \
  --image output.png \
  --reference "https://example.com/model-photo.jpg" \
  --reference "https://example.com/3d-artwork.jpg"
```
