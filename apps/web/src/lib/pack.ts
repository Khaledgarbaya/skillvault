import { unzipSync, gzipSync } from "fflate";
import { parseTarball } from "./tarball";

export type FileEntry = { path: string; size: number };
export type UploadFormat = "tar.gz" | "zip" | "unknown";

/**
 * Detect archive format by reading first 4 bytes of a File.
 */
export async function detectFormat(file: File): Promise<UploadFormat> {
  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (header[0] === 0x1f && header[1] === 0x8b) return "tar.gz";
  if (header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04) {
    return "zip";
  }
  return "unknown";
}

/**
 * Read file entries from an archive for preview.
 * Returns flat list of paths + sizes.
 */
export async function readFileEntries(file: File): Promise<FileEntry[]> {
  const format = await detectFormat(file);
  const buffer = await file.arrayBuffer();

  if (format === "tar.gz") {
    const contents = await parseTarball(buffer);
    return contents.files.map((f) => ({ path: f.name, size: f.size }));
  }

  if (format === "zip") {
    const extracted = unzipSync(new Uint8Array(buffer));
    const entries: FileEntry[] = [];
    // Find common prefix to strip
    const paths = Object.keys(extracted).filter((p) => !p.endsWith("/"));
    const prefix = findCommonPrefix(paths);

    for (const [rawPath, data] of Object.entries(extracted)) {
      if (rawPath.endsWith("/")) continue;
      let path = prefix ? rawPath.slice(prefix.length) : rawPath;
      path = path.replace(/^\.\//, "").replace(/^\//, "");
      if (!path) continue;
      entries.push({ path, size: data.length });
    }
    return entries;
  }

  throw new Error("Unsupported file format");
}

/**
 * Recursively read directory entries from a DataTransferItemList (drag & drop).
 */
export async function readDirectoryEntries(
  items: DataTransferItemList,
): Promise<{ path: string; content: Uint8Array }[]> {
  const files: { path: string; content: Uint8Array }[] = [];

  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry?.();
    if (entry) {
      await traverseEntry(entry, "", files);
    }
  }

  return files;
}

async function traverseEntry(
  entry: FileSystemEntry,
  basePath: string,
  files: { path: string; content: Uint8Array }[],
): Promise<void> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    const file = await new Promise<File>((resolve, reject) => {
      fileEntry.file(resolve, reject);
    });
    const buffer = await file.arrayBuffer();
    const path = basePath ? `${basePath}/${entry.name}` : entry.name;
    files.push({ path, content: new Uint8Array(buffer) });
  } else if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    const dirPath = basePath ? `${basePath}/${entry.name}` : entry.name;
    for (const child of entries) {
      await traverseEntry(child, dirPath, files);
    }
  }
}

/**
 * Pack files into tar.gz format on the client (for directory uploads).
 * Returns a Blob suitable for upload.
 */
export function packTarGz(
  files: { path: string; content: Uint8Array }[],
): Blob {
  const blocks: Uint8Array[] = [];

  for (const file of files) {
    const header = new Uint8Array(512);
    const nameBytes = new TextEncoder().encode(file.path);
    header.set(nameBytes.subarray(0, 100), 0);

    writeStr(header, 100, "0000644\0");
    writeStr(header, 108, "0000000\0");
    writeStr(header, 116, "0000000\0");

    const sizeOctal = file.content.length.toString(8).padStart(11, "0");
    writeStr(header, 124, sizeOctal + "\0");

    const mtime = Math.floor(Date.now() / 1000).toString(8).padStart(11, "0");
    writeStr(header, 136, mtime + "\0");

    // Checksum placeholder
    for (let i = 148; i < 156; i++) header[i] = 0x20;
    header[156] = 0x30; // typeflag: regular file
    writeStr(header, 257, "ustar\0");
    writeStr(header, 263, "00");

    // Calculate checksum
    let checksum = 0;
    for (let i = 0; i < 512; i++) checksum += header[i];
    writeStr(header, 148, checksum.toString(8).padStart(6, "0") + "\0 ");

    blocks.push(header);

    const dataBlock = new Uint8Array(Math.ceil(file.content.length / 512) * 512);
    dataBlock.set(file.content);
    blocks.push(dataBlock);
  }

  // End-of-archive marker
  blocks.push(new Uint8Array(1024));

  let totalLen = 0;
  for (const b of blocks) totalLen += b.length;
  const tar = new Uint8Array(totalLen);
  let pos = 0;
  for (const b of blocks) {
    tar.set(b, pos);
    pos += b.length;
  }

  const gzipped = gzipSync(tar);
  return new Blob([gzipped], { type: "application/gzip" });
}

function findCommonPrefix(paths: string[]): string {
  if (paths.length === 0) return "";
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

function writeStr(buf: Uint8Array, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    buf[offset + i] = str.charCodeAt(i);
  }
}
