/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as articles from "../articles.js";
import type * as auth from "../auth.js";
import type * as authors from "../authors.js";
import type * as http from "../http.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as library from "../library.js";
import type * as paths from "../paths.js";
import type * as preferences from "../preferences.js";
import type * as profiles from "../profiles.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as seedContent from "../seedContent.js";
import type * as taxonomy from "../taxonomy.js";
import type * as vocabulary from "../vocabulary.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  articles: typeof articles;
  auth: typeof auth;
  authors: typeof authors;
  http: typeof http;
  "lib/permissions": typeof lib_permissions;
  library: typeof library;
  paths: typeof paths;
  preferences: typeof preferences;
  profiles: typeof profiles;
  search: typeof search;
  seed: typeof seed;
  seedContent: typeof seedContent;
  taxonomy: typeof taxonomy;
  vocabulary: typeof vocabulary;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
