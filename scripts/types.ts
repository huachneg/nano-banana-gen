export type NanoBananaModel = "gemini-3.1-flash-image-preview" | "gemini-3-pro-image-preview";

// All supported aspect ratios (union of both models' capabilities)
export type AspectRatio =
  // Common ratios (both models)
  | "1:1" | "9:16" | "16:9" | "3:4" | "4:3" | "3:2" | "2:3" | "5:4" | "4:5" | "21:9"
  // Nano Banana 2 exclusive ratios
  | "4:1" | "1:4" | "8:1" | "1:8";

export type Resolution = "512" | "1K" | "2K" | "4K";

export interface CliArgs {
  prompt: string | null;
  imagePath: string | null;
  referenceImageUrl: string | null; // Deprecated: use referenceImageUrls
  referenceImageUrls: string[]; // Support multiple reference images
  model: NanoBananaModel | null;
  aspectRatio: AspectRatio | null;
  resolution: Resolution | null;
  json: boolean;
  help: boolean;
}

export interface ExtendConfig {
  version: number;
  default_model: NanoBananaModel | null;
  default_aspect_ratio: AspectRatio | null;
  default_resolution: Resolution | null;
}

export interface GenerateImageResponse {
  savedImage: string;
  model: string;
  aspectRatio: string;
  resolution: string;
  prompt: string;
}
