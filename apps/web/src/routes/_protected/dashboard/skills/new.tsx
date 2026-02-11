import { useState, useCallback, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { validateVersion } from "@skvault/shared";
import { Upload, Check, FolderOpen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { ScanReport } from "~/components/scan-report";
import { FileTree } from "~/components/file-tree";
import {
  validateSkillNameAction,
  publishSkillAction,
  publishVersionAction,
} from "~/lib/dashboard-fns";
import { formatBytes } from "~/lib/format";
import {
  detectFormat,
  readFileEntries,
  readDirectoryEntries,
  packTarGz,
} from "~/lib/pack";
import type { FileEntry } from "~/lib/pack";

export const Route = createFileRoute("/_protected/dashboard/skills/new")({
  component: PublishSkill,
});

const STEPS = ["Details", "Upload", "Review"] as const;

function PublishSkill() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    versionId: string;
    scanStatus: string;
  } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [version, setVersion] = useState("1.0.0");

  // Upload state
  const [file, setFile] = useState<File | Blob | null>(null);
  const [filename, setFilename] = useState("");
  const [fileEntries, setFileEntries] = useState<FileEntry[] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");

  // Validation state
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameValid, setNameValid] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const validateName = useCallback((value: string) => {
    setName(value);
    setNameValid(false);
    setNameError(null);

    if (!value) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const result = await validateSkillNameAction({ data: { name: value } });
      if (result.valid) {
        setNameValid(true);
        setNameError(null);
      } else {
        setNameValid(false);
        setNameError(result.error);
      }
    }, 400);
  }, []);

  const validateVer = useCallback((value: string) => {
    setVersion(value);
    if (!value) {
      setVersionError(null);
      return;
    }
    if (!validateVersion(value)) {
      setVersionError("Must be valid semver (e.g. 1.0.0)");
    } else {
      setVersionError(null);
    }
  }, []);

  const resetUpload = useCallback(() => {
    setFile(null);
    setFilename("");
    setFileEntries(null);
    setValidationError(null);
    setSourceLabel("");
  }, []);

  const processArchiveFile = useCallback(async (f: File) => {
    setProcessing(true);
    resetUpload();
    try {
      const format = await detectFormat(f);
      if (format === "unknown") {
        toast.error("Unsupported format. Upload .tar.gz or .zip");
        return;
      }

      const entries = await readFileEntries(f);
      const hasSkillMd = entries.some(
        (e) => e.path === "SKILL.md" || e.path.match(/^[^/]+\/SKILL\.md$/),
      );

      setFile(f);
      setFilename(f.name);
      setFileEntries(entries);
      setSourceLabel(format === "tar.gz" ? "tar.gz" : "zip");
      setValidationError(hasSkillMd ? null : "Warning: No SKILL.md found at root level");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read archive");
      resetUpload();
    } finally {
      setProcessing(false);
    }
  }, [resetUpload]);

  const processDirectory = useCallback(
    async (items: DataTransferItemList) => {
      setProcessing(true);
      resetUpload();
      try {
        const dirFiles = await readDirectoryEntries(items);
        if (dirFiles.length === 0) {
          toast.error("Empty directory");
          return;
        }

        const entries: FileEntry[] = dirFiles.map((f) => ({
          path: f.path,
          size: f.content.length,
        }));
        const hasSkillMd = entries.some(
          (e) => e.path === "SKILL.md" || e.path.match(/^[^/]+\/SKILL\.md$/),
        );

        // Pack to tar.gz on client
        const blob = packTarGz(dirFiles);

        setFile(blob);
        setFilename("directory.tar.gz");
        setFileEntries(entries);
        setSourceLabel("directory");
        setValidationError(hasSkillMd ? null : "Warning: No SKILL.md found at root level");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to read directory");
        resetUpload();
      } finally {
        setProcessing(false);
      }
    },
    [resetUpload],
  );

  const handleFileDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const items = e.dataTransfer.items;

      // Check if first item is a directory
      if (items.length > 0) {
        const firstEntry = items[0].webkitGetAsEntry?.();
        if (firstEntry?.isDirectory) {
          await processDirectory(items);
          return;
        }
      }

      // Otherwise treat as file
      const f = e.dataTransfer.files[0];
      if (f) {
        await processArchiveFile(f);
      }
    },
    [processArchiveFile, processDirectory],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) await processArchiveFile(f);
    },
    [processArchiveFile],
  );

  const handleDirSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setProcessing(true);
      resetUpload();
      try {
        const dirFiles: { path: string; content: Uint8Array }[] = [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const buffer = await f.arrayBuffer();
          // webkitRelativePath gives "dirname/path/to/file"
          // Strip the root dir name
          const fullPath = f.webkitRelativePath;
          const slashIdx = fullPath.indexOf("/");
          const path = slashIdx === -1 ? fullPath : fullPath.slice(slashIdx + 1);
          if (!path) continue;
          dirFiles.push({ path, content: new Uint8Array(buffer) });
        }

        if (dirFiles.length === 0) {
          toast.error("Empty directory");
          return;
        }

        const entries: FileEntry[] = dirFiles.map((f) => ({
          path: f.path,
          size: f.content.length,
        }));
        const hasSkillMd = entries.some(
          (e) => e.path === "SKILL.md" || e.path.match(/^[^/]+\/SKILL\.md$/),
        );

        const blob = packTarGz(dirFiles);

        setFile(blob);
        setFilename("directory.tar.gz");
        setFileEntries(entries);
        setSourceLabel("directory");
        setValidationError(hasSkillMd ? null : "Warning: No SKILL.md found at root level");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to read directory");
        resetUpload();
      } finally {
        setProcessing(false);
      }
    },
    [resetUpload],
  );

  async function handlePublish() {
    if (!name || !nameValid || !file || !version || versionError) return;

    setPublishing(true);
    try {
      const { skillId } = await publishSkillAction({
        data: {
          name,
          description,
          visibility: isPublic ? "public" : "private",
        },
      });

      const buffer = await (file instanceof Blob
        ? file.arrayBuffer()
        : file.arrayBuffer());
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const result = await publishVersionAction({
        data: {
          skillId,
          version,
          tarball: base64,
          filename,
        },
      });

      setPublishResult({
        versionId: result.versionId,
        scanStatus: result.scanStatus,
      });
      toast.success("Skill published successfully!");
      setStep(2);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to publish skill",
      );
    } finally {
      setPublishing(false);
    }
  }

  const canAdvance =
    step === 0
      ? nameValid && name.length > 0
      : step === 1
        ? file !== null && !validationError?.startsWith("Error") && version.length > 0 && !versionError
        : false;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-primary">
          Publish
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Publish New Skill</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Create and publish a skill to the registry.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex size-7 items-center justify-center rounded-full font-mono text-xs font-medium transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted/50 text-muted-foreground/50"
              }`}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </div>
            <span
              className={`text-[13px] ${
                i === step ? "text-foreground" : "text-muted-foreground/50"
              }`}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`mx-2 h-px w-8 ${i < step ? "bg-primary/30" : "bg-border/50"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Details */}
      {step === 0 && (
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <h2 className="mb-4 text-[13px] font-medium">Skill Details</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[13px]">Skill Name</Label>
              <Input
                id="name"
                placeholder="my-awesome-skill"
                value={name}
                onChange={(e) => validateName(e.target.value)}
                className={`font-mono ${
                  nameError
                    ? "border-destructive"
                    : nameValid
                      ? "border-primary/50"
                      : ""
                }`}
              />
              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
              {nameValid && (
                <p className="text-xs text-primary">Name is available</p>
              )}
              <p className="text-xs text-muted-foreground/70">
                Lowercase letters, numbers, and hyphens only. 3-50 characters.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[13px]">Description</Label>
              <Textarea
                id="description"
                placeholder="What does this skill do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="visibility"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <Label htmlFor="visibility" className="cursor-pointer text-[13px]">
                {isPublic ? "Public" : "Private"}
              </Label>
              <span className="text-xs text-muted-foreground/70">
                {isPublic
                  ? "Visible on explore page"
                  : "Only accessible with API token"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Upload */}
      {step === 1 && (
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <h2 className="mb-4 text-[13px] font-medium">Upload Package</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="version" className="text-[13px]">Version</Label>
              <Input
                id="version"
                placeholder="1.0.0"
                value={version}
                onChange={(e) => validateVer(e.target.value)}
                className={`font-mono ${versionError ? "border-destructive" : ""}`}
              />
              {versionError && (
                <p className="text-xs text-destructive">{versionError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[13px]">Package</Label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 ${
                  file
                    ? "border-primary/30 bg-primary/[0.02]"
                    : "border-border/50 bg-muted/10 hover:border-primary/30 hover:bg-primary/[0.02]"
                }`}
                onClick={() =>
                  document.getElementById("file-input")?.click()
                }
              >
                {processing ? (
                  <>
                    <div className="flex size-10 items-center justify-center rounded-full border border-border/50 bg-muted/30">
                      <span className="inline-block size-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      Processing...
                    </p>
                  </>
                ) : file ? (
                  <>
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                      <Check className="size-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {filename}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {sourceLabel}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetUpload();
                      }}
                      className="text-xs text-muted-foreground/50 underline hover:text-foreground"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex size-10 items-center justify-center rounded-full border border-border/50 bg-muted/30">
                      <Upload className="size-4 text-muted-foreground/50" />
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      Drop .tar.gz, .zip, or a folder here
                    </p>
                    <p className="text-xs text-muted-foreground/50">
                      Max 5MB compressed
                    </p>
                  </>
                )}
              </div>
              <input
                id="file-input"
                type="file"
                accept=".tar.gz,.tgz,.zip"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                id="dir-input"
                type="file"
                {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                onChange={handleDirSelect}
                className="hidden"
              />

              {/* Action buttons */}
              {!file && !processing && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById("file-input")?.click();
                    }}
                  >
                    <Upload className="size-3.5" />
                    Browse Files
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById("dir-input")?.click();
                    }}
                  >
                    <FolderOpen className="size-3.5" />
                    Browse Folder
                  </Button>
                </div>
              )}

              {/* Validation warning */}
              {validationError && (
                <p className="text-xs text-yellow-500">{validationError}</p>
              )}
            </div>

            {/* File tree preview */}
            {fileEntries && fileEntries.length > 0 && (
              <FileTree files={fileEntries} />
            )}
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 2 && (
        <div className="space-y-4">
          {publishResult ? (
            <>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-full bg-primary/20">
                    <Check className="size-3.5 text-primary" />
                  </div>
                  <span className="text-[13px] font-medium">
                    Published successfully
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Your skill <span className="font-mono text-primary">{name}@{version}</span> is now live.
                </p>
              </div>
              <Button onClick={() => navigate({ to: "/dashboard/skills/$name", params: { name } })}>
                View Skill Settings
              </Button>
            </>
          ) : (
            <div className="rounded-xl border border-border/50 bg-card/50 p-5">
              <h2 className="mb-4 text-[13px] font-medium">Review & Publish</h2>
              <div className="space-y-2.5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-mono">{name}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-mono">{version}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Visibility</span>
                  <Badge
                    variant="outline"
                    className={`h-5 text-[10px] ${isPublic ? "border-primary/30 text-primary" : ""}`}
                  >
                    {isPublic ? "public" : "private"}
                  </Badge>
                </div>
                {file && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">Package</span>
                    <span className="font-mono text-xs">
                      {filename} ({formatBytes(file.size)})
                    </span>
                  </div>
                )}
                {description && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">Description</span>
                    <span className="max-w-[60%] truncate text-right">
                      {description}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      {!publishResult && (
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={publishing}
            >
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance}
            >
              Continue
            </Button>
          ) : (
            <Button onClick={handlePublish} disabled={publishing}>
              {publishing ? (
                <>
                  <span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Publishing...
                </>
              ) : (
                "Publish"
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
