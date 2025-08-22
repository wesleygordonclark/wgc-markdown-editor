// src/core/editor.ts

/**
 * Nova Markdown Editor Engine
 * ----------------------------
 * Provides CRUD operations for markdown posts.
 * Used by the CLI, admin UI, and API routes.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { slugify, writeFile } from "./utils";
import { BuildContext, Collection } from "./schema";

/**
 * Applies default values from collection config.
 */
function applyDefaults(col: Collection): Record<string, any> {
  const out: Record<string, any> = {};
  if (!col.defaults) return out;
  for (const [k, v] of Object.entries(col.defaults)) {
    out[k] = typeof v === "function" ? (v as Function)() : v;
  }
  return out;
}

/**
 * Lists all posts in a collection, sorted by date descending.
 */
export function listPosts(ctx: BuildContext, collectionName = "posts") {
  const col = ctx.config.collections[collectionName];
  const dir = path.join(ctx.root, col.folder);
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".md"))
    .map(f => {
      const full = path.join(dir, f);
      const gm = matter.read(full);
      const slug = f.replace(/\.md$/, "");
      return {
        slug,
        path: full,
        data: gm.data,
        excerpt: gm.content.slice(0, 200)
      };
    })
    .sort((a, b) =>
      String(b.data.date || "").localeCompare(String(a.data.date || ""))
    );
}

/**
 * Reads a single post by slug.
 */
export function readPost(ctx: BuildContext, slug: string, collectionName = "posts") {
  const col = ctx.config.collections[collectionName];
  const file = path.join(ctx.root, col.folder, `${slug}.md`);
  if (!fs.existsSync(file)) return null;

  const gm = matter.read(file);
  return {
    slug,
    data: gm.data,
    body: gm.content
  };
}

/**
 * Creates a new post with optional title, slug, date, and body.
 */
export function createPost(
  ctx: BuildContext,
  partial: {
    title?: string;
    slug?: string;
    date?: string;
    body?: string;
  },
  collectionName = "posts"
) {
  const col = ctx.config.collections[collectionName];
  const dir = path.join(ctx.root, col.folder);
  fs.mkdirSync(dir, { recursive: true });

  const title = partial.title || "New Post";
  const s = partial.slug || slugify(title) || `post-${Date.now()}`;
  const date = partial.date || new Date().toISOString().split("T")[0];
  const body = partial.body || "";

  const defaults = applyDefaults(col);
  const data = { title, date, ...defaults };
  const fm = matter.stringify(body, data);
  const file = path.join(dir, `${s}.md`);
  writeFile(file, fm);

  return { slug: s, file };
}

/**
 * Updates an existing post by slug.
 */
export function updatePost(
  ctx: BuildContext,
  slug: string,
  payload: {
    data: Record<string, any>;
    body: string;
  },
  collectionName = "posts"
) {
  const col = ctx.config.collections[collectionName];
  const file = path.join(ctx.root, col.folder, `${slug}.md`);
  const fm = matter.stringify(payload.body, payload.data);
  writeFile(file, fm);
  return { slug, file };
}

/**
 * Deletes a post by slug.
 */
export function deletePost(ctx: BuildContext, slug: string, collectionName = "posts") {
  const col = ctx.config.collections[collectionName];
  const file = path.join(ctx.root, col.folder, `${slug}.md`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  return { slug, file };
}
