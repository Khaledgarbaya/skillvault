import { createFileRoute } from "@tanstack/react-router";
import { drizzle } from "drizzle-orm/d1";
import { validateVersion } from "@skvault/shared";
import { jsonError } from "~/lib/api/response";
import { getSkillByOwnerAndName, getVersion } from "~/lib/db/queries";
import {
  loggingMiddleware,
  cloudflareMiddleware,
  optionalScopeFromRequest,
} from "~/lib/middleware";
import type { LoggedContext } from "~/lib/middleware";

function computeUnifiedDiff(a: string, b: string, labelA: string, labelB: string): string {
  const linesA = a.split("\n");
  const linesB = b.split("\n");
  const m = linesA.length;
  const n = linesB.length;

  // LCS via DP
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = linesA[i - 1] === linesB[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack to get diff ops
  const ops: Array<{ type: "keep" | "remove" | "add"; line: string }> = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      ops.push({ type: "keep", line: linesA[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: "add", line: linesB[j - 1] });
      j--;
    } else {
      ops.push({ type: "remove", line: linesA[i - 1] });
      i--;
    }
  }
  ops.reverse();

  const output = [`--- ${labelA}`, `+++ ${labelB}`];
  for (const op of ops) {
    switch (op.type) {
      case "keep":
        output.push(` ${op.line}`);
        break;
      case "remove":
        output.push(`-${op.line}`);
        break;
      case "add":
        output.push(`+${op.line}`);
        break;
    }
  }

  return output.join("\n");
}

export const Route = createFileRoute("/api/v1/skills/$owner/$name/diff/$v1/$v2")({
  server: {
    middleware: [loggingMiddleware, cloudflareMiddleware],
    handlers: {
      GET: async ({
        request,
        params,
        context,
      }: {
        request: Request;
        params: { owner: string; name: string; v1: string; v2: string };
        context: LoggedContext;
      }) => {
        const db = drizzle(context.cloudflare.env.DB);
        const authResult = await optionalScopeFromRequest(request, "read");

        for (const v of [params.v1, params.v2]) {
          const check = validateVersion(v);
          if (!check.valid) {
            return jsonError(check.error!, 400, `Invalid version: ${v}`);
          }
        }

        const result = await getSkillByOwnerAndName(db, params.owner, params.name);
        if (!result) {
          return jsonError("Skill not found", 404);
        }

        const { skill } = result;

        if (skill.visibility === "private") {
          if (!authResult || authResult.userId !== skill.ownerId) {
            return jsonError("Skill not found", 404);
          }
        }

        const [version1, version2] = await Promise.all([
          getVersion(db, skill.id, params.v1),
          getVersion(db, skill.id, params.v2),
        ]);

        if (!version1) {
          return jsonError(`Version ${params.v1} not found`, 404);
        }
        if (!version2) {
          return jsonError(`Version ${params.v2} not found`, 404);
        }

        const contentA = version1.skillMdContent ?? "";
        const contentB = version2.skillMdContent ?? "";
        const diff = computeUnifiedDiff(contentA, contentB, params.v1, params.v2);

        return new Response(diff, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});
