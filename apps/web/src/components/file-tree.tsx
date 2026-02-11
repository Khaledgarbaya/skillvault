import { useState } from "react";
import { ChevronRight, File, Folder } from "lucide-react";
import { formatBytes } from "~/lib/format";

interface FileTreeProps {
  files: { path: string; size: number }[];
}

interface TreeNode {
  name: string;
  fullPath: string;
  size?: number;
  children: Map<string, TreeNode>;
}

function buildTree(files: { path: string; size: number }[]): TreeNode {
  const root: TreeNode = { name: "", fullPath: "", children: new Map() };

  for (const file of files) {
    const segments = file.path.split("/");
    let current = root;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (!current.children.has(seg)) {
        current.children.set(seg, {
          name: seg,
          fullPath: segments.slice(0, i + 1).join("/"),
          children: new Map(),
        });
      }
      current = current.children.get(seg)!;
    }

    current.size = file.size;
  }

  return root;
}

function TreeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const isDir = node.children.size > 0 && node.size === undefined;
  const isSkillMd = node.name === "SKILL.md";

  const children = Array.from(node.children.values()).sort((a, b) => {
    // Directories first, then alphabetical
    const aIsDir = a.children.size > 0 && a.size === undefined;
    const bIsDir = b.children.size > 0 && b.size === undefined;
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <button
        type="button"
        onClick={() => isDir && setExpanded(!expanded)}
        className={`flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left font-mono text-xs transition-colors hover:bg-muted/20 ${
          isDir ? "cursor-pointer" : "cursor-default"
        }`}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {isDir ? (
          <ChevronRight
            className={`size-3 shrink-0 text-muted-foreground/50 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          />
        ) : (
          <span className="inline-block w-3" />
        )}
        {isDir ? (
          <Folder className="size-3.5 shrink-0 text-muted-foreground/70" />
        ) : (
          <File
            className={`size-3.5 shrink-0 ${
              isSkillMd ? "text-primary" : "text-muted-foreground/50"
            }`}
          />
        )}
        <span
          className={`truncate ${
            isSkillMd ? "text-primary font-medium" : "text-foreground/80"
          }`}
        >
          {node.name}
        </span>
        {node.size !== undefined && (
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/50">
            {formatBytes(node.size)}
          </span>
        )}
      </button>
      {isDir && expanded && (
        <div>
          {children.map((child) => (
            <TreeItem key={child.fullPath} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ files }: FileTreeProps) {
  const tree = buildTree(files);
  const children = Array.from(tree.children.values()).sort((a, b) => {
    const aIsDir = a.children.size > 0 && a.size === undefined;
    const bIsDir = b.children.size > 0 && b.size === undefined;
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="rounded-xl border border-border/50 bg-muted/10 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Package contents
        </span>
        <span className="text-[10px] text-muted-foreground/50">
          {files.length} files &middot; {formatBytes(totalSize)}
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {children.map((child) => (
          <TreeItem key={child.fullPath} node={child} depth={0} />
        ))}
      </div>
    </div>
  );
}
