export interface ConvertResult {
  success: boolean;
  markdown?: string;
  filename?: string;
  error?: string;
  images?: ImageInfo[];
}

export interface ImageInfo {
  id: string;
  base64: string;
  contentType: string;
}

export interface ConvertOptions {
  filename: string;
  buffer: Buffer;
}