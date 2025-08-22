// src/core/build.ts

/**
 * Nova Build Engine
 * ------------------
 * Compiles markdown content into static HTML using Mustache templates.
 * Handles both individual post rendering and index page generation.
 */

import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { z } from "zod";
import chokidar from "chokidar";
import { BuildContext, Doc } from "./schema";
import {
  renderMarkdown,
  renderTemplate,
  writeFile,
  copyDir,
  slugify,
  walk
} from "./utils";

type Graph = {
  edges: Map<string, Set<string>>;
  docs: Map<string, Doc>;
};

function createGraph(): Graph {
  return { edges: new Map(), docs: new Map() };
}

function addEdge(g: Graph, src: string, out: string) {
  if (!g.edges.has(src)) g.edges.set(src, new Set());
  g.edges.get(src)!.add(out);
}

/**
 * Strips HTML tags from rendered markdown for plain-text indexing.
 */
function stripHtml(html: string): string {
  const dom = new JSDOM(html);
  return dom.window.document.body.textContent || "";
}

/**
 * Loads all .html files from the templates directory as Mustache partials.
 */
function loadPartials(ctx: BuildContext): Record<string, string> {
  const partials: Record<string, string> = {};
  const tplDir = path.join(ctx.root, "templates");
  if (!fs.existsSync(tplDir)) return partials;
  for (const f of fs.readdirSync(tplDir)) {
    if (f.endsWith(".html")) {
      const key = f.replace(/\.html$/, "");
      partials[key] = fs.readFileSync(path.join(tplDir, f), "utf-8");
    }
  }
  return partials;
}

/**
 * Copies static assets (css/js) from templates to dist.
 */
function copyStaticAssets(ctx: BuildContext) {
  const assetsDirs = ["css", "js"];
  const srcAssets = path.join(ctx.root, "templates");
  const destBase = path.join(ctx.dist);

  for (const dir of assetsDirs) {
    const srcDir = path.join(srcAssets, dir);
    const destDir = path.join(destBase, dir);

    if (!fs.existsSync(srcDir)) continue;

    fs.mkdirSync(destDir, { recursive: true });
    for (const file of fs.readdirSync(srcDir)) {
      const srcFile = path.join(srcDir, file);
      const destFile = path.join(destDir, file);
      fs.copyFileSync(srcFile, destFile);
    }
  }
}


/**
 * Watches content/templates/config for changes and rebuilds on-the-fly.
 */
export function watchAndBuild(ctx: BuildContext) {
  let graph = fullBuild(ctx);
  const watcher = chokidar.watch([
    path.join(ctx.root, "content"),
    path.join(ctx.root, "templates"),
    path.join(ctx.root, "public"),
    path.join(ctx.root, "site.config.ts")
  ], { ignoreInitial: true });

  watcher.on("all", (_event, _p) => {
    graph = fullBuild(ctx);
  });

  return watcher;
}

/**
 * Full site build: renders all posts and index pages.
 */
export function fullBuild(ctx: BuildContext): Graph {
  const graph = createGraph();
  fs.rmSync(ctx.dist, { recursive: true, force: true });
  fs.mkdirSync(ctx.dist, { recursive: true });

  copyDir(ctx.publicDir, ctx.dist);
  copyStaticAssets(ctx);

  const partials = loadPartials(ctx);
  const itemsByCollection: Record<string, Doc[]> = {};

  // 🔄 Render all posts
  for (const [name, col] of Object.entries(ctx.config.collections)) {
    const folder = path.join(ctx.root, col.folder);
    const files = walk(folder).filter(f => f.endsWith(".md"));
    const colItems: Doc[] = [];

    for (const file of files) {
      const raw = fs.readFileSync(file, "utf-8");
      const gm = matter(raw);
      const schema = z.object(col.schema as any);
      const parsed = schema.safeParse({ ...gm.data, body: gm.content.trim() });

      if (!parsed.success) {
        console.error("Schema error in", file);
        for (const issue of parsed.error.issues) {
          console.error("  -", issue.path.join("."), issue.message);
        }
        continue;
      }

      const slug = slugify(path.basename(file).replace(/\.md$/, ""));
      const doc: Doc = { ...parsed.data, _slug: slug, _path: file };

      doc.body_html = renderMarkdown(doc.body || "");
      doc.body_text = stripHtml(doc.body_html);

      const url = col.url(doc);
      doc.url = url.replace(/index\.html$/, "");

      const layoutPath = path.join(ctx.root, col.layout);
      const layout = fs.readFileSync(layoutPath, "utf-8");

      const postTpl = partials["post"];
      const postHtml = renderTemplate(postTpl, { ...doc, site: ctx.config }, partials);

      const html = renderTemplate(layout, {
        ...doc,
        site: ctx.config,
        content: postHtml
      }, partials);

      const outPath = path.join(ctx.dist, url);
      writeFile(outPath, html);
      addEdge(graph, file, outPath);
      addEdge(graph, layoutPath, outPath);
      colItems.push(doc);
      graph.docs.set(file, doc);
    }

    itemsByCollection[name] = colItems.sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || ""))
    );
  }

  // 📄 Render index pages
  for (const idx of (ctx.config.indexes || [])) {
    const items = idx.sources.flatMap(s => itemsByCollection[s] || []);
    const layout = fs.readFileSync(path.join(ctx.root, idx.layout), "utf-8");
    const partials2 = loadPartials(ctx);

    const partialName = idx.partial || "index";
    const indexTpl = partials2[partialName];
    const indexHtml = renderTemplate(indexTpl, { items, site: ctx.config }, partials2);

    const html = renderTemplate(layout, {
      site: ctx.config,
      content: indexHtml
    }, partials2);

    const outPath = path.join(ctx.dist, idx.path.replace(/^\//, ""));
    writeFile(outPath, html);
    addEdge(graph, path.join(ctx.root, idx.layout), outPath);
    for (const docs of Object.values(itemsByCollection)) {
      for (const d of docs) addEdge(graph, d._path, outPath);
    }
  }

  return graph;
}

