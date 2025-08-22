// src/core/schema.ts

/**
 * Nova Schema Definitions
 * ------------------------
 * Defines the structure of collections, indexes, and site config.
 * Used for validation, build logic, and admin tooling.
 */

import { z } from "zod";

/**
 * Zod schema shape used for validating frontmatter.
 */
export type ZShape = Record<string, z.ZodTypeAny>;

/**
 * Represents a parsed markdown document.
 */
export type Doc = Record<string, any> & {
  _slug: string;       // derived from filename
  _path: string;       // absolute path to source file
  body?: string;       // raw markdown
  body_html?: string;  // rendered HTML
  body_text?: string;  // plain text (for search/indexing)
  url?: string;        // output URL
};

/**
 * Defines a content collection (e.g. posts, essays, poems).
 */
export type Collection = {
  folder: string;      // relative path to markdown files
  schema: ZShape;      // frontmatter validation schema
  url: (doc: Doc) => string; // function to compute output path
  layout: string;      // layout template to inject into
  defaults?: Record<string, string | number | boolean | (() => string | number | boolean)>;
};

/**
 * Defines an index page (e.g. homepage, markdown listing).
 */
export type IndexDef = {
  name: string;        // identifier (e.g. "home", "markdownIndex")
  sources: string[];   // collection names to include
  path: string;        // output path (e.g. "index.html")
  layout: string;      // layout template to inject into
  partial?: string;    // partial to render before injection
};

/**
 * Full site configuration object.
 */
export type SiteConfig = {
  title: string;
  languages?: string[];
  editor?: boolean;    // enables admin UI
  collections: Record<string, Collection>;
  indexes?: IndexDef[];
};

/**
 * Helper to define site config with type safety.
 */
export function defineSite(cfg: SiteConfig) {
  return cfg;
}

/**
 * Helper to define a collection with type safety.
 */
export function defineCollection(col: Collection) {
  return col;
}

/**
 * Build context passed to all core functions.
 */
export type BuildContext = {
  root: string;        // project root
  dist: string;        // output directory
  publicDir: string;   // static assets
  templatesDir: string;// template folder
  config: SiteConfig;  // parsed site config
};
