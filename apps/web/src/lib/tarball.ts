export interface TarEntry {
  name: string;
  size: number;
}

export interface TextFile {
  path: string;
  content: string;
}

export interface TarballContents {
  files: TarEntry[];
  fileCount: number;
  totalSizeBytes: number;
  skillMdContent: string | null;
  skillMdPath: string | null;
  /** Text files extracted for scanning (.md, .ts, .js, .py, .sh, etc.) */
  textFiles: TextFile[];
}

/**
 * Decompress a .tar.gz ArrayBuffer using DecompressionStream (Web API),
 * then parse tar headers to extract file metadata and SKILL.md content.
 *
 * Tar format: 512-byte header blocks, followed by ceil(size/512)*512 bytes of data.
 * Header offsets: name 0-100, size 124-136 (octal ASCII), typeflag 156.
 */
export async function parseTarball(gzipped: ArrayBuffer): Promise<TarballContents> {
  const decompressed = await decompress(gzipped);
  const bytes = new Uint8Array(decompressed);

  const files: TarEntry[] = [];
  const textFiles: TextFile[] = [];
  let totalSizeBytes = 0;
  let skillMdContent: string | null = null;
  let skillMdPath: string | null = null;
  const decoder = new TextDecoder();

  let offset = 0;
  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);

    // Two consecutive zero blocks = end of archive
    if (isZeroBlock(header)) break;

    const name = readString(header, 0, 100);
    const sizeStr = readString(header, 124, 12);
    const typeflag = header[156];

    // Parse octal size
    const size = parseInt(sizeStr, 8) || 0;

    // Handle POSIX ustar prefix (offset 345, 155 bytes)
    let fullName = name;
    const prefix = readString(header, 345, 155);
    if (prefix) {
      fullName = prefix + "/" + name;
    }

    // Normalize: strip leading "./" or "/"
    fullName = fullName.replace(/^\.\//, "").replace(/^\//, "");

    offset += 512; // move past header

    // typeflag: '0' or '\0' = regular file, '5' = directory
    const isFile = typeflag === 0x30 || typeflag === 0;

    if (isFile && size > 0 && fullName) {
      files.push({ name: fullName, size });
      totalSizeBytes += size;

      // Extract text content for scannable files
      if (isTextFile(fullName)) {
        const content = decoder.decode(bytes.subarray(offset, offset + size));
        textFiles.push({ path: fullName, content });

        // Check for SKILL.md at root or one directory deep
        if (isSkillMd(fullName) && skillMdContent === null) {
          skillMdContent = content;
          skillMdPath = fullName;
        }
      }
    }

    // Advance past file data (padded to 512-byte boundary)
    offset += Math.ceil(size / 512) * 512;
  }

  return {
    files,
    fileCount: files.length,
    totalSizeBytes,
    skillMdContent,
    skillMdPath,
    textFiles,
  };
}

const TEXT_EXTENSIONS = new Set([
  ".md", ".txt", ".ts", ".js", ".py", ".sh", ".bash", ".zsh",
  ".yml", ".yaml", ".json", ".toml", ".cfg", ".ini", ".env",
  ".jsx", ".tsx", ".mjs", ".cjs", ".rb", ".go", ".rs",
]);

function isTextFile(path: string): boolean {
  const dot = path.lastIndexOf(".");
  if (dot === -1) return false;
  return TEXT_EXTENSIONS.has(path.slice(dot).toLowerCase());
}

function isSkillMd(path: string): boolean {
  // Root: "SKILL.md" or one level deep: "something/SKILL.md"
  const segments = path.split("/");
  const filename = segments[segments.length - 1];
  return filename === "SKILL.md" && segments.length <= 2;
}

async function decompress(gzipped: ArrayBuffer): Promise<ArrayBuffer> {
  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();

  // Write and close in background
  const writePromise = writer.write(new Uint8Array(gzipped)).then(() => writer.close());

  // Read all chunks
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }

  await writePromise;

  // Concatenate
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result.buffer;
}

function readString(buf: Uint8Array, offset: number, length: number): string {
  let end = offset;
  const limit = offset + length;
  while (end < limit && buf[end] !== 0) end++;
  const decoder = new TextDecoder();
  return decoder.decode(buf.subarray(offset, end)).trim();
}

function isZeroBlock(block: Uint8Array): boolean {
  for (let i = 0; i < block.length; i++) {
    if (block[i] !== 0) return false;
  }
  return true;
}
