import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { CliArgs, Resolution } from "./types";

export function getDefaultModel(): string {
  return process.env.NANO_BANANA_MODEL || process.env.GOOGLE_IMAGE_MODEL || "gemini-3-pro-image-preview";
}

function getGoogleApiKey(): string | null {
  return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || null;
}

/**
 * Display configuration diagnostic information
 */
export async function diagnoseConfig(): Promise<void> {
  const home = homedir();
  const cwd = process.cwd();

  const configPaths = [
    { name: "Project .env", path: path.join(cwd, ".env") },
    { name: "Global ZHC config", path: path.join(home, ".zhc-skills", ".env") },
  ];

  console.error("\n🔍 Configuration Diagnostic:");
  console.error("=" .repeat(60));

  for (const config of configPaths) {
    const exists = existsSync(config.path);
    const status = exists ? "✅ Found" : "❌ Not found";
    console.error(`  ${status}: ${config.name}`);
    console.error(`           ${config.path}`);
  }

  console.error("\n📋 Environment Variables:");
  const hasGoogleKey = !!process.env.GOOGLE_API_KEY;
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  console.error(`  ${hasGoogleKey ? "✅" : "❌"} GOOGLE_API_KEY: ${hasGoogleKey ? "Set (length: " + process.env.GOOGLE_API_KEY!.length + ")" : "Not set"}`);
  console.error(`  ${hasGeminiKey ? "✅" : "❌"} GEMINI_API_KEY: ${hasGeminiKey ? "Set (length: " + process.env.GEMINI_API_KEY!.length + ")" : "Not set"}`);

  console.error("\n💡 Setup Instructions:");
  console.error("  Create one of the following files with your API key:");
  console.error(`  1. ${path.join(home, ".zhc-skills", ".env")} (recommended, global)`);
  console.error(`  2. ${path.join(cwd, ".env")} (project-specific)`);
  console.error("\n  File content:");
  console.error("  GOOGLE_API_KEY=your-api-key-here");
  console.error("\n  Get your API key from: https://makersuite.google.com/app/apikey");
  console.error("=" .repeat(60) + "\n");
}

function getGoogleBaseUrl(): string {
  const base = process.env.GOOGLE_BASE_URL || "https://generativelanguage.googleapis.com";
  return base.replace(/\/+$/g, "");
}

function buildGoogleUrl(pathname: string): string {
  const base = getGoogleBaseUrl();
  const cleanedPath = pathname.replace(/^\/+/, "");
  if (base.endsWith("/v1beta")) return `${base}/${cleanedPath}`;
  return `${base}/v1beta/${cleanedPath}`;
}

function toModelPath(model: string): string {
  return `models/${model}`;
}

function getHttpProxy(): string | null {
  return (
    process.env.https_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.http_proxy ||
    process.env.HTTP_PROXY ||
    process.env.ALL_PROXY ||
    null
  );
}

async function postGoogleJsonViaCurl<T>(
  url: string,
  apiKey: string,
  body: unknown,
): Promise<T> {
  const proxy = getHttpProxy();
  const bodyStr = JSON.stringify(body);
  const proxyArgs = proxy ? `-x "${proxy}"` : "";

  const result = execSync(
    `curl -s --connect-timeout 30 --max-time 300 ${proxyArgs} "${url}" -H "Content-Type: application/json" -H "x-goog-api-key: ${apiKey}" -d @-`,
    { input: bodyStr, maxBuffer: 100 * 1024 * 1024, timeout: 310000 },
  );

  const parsed = JSON.parse(result.toString()) as any;
  if (parsed.error) {
    throw new Error(
      `Google API error (${parsed.error.code}): ${parsed.error.message}`,
    );
  }
  return parsed as T;
}

async function postGoogleJsonViaFetch<T>(
  url: string,
  apiKey: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google API error (${res.status}): ${err}`);
  }

  return (await res.json()) as T;
}

async function postGoogleJson<T>(pathname: string, body: unknown): Promise<T> {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    await diagnoseConfig();
    throw new Error("GOOGLE_API_KEY or GEMINI_API_KEY is required. Get your API key from https://makersuite.google.com/app/apikey");
  }

  const url = buildGoogleUrl(pathname);
  const proxy = getHttpProxy();

  // When an HTTP proxy is detected, use curl instead of fetch
  if (proxy) {
    return postGoogleJsonViaCurl<T>(url, apiKey, body);
  }

  return postGoogleJsonViaFetch<T>(url, apiKey, body);
}

function buildPromptWithAspect(
  prompt: string,
  ar: string | null,
): string {
  if (!ar) return prompt;
  return `${prompt} Aspect ratio: ${ar}.`;
}

function getResolutionValue(resolution: Resolution): "1K" | "2K" | "4K" {
  return resolution;
}

function extractInlineImageData(response: {
  candidates?: Array<{
    content?: { parts?: Array<{ inlineData?: { data?: string } }> };
  }>;
}): string | null {
  for (const candidate of response.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      const data = part.inlineData?.data;
      if (typeof data === "string" && data.length > 0) return data;
    }
  }
  return null;
}

interface ImageDimensions {
  width: number;
  height: number;
}

export async function fetchImageAsBase64(urlOrPath: string): Promise<string> {
  // Check if it's a local file path (not http/https URL)
  if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
    // Handle local file path
    try {
      const buffer = await readFile(urlOrPath);
      return buffer.toString('base64');
    } catch (error) {
      throw new Error(`Failed to read local file: ${urlOrPath}`);
    }
  }

  // Handle URL (existing logic)
  const response = await fetch(urlOrPath);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return base64;
}

/**
 * Fetch image dimensions from URL or local file path using sips (macOS) or file command
 */
export async function fetchImageDimensions(urlOrPath: string): Promise<ImageDimensions> {
  let tmpPath: string;
  let isTempFile = false;

  // Check if it's a local file path (not http/https URL)
  if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
    // It's a local file path, use it directly
    tmpPath = urlOrPath;
  } else {
    // It's a URL, download the image to a temporary file
    tmpPath = `/tmp/temp_img_${Date.now()}`;
    isTempFile = true;
    try {
      // Download image using curl with follow redirects
      execSync(`curl -sL "${urlOrPath}" -o "${tmpPath}"`, { timeout: 30000 });
    } catch (error) {
      throw new Error(`Failed to download image from URL: ${urlOrPath}`);
    }
  }

  try {
    // Try sips first (more reliable on macOS)
    try {
      const output = execSync(`sips -g pixelWidth -g pixelHeight "${tmpPath}"`, { encoding: "utf-8" });
      const widthMatch = output.match(/pixelWidth:\s*(\d+)/);
      const heightMatch = output.match(/pixelHeight:\s*(\d+)/);

      if (widthMatch && heightMatch) {
        const width = parseInt(widthMatch[1], 10);
        const height = parseInt(heightMatch[1], 10);

        if (width > 0 && height > 0) {
          return { width, height };
        }
      }
    } catch {
      // sips failed, try file command
    }

    // Fallback to file command
    const output = execSync(`file "${tmpPath}"`, { encoding: "utf-8" });
    const match = output.match(/(\d+)\s*x\s*(\d+)/);

    if (!match) {
      throw new Error(`Could not parse image dimensions from: ${output}`);
    }

    const width = parseInt(match[1], 10);
    const height = parseInt(match[2], 10);

    return { width, height };
  } finally {
    // Clean up temp file only if it was a downloaded URL
    if (isTempFile) {
      try {
        execSync(`rm -f "${tmpPath}"`);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Calculate aspect ratio from dimensions
 * Returns the closest matching aspect ratio from supported options
 */
export function dimensionsToAspectRatio(dimensions: ImageDimensions): string {
  const { width, height } = dimensions;
  const ratio = width / height;

  // Define common aspect ratios with their approximate values
  const aspectRatios: { ratio: string; value: number }[] = [
    { ratio: "21:9", value: 21 / 9 },
    { ratio: "16:9", value: 16 / 9 },
    { ratio: "5:4", value: 5 / 4 },
    { ratio: "4:3", value: 4 / 3 },
    { ratio: "1:1", value: 1 },
    { ratio: "3:4", value: 3 / 4 },
    { ratio: "4:5", value: 4 / 5 },
    { ratio: "9:16", value: 9 / 16 },
    { ratio: "2:3", value: 2 / 3 },
  ];

  // Find the closest match
  let closest = aspectRatios[0];
  let minDiff = Math.abs(ratio - closest.value);

  for (const ar of aspectRatios) {
    const diff = Math.abs(ratio - ar.value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = ar;
    }
  }

  return closest.ratio;
}

export async function generateImage(
  prompt: string,
  model: string,
  args: CliArgs,
  referenceImageUrls?: string[],
): Promise<Uint8Array> {
  const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];

  // Determine effective aspect ratio
  let effectiveAspectRatio = args.aspectRatio;

  // When using reference images and no aspect ratio is specified, auto-detect from first reference image
  if (referenceImageUrls && referenceImageUrls.length > 0 && !effectiveAspectRatio) {
    console.log(`Auto-detecting aspect ratio from reference image...`);
    try {
      const dimensions = await fetchImageDimensions(referenceImageUrls[0]);
      effectiveAspectRatio = dimensionsToAspectRatio(dimensions);
      console.log(`Auto-detected aspect ratio: ${effectiveAspectRatio}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`Warning: Could not detect aspect ratio from reference image: ${errorMsg}, using default 1:1`);
      effectiveAspectRatio = "1:1";
    }
  }

  // Add prompt with aspect ratio
  const promptWithAspect = buildPromptWithAspect(prompt, effectiveAspectRatio);
  parts.push({ text: promptWithAspect });

  // Add reference images if provided (after text, matching Python SDK pattern)
  if (referenceImageUrls && referenceImageUrls.length > 0) {
    console.log(`Loading ${referenceImageUrls.length} reference image(s)...`);
    for (const url of referenceImageUrls) {
      const imageBase64 = await fetchImageAsBase64(url);
      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType: "image/png",
        },
      });
    }
    console.log(`Reference images loaded.`);
  }

  const resolution = getResolutionValue(args.resolution || "2K");
  const imageConfig: { imageSize: "1K" | "2K" | "4K" } = {
    imageSize: resolution,
  };

  console.log(`Generating image with ${model}...`);
  if (referenceImageUrls && referenceImageUrls.length > 0) {
    console.log(`  Using ${referenceImageUrls.length} reference image(s)`);
  }
  console.log(`  Aspect Ratio: ${effectiveAspectRatio || "1:1"}`);
  console.log(`  Resolution: ${resolution}`);

  const response = await postGoogleJson<{
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { data?: string } }> };
    }>;
  }>(`${toModelPath(model)}:generateContent`, {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig,
    },
  });
  console.log("Generation completed.");

  const imageData = extractInlineImageData(response);
  if (imageData) return Uint8Array.from(Buffer.from(imageData, "base64"));

  throw new Error("No image in response");
}
