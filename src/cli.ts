// src/cli.ts

/**
 * Nova CLI Entry Point
 * ---------------------
 * Handles commands like build, dev, serve, new, and export.
 * Wraps the core engine and exposes it via terminal interface.
 */

import path from "path";
import fs from "fs";
import { BuildContext } from "@core/schema";
import { fullBuild, watchAndBuild } from "@core/build";
import { startServer } from "@core/server";
import { exportPosts } from "@core/export";

/**
 * Dynamically loads site.config.ts using ts-node.
 */
function loadConfig(root: string) {
  const cfgPath = path.join(root, "site.config.ts");
  const tsnode = require("ts-node");
  tsnode.register({ transpileOnly: true });
  const mod = require(cfgPath);
  return mod.default || mod;
}

/**
 * Constructs the build context from current working directory.
 */
function makeCtx(): BuildContext {
  const root = process.cwd();
  const config = loadConfig(root);
  const ctx: BuildContext = {
    root,
    dist: path.join(root, "dist"),
    publicDir: path.join(root, "public"),
    templatesDir: path.join(root, "templates"),
    config
  };
  return ctx;
}

/**
 * CLI command dispatcher.
 */
async function main() {
  const [, , cmd = "dev", ...args] = process.argv;
  const ctx = makeCtx();

  switch (cmd) {
    case "build":
      fullBuild(ctx);
      console.log("✅ Built to dist/");
      return;

    case "serve":
      fullBuild(ctx);
      startServer(ctx);
      return;

    case "dev":
      watchAndBuild(ctx);
      startServer(ctx);
      return;

    case "new": {
      const title = args.join(" ") || "New Post";
      const { createPost } = require("@core/editor");
      const res = createPost(ctx, { title });
      console.log("📝 Created:", res.file);
      return;
    }

    case "export": {
      const target = args[0] || "all";
      const format = args[1] || "pdf";
      exportPosts(ctx, target, format);
      return;
    }

    default:
      console.log("Nova CLI Commands:");
      console.log("  dev               Start dev server with live rebuild");
      console.log("  build             Build static site to dist/");
      console.log("  serve             Build and serve site");
      console.log("  new <title?>      Create new post");
      console.log("  export <slug|all> <format>  Export post(s) via Pandoc");
  }
}

// 🚀 Run CLI
main().catch(err => {
  console.error("❌ CLI Error:", err);
  process.exit(1);
});
