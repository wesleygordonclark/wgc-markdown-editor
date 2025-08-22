// src/core/server.ts

/**
 * Nova Dev Server
 * ----------------
 * Serves static site from /dist and exposes admin API routes.
 * Enables live editing, previewing, and CRUD operations via /admin.
 */

import express from "express";
import bodyParser from "body-parser";
import path from "path";
import fs from "fs";
import { BuildContext } from "./schema";
import {
  listPosts,
  readPost,
  createPost,
  updatePost,
  deletePost
} from "./editor";

export function startServer(ctx: BuildContext) {
  const app = express();
  app.use(bodyParser.json({ limit: "2mb" }));

  // 🧱 Serve static site from /dist
  app.use(express.static(ctx.dist, { extensions: ["html"] }));

  // 📁 Serve static assets from /templates (e.g. admin.js)
  app.use("/templates", express.static(path.join(ctx.root, "templates")));

  // 🛠 Admin UI (if enabled)
  if (ctx.config.editor) {
    const adminHtml = path.join(ctx.root, "templates/admin.html");

    // Serve SPA-style admin interface
    app.get("/admin", (_req, res) => res.sendFile(adminHtml));
    app.get("/admin/*", (_req, res) => res.sendFile(adminHtml));
  }

  // 📦 API: List all posts
  app.get("/_nova/api/posts", (_req, res) => {
    res.json(listPosts(ctx));
  });

  // 📄 API: Read single post
  app.get("/_nova/api/posts/:slug", (req, res) => {
    const p = readPost(ctx, req.params.slug);
    if (!p) return res.status(404).json({ error: "not found" });
    res.json(p);
  });

  // 📝 API: Create new post
  app.post("/_nova/api/posts", (req, res) => {
    const { title, slug, date, body } = req.body || {};
    const result = createPost(ctx, { title, slug, date, body });
    res.json(result);
  });

  // 🔄 API: Update post
  app.put("/_nova/api/posts/:slug", (req, res) => {
    const { data, body } = req.body || {};
    const result = updatePost(ctx, req.params.slug, { data, body });
    res.json(result);
  });

  // 🗑 API: Delete post
  app.delete("/_nova/api/posts/:slug", (req, res) => {
    const result = deletePost(ctx, req.params.slug);
    res.json(result);
  });

  // 🚀 Start server
  const port = process.env.PORT ? Number(process.env.PORT) : 4321;
  app.listen(port, () => {
    console.log(`Dev server running at http://localhost:${port}  (admin at /admin)`);
  });

  return app;
}
