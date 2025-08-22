// src/config/site.config.ts

/**
 * Nova Site Configuration
 * ------------------------
 * Declares collections and index pages for the static site.
 * Used by the build engine and admin interface.
 */

import { defineSite, defineCollection } from "@core/schema";
import { z } from "zod";

export default defineSite({
  title: "WGC Markdown Editor",
  editor: true, // Enables admin UI

  collections: {
    posts: defineCollection({
      folder: "content/posts", // Markdown source folder
      schema: {
        title: z.string(),
        date: z.string().optional(),
        description: z.string().optional(),
        body: z.string().optional(),
        _slug: z.string().optional()
      },
      defaults: {
        title: "New Post",
        date: () => new Date().toISOString().split("T")[0],
        description: "",
        body: ""
      },
      url: (doc) => `/markdown/${doc._slug}/index.html`, // Output path
      layout: "templates/base.html"                  // Layout to inject into
    })
  },

  indexes: [
    {
      name: "home",                  // Homepage index
      sources: ["posts"],           // Source collection(s)
      path: "index.html",           // Output path
      layout: "templates/base.html",
      partial: "index"              // Partial to render before injection
    },
    {
      name: "markdownIndex",            // Markdown file listing page
      sources: ["posts"],
      path: "markdown/index.html",
      layout: "templates/base.html",
      partial: "index"
    }
  ]
});
