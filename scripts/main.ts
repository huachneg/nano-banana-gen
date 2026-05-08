import path from "node:path";
import process from "node:process";
import { homedir } from "node:os";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import type { CliArgs, NanoBananaModel, AspectRatio, Resolution, ExtendConfig, GenerateImageResponse } from "./types";
import { generateImage } from "./google";

function printUsage(): void {
  console.log(`Usage:
  npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "A cat" --image cat.png
  npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "A landscape" --image landscape.png --ar 16:9
  npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "A portrait" --image portrait.png --resolution 4k
  npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "A cyberpunk city" --image city.png --model gemini-3-pro-image-preview --ar 21:9 --resolution 4k

Options:
  -p, --prompt <text>       Prompt text
  --image <path>            Output image path (required)
  --reference <url>         Reference image URL for image-to-image generation
  -m, --model <id>          Model: gemini-3.1-flash-image-preview (nano banana 2, default), gemini-3-pro-image-preview (nano banana pro)
  --ar <ratio>              Aspect ratio: 1:1 (default), 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9, 4:1, 1:4, 8:1, 1:8 (nano banana 2 only)
  --resolution <res>        Resolution: 512, 1K, 2K (default), 4K (512 only for nano banana 2)
  --json                    JSON output
  -h, --help                Show help

Environment variables:
  GOOGLE_API_KEY            Google API key (get from https://makersuite.google.com/app/apikey)
  GEMINI_API_KEY            Gemini API key (alias for GOOGLE_API_KEY)
  NANO_BANANA_MODEL         Default model (gemini-3.1-flash-image-preview)
  NANO_BANANA_AR            Default aspect ratio (1:1)
  NANO_BANANA_RESOLUTION    Default resolution (2K)

Models:
  gemini-3.1-flash-image-preview  Nano Banana 2 (fast, default)
  gemini-3-pro-image-preview      Nano Banana Pro (high quality)

Aspect Ratios:
  Common (both models):
    1:1   Square (default)
    2:3   Portrait
    3:2   Landscape
    3:4   Portrait
    4:3   Landscape
    4:5   Portrait
    5:4   Landscape
    9:16  Portrait (mobile wallpaper)
    16:9  Landscape (widescreen)
    21:9  Ultra-wide
  Nano Banana 2 only:
    4:1   Extra-long landscape
    1:4   Extra-long portrait
    8:1   Ultra-long landscape
    1:8   Ultra-long portrait (infographics)

Resolutions:
  Common (both models): 1K, 2K (default), 4K
  Nano Banana 2 only: 512 (fast preview)`);
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    prompt: null,
    imagePath: null,
    referenceImageUrl: null,
    referenceImageUrls: [],
    model: null,
    aspectRatio: null,
    resolution: null,
    json: false,
    help: false,
  };

  const positional: string[] = [];

  // Define capabilities for each model
  const modelCapabilities = {
    "gemini-3.1-flash-image-preview": {
      aspectRatios: ["1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9", "4:1", "1:4", "8:1", "1:8"] as const,
      resolutions: ["512", "1K", "2K", "4K"] as const,
    },
    "gemini-3-pro-image-preview": {
      aspectRatios: ["1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9"] as const,
      resolutions: ["1K", "2K", "4K"] as const,
    },
  };

  // All valid aspect ratios and resolutions (union of both models)
  const allValidRatios: AspectRatio[] = ["1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9", "4:1", "1:4", "8:1", "1:8"];
  const allValidResolutions: Resolution[] = ["512", "1K", "2K", "4K"];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;

    if (a === "--help" || a === "-h") {
      out.help = true;
      continue;
    }

    if (a === "--json") {
      out.json = true;
      continue;
    }

    if (a === "--prompt" || a === "-p") {
      const v = argv[++i];
      if (!v) throw new Error(`Missing value for ${a}`);
      out.prompt = v;
      continue;
    }

    if (a === "--image") {
      const v = argv[++i];
      if (!v) throw new Error(`Missing value for ${a}`);
      out.imagePath = v;
      continue;
    }

    if (a === "--reference") {
      const v = argv[++i];
      if (!v) throw new Error(`Missing value for ${a}`);
      out.referenceImageUrl = v; // For backward compatibility
      out.referenceImageUrls.push(v);
      continue;
    }

    if (a === "--model" || a === "-m") {
      const v = argv[++i];
      if (!v) throw new Error(`Missing value for ${a}`);
      if (v !== "gemini-3.1-flash-image-preview" && v !== "gemini-3-pro-image-preview") {
        throw new Error(`Invalid model: ${v}. Supported: gemini-3.1-flash-image-preview, gemini-3-pro-image-preview`);
      }
      out.model = v as NanoBananaModel;
      continue;
    }

    if (a === "--ar") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --ar");
      if (!allValidRatios.includes(v as AspectRatio)) {
        throw new Error(`Invalid aspect ratio: ${v}. Supported: ${allValidRatios.join(", ")}`);
      }
      out.aspectRatio = v as AspectRatio;
      continue;
    }

    if (a === "--resolution") {
      const v = argv[++i]?.toUpperCase();
      if (!v) throw new Error("Missing value for --resolution");
      if (!allValidResolutions.includes(v as Resolution)) {
        throw new Error(`Invalid resolution: ${v}. Supported: ${allValidResolutions.join(", ")}`);
      }
      out.resolution = v as Resolution;
      continue;
    }

    if (a.startsWith("-")) {
      throw new Error(`Unknown option: ${a}`);
    }

    positional.push(a);
  }

  if (!out.prompt && positional.length > 0) {
    out.prompt = positional.join(" ");
  }

  return out;
}

function extractYamlFrontMatter(content: string): string | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*$/m);
  return match ? match[1] : null;
}

function parseSimpleYaml(yaml: string): Partial<ExtendConfig> {
  const config: Partial<ExtendConfig> = {
    version: 1,
    default_model: null,
    default_aspect_ratio: null,
    default_resolution: null,
  };
  const lines = yaml.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.includes(":") && !trimmed.startsWith("-")) {
      const colonIdx = trimmed.indexOf(":");
      const key = trimmed.slice(0, colonIdx).trim();
      let value = trimmed.slice(colonIdx + 1).trim();

      if (value === "null" || value === "") {
        value = "null";
      }

      if (key === "version") {
        config.version = value === "null" ? 1 : parseInt(value, 10);
      } else if (key === "default_model") {
        const cleaned = value.replace(/[']/g, "").replace(/[\"]/g, "");
        config.default_model = (cleaned === "null" ? null : cleaned) as NanoBananaModel | null;
      } else if (key === "default_aspect_ratio") {
        const cleaned = value.replace(/[']/g, "").replace(/[\"]/g, "");
        config.default_aspect_ratio = (cleaned === "null" ? null : cleaned) as AspectRatio | null;
      } else if (key === "default_resolution") {
        const cleaned = value.replace(/[']/g, "").replace(/[\"]/g, "").toUpperCase();
        config.default_resolution = (cleaned === "null" ? null : cleaned) as Resolution | null;
      }
    }
  }

  return config;
}

async function loadExtendConfig(): Promise<Partial<ExtendConfig>> {
  const home = homedir();
  const cwd = process.cwd();

  const paths = [
    path.join(cwd, ".zhc-skills", "nano-banana-gen", "EXTEND.md"),
    path.join(home, ".zhc-skills", "nano-banana-gen", "EXTEND.md"),
  ];

  for (const p of paths) {
    try {
      const content = await readFile(p, "utf8");
      const yaml = extractYamlFrontMatter(content);
      if (!yaml) continue;

      return parseSimpleYaml(yaml);
    } catch {
      continue;
    }
  }

  return {};
}

function mergeConfig(args: CliArgs, extend: Partial<ExtendConfig>): CliArgs {
  return {
    ...args,
    model: args.model ?? extend.default_model ?? null,
    // When using reference images, don't apply default_aspect_ratio - let it auto-detect from reference image
    aspectRatio: args.aspectRatio ?? (args.referenceImageUrls.length > 0 ? null : extend.default_aspect_ratio) ?? null,
    resolution: args.resolution ?? extend.default_resolution ?? null,
  };
}

async function readPromptFromStdin(): Promise<string | null> {
  if (process.stdin.isTTY) return null;
  try {
    const t = await Bun.stdin.text();
    const v = t.trim();
    return v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

async function loadEnvFile(p: string): Promise<Record<string, string>> {
  try {
    const content = await readFile(p, "utf8");
    const env: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
    return env;
  } catch {
    return {};
  }
}

async function loadEnv(): Promise<void> {
  const home = homedir();
  const cwd = process.cwd();

  // Load from multiple locations in order of priority (lowest to highest)
  // 1. Shared global config (legacy fallback)
  const sharedGlobalEnv = await loadEnvFile(path.join(home, ".zhc-skills", ".env"));
  // 2. Dedicated Nano Banana config
  const dedicatedGlobalEnv = await loadEnvFile(path.join(home, ".zhc-skills", "nano-banana-gen.env"));
  // 3. Project standard .env
  const cwdEnv = await loadEnvFile(path.join(cwd, ".env"));

  // Apply in order: shared global -> dedicated global -> project
  for (const [k, v] of Object.entries(sharedGlobalEnv)) {
    if (!process.env[k]) process.env[k] = v;
  }
  for (const [k, v] of Object.entries(dedicatedGlobalEnv)) {
    if (!process.env[k]) process.env[k] = v;
  }
  for (const [k, v] of Object.entries(cwdEnv)) {
    if (!process.env[k]) process.env[k] = v;
  }
}

function normalizeOutputImagePath(p: string): string {
  const full = path.resolve(p);
  const ext = path.extname(full);
  if (ext) return full;
  return `${full}.png`;
}

async function main(): Promise<void> {
  // Load environment variables first
  await loadEnv();

  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  const extendConfig = await loadExtendConfig();
  const mergedArgs = mergeConfig(args, extendConfig);

  // Set defaults
  if (!mergedArgs.model) mergedArgs.model = "gemini-3.1-flash-image-preview";
  // When using reference image, let Gemini auto-detect aspect ratio
  if (!mergedArgs.aspectRatio && mergedArgs.referenceImageUrls.length === 0) mergedArgs.aspectRatio = "1:1";
  if (!mergedArgs.resolution) mergedArgs.resolution = "2K";

  // Model capabilities
  const modelCapabilities: Record<NanoBananaModel, { aspectRatios: readonly string[]; resolutions: readonly string[] }> = {
    "gemini-3.1-flash-image-preview": {
      aspectRatios: ["1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9", "4:1", "1:4", "8:1", "1:8"],
      resolutions: ["512", "1K", "2K", "4K"],
    },
    "gemini-3-pro-image-preview": {
      aspectRatios: ["1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9"],
      resolutions: ["1K", "2K", "4K"],
    },
  };

  // Validate aspect ratio and resolution against selected model
  const capabilities = modelCapabilities[mergedArgs.model!];
  if (mergedArgs.aspectRatio && !capabilities.aspectRatios.includes(mergedArgs.aspectRatio)) {
    console.error(`Error: Aspect ratio ${mergedArgs.aspectRatio} is not supported by ${mergedArgs.model}`);
    console.error(`Supported aspect ratios for ${mergedArgs.model}: ${capabilities.aspectRatios.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  if (mergedArgs.resolution && !capabilities.resolutions.includes(mergedArgs.resolution)) {
    console.error(`Error: Resolution ${mergedArgs.resolution} is not supported by ${mergedArgs.model}`);
    console.error(`Supported resolutions for ${mergedArgs.model}: ${capabilities.resolutions.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  let prompt = mergedArgs.prompt;
  if (!prompt) prompt = await readPromptFromStdin();

  if (!prompt) {
    console.error("Error: Prompt is required");
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (!mergedArgs.imagePath) {
    console.error("Error: --image is required");
    printUsage();
    process.exitCode = 1;
    return;
  }

  const outputPath = normalizeOutputImagePath(mergedArgs.imagePath);

  const imageData = await generateImage(prompt, mergedArgs.model, mergedArgs, mergedArgs.referenceImageUrls);

  const dir = path.dirname(outputPath);
  await mkdir(dir, { recursive: true });
  await writeFile(outputPath, imageData);

  if (mergedArgs.json) {
    const response: GenerateImageResponse = {
      savedImage: outputPath,
      model: mergedArgs.model,
      aspectRatio: mergedArgs.aspectRatio,
      resolution: mergedArgs.resolution,
      prompt: prompt.slice(0, 200),
    };
    console.log(JSON.stringify(response, null, 2));
  } else {
    console.log(outputPath);
  }
}

// SKILL_DIR should point to the parent directory (containing SKILL.md)
const SKILL_DIR = path.dirname(import.meta.dir);

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(msg);
  process.exit(1);
});
