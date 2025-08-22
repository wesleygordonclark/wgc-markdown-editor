// src/core/export.ts

/**
 * Nova Export Engine
 * -------------------
 * Converts markdown posts into external formats using Pandoc.
 * Supports exporting individual posts or the entire collection.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import matter from "gray-matter";
import { BuildContext } from "./schema";
import { walk } from "./utils";

/**
 * Exports markdown posts to a given format (e.g. pdf, docx, html).
 * Requires Pandoc to be installed and available in PATH.
 *
 * @param ctx - Build context with root and dist paths
 * @param target - "all" or a specific slug
 * @param format - output format (e.g. "pdf", "html")
 */
export function exportPosts(ctx: BuildContext, target: string, format: string) {
  const postsDir = path.join(ctx.root, "content/posts");
  const outDir = path.join(ctx.dist, "exports");
  fs.mkdirSync(outDir, { recursive: true });

  // Determine which files to export
  const files = target === "all"
    ? walk(postsDir).filter(f => f.endsWith(".md"))
    : [path.join(postsDir, `${target}.md`)];

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`Post not found: ${file}`);
      continue;
    }

    const outFile = path.join(outDir, `${path.basename(file, ".md")}.${format}`);
    console.log(`Exporting ${file} → ${outFile}`);

    try {
      execSync(`pandoc "${file}" -o "${outFile}"`, { stdio: "inherit" });
    } catch (e) {
      console.error("Pandoc export failed. Ensure pandoc is installed and in PATH.");
    }
  }
}

