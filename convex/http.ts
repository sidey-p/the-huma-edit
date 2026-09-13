import { httpRouter } from "convex/server";
import { auth } from "./auth";

/**
 * THE HUMAN EDIT - HTTP routes (§26).
 * Auth endpoints (/api/auth/*) for the client SDK.
 */

const http = httpRouter();

auth.addHttpRoutes(http);

export default http;
