import type { Context, Hono } from "hono";

export interface ParamRequest extends Request {
    params?: Record<string, string>;
}

export type RouteHandler = (req: ParamRequest) => Response | Promise<Response>;
export type RouteMethod = "ALL" | "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";
export type RouteEntry = Partial<Record<RouteMethod, RouteHandler>>;
export type RouteMap = Record<string, RouteHandler | RouteEntry>;

export function requestFromContext(c: Context): ParamRequest {
    return Object.assign(c.req.raw, { params: c.req.param() });
}

export function registerRoutes(app: Hono, routes: RouteMap): void {
    for (const [pattern, value] of Object.entries(routes)) {
        if (typeof value === "function") {
            app.all(pattern, (c) => value(requestFromContext(c)));
            continue;
        }

        for (const [method, handler] of Object.entries(value)) {
            app.on(method as never, pattern, (c) => handler(requestFromContext(c)));
        }
    }
}
