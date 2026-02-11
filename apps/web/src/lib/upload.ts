import { unzipSync, gzipSync } from "fflate";
import {
  MAX_DECOMPRESSED_SIZE,
  MAX_FILE_COUNT,
  MAX_PATH_LENGTH,
} from "@skvault/shared";

/**
 * Detect format by magic bytes and normalize to tar.gz.
 * Gzip (tar.gz) is returned as-is; ZIP is extracted, repacked as tar.gz.
 */
export async function normalizeUpload(
  buffer: ArrayBuffer,
  filename: string,
): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(buffer);

  if (bytes.length < 4) {
    throw new UploadError("File is too small to be a valid archive");
  }

  // Gzip: 0x1f 0x8b
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    return buffer;
  }

  // ZIP: PK\x03\x04
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return zipToTarGz(bytes);
  }

  throw new UploadError(
    "Unsupported file format. Upload .tar.gz or .zip",
  );
}

export function isGzip(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

// ─── ZIP → tar.gz conversion ────────────────────────────────────────

function zipToTarGz(zipBytes: Uint8Array): ArrayBuffer {
  const extracted = unzipSync(zipBytes);
  const entries = Object.entries(extracted);

  // Validate total decompressed size and file count
  let totalSize = 0;
  let fileCount = 0;
  for (const [path, data] of entries) {
    // Skip directories (entries ending with /)
    if (path.endsWith("/")) continue;
    fileCount++;
    totalSize += data.length;

    if (fileCount > MAX_FILE_COUNT) {
      throw new UploadError(`Archive exceeds maximum of ${MAX_FILE_COUNT} files`);
    }
    if (totalSize > MAX_DECOMPRESSED_SIZE) {
      throw new UploadError(
        `Decompressed size exceeds maximum of ${MAX_DECOMPRESSED_SIZE / (1024 * 1024)}MB`,
      );
    }
  }

  // Strip common root directory prefix
  // e.g. "my-skill/SKILL.md" → "SKILL.md"
  const filePaths = entries
    .filter(([p]) => !p.endsWith("/"))
    .map(([p]) => p);
  const prefix = findCommonPrefix(filePaths);

  const files: { path: string; content: Uint8Array }[] = [];
  for (const [rawPath, data] of entries) {
    if (rawPath.endsWith("/")) continue;

    let path = prefix ? rawPath.slice(prefix.length) : rawPath;
    // Normalize: strip leading "./" or "/"
    path = path.replace(/^\.\//, "").replace(/^\//, "");

    if (!path) continue;

    // Validate path
    if (path.includes("..")) {
      throw new UploadError("Path traversal detected");
    }
    if (path.includes("\0")) {
      throw new UploadError("Invalid filename: contains null bytes");
    }
    if (path.length > MAX_PATH_LENGTH) {
      throw new UploadError(`Path exceeds maximum length of ${MAX_PATH_LENGTH} characters`);
    }

    files.push({ path, content: data });
  }

  const tarBytes = packTar(files);
  const gzipped = gzipSync(tarBytes);
  return gzipped.buffer;
}

/**
 * Find common directory prefix shared by all paths.
 * Returns prefix with trailing slash, or empty string if none.
 */
function findCommonPrefix(paths: string[]): string {
  if (paths.length === 0) return "";

  // Check if all paths share a common first directory segment
  const firstSegments = paths.map((p) => {
    const idx = p.indexOf("/");
    return idx === -1 ? null : p.slice(0, idx + 1);
  });

  const first = firstSegments[0];
  if (!first) return "";

  for (const seg of firstSegments) {
    if (seg !== first) return "";
  }

  return first;
}

// ─── Tar packing ────────────────────────────────────────────────────

/**
 * Pack files into a tar byte stream compatible with parseTarball() reader.
 * POSIX ustar format with 512-byte headers.
 */
function packTar(files: { path: string; content: Uint8Array }[]): Uint8Array {
  const blocks: Uint8Array[] = [];

  for (const file of files) {
    const header = new Uint8Array(512);
    const encoder = new TextEncoder();

    // Name (0-100)
    const nameBytes = encoder.encode(file.path);
    header.set(nameBytes.subarray(0, 100), 0);

    // Mode (100-108): 0000644\0
    writeString(header, 100, "0000644\0");

    // UID (108-116): 0000000\0
    writeString(header, 108, "0000000\0");

    // GID (116-124): 0000000\0
    writeString(header, 116, "0000000\0");

    // Size (124-136): zero-padded octal, 11 chars + NUL
    const sizeOctal = file.content.length.toString(8).padStart(11, "0");
    writeString(header, 124, sizeOctal + "\0");

    // Mtime (136-148): current time in octal
    const mtime = Math.floor(Date.now() / 1000).toString(8).padStart(11, "0");
    writeString(header, 136, mtime + "\0");

    // Checksum placeholder (148-156): 8 spaces (for calculation)
    for (let i = 148; i < 156; i++) header[i] = 0x20;

    // Typeflag (156): '0' = regular file
    header[156] = 0x30;

    // Magic (257-263): "ustar\0"
    writeString(header, 257, "ustar\0");

    // Version (263-265): "00"
    writeString(header, 263, "00");

    // Calculate checksum: sum all header bytes (checksum field treated as spaces)
    let checksum = 0;
    for (let i = 0; i < 512; i++) {
      checksum += header[i];
    }
    const checksumStr = checksum.toString(8).padStart(6, "0") + "\0 ";
    writeString(header, 148, checksumStr);

    blocks.push(header);

    // File data, padded to 512-byte boundary
    const dataBlock = new Uint8Array(Math.ceil(file.content.length / 512) * 512);
    dataBlock.set(file.content);
    blocks.push(dataBlock);
  }

  // Two 512-byte zero blocks at end
  blocks.push(new Uint8Array(1024));

  // Concatenate all blocks
  let totalLen = 0;
  for (const b of blocks) totalLen += b.length;
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const b of blocks) {
    result.set(b, pos);
    pos += b.length;
  }

  return result;
}

function writeString(buf: Uint8Array, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    buf[offset + i] = str.charCodeAt(i);
  }
}
