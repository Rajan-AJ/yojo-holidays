import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { packageExists } from "@/server/repositories/packages";
import { destinationExists } from "@/server/repositories/destinations";
import { findTourCategoryBySlug } from "@/server/repositories/packages";
import { visaGuideExists, visaTypePageExists } from "@/server/repositories/visa";
import { blogCategoryExists, postExists } from "@/server/repositories/blog";
import { findActiveRedirects, recordRedirectHit, type RedirectRule } from "@/server/repositories/redirects";
import { cmsPageExists } from "@/server/repositories/pages";

/** Top-level segments owned by fixed routes; anything else is a CMS page (/{slug}/). */
const FIXED_SEGMENTS = new Set([
  "admin", "packages", "destinations", "tours", "international-tours", "domestic-tours", "visa", "blog",
  "plan-your-trip", "contact", "faq", "search", "thank-you", "__not-found__", "_next",
]);

/**
 * Runs before every page request.
 *
 * 1. CMS redirects (public.redirects): old URLs 301/302 to their new home.
 *    Slug changes on published content add rows automatically (DB trigger).
 *    The whole table is held in memory and refreshed every minute.
 *
 * 2. Real HTTP 404s for database-driven pages. With Cache Components + Partial
 *    Prefetching, a URL whose params weren't prerendered gets the App Shell
 *    with status 200, so notFound() in a page can only produce a soft 404.
 *    A tiny indexed lookup here returns a real 404 for unknown slugs:
 *      /packages/{slug}/   /destinations/{slug}/   /tours/{category}/
 *      /visa/{guide}/[{type}/]   /blog/{slug}/   /blog/category/{slug}/
 *
 * Lookups are memoised per server instance for a minute. A lookup failure
 * never takes the site down: the request continues and the page decides.
 */

export const config = {
  matcher: ["/((?!_next/|api/|favicon|robots.txt|sitemap|uploads/|.*\\.[a-z0-9]+$).*)"],
};

/**
 * /admin: refresh the Supabase session cookies (Server Components can't set
 * cookies). This only keeps tokens fresh; every admin page and action still
 * verifies the user and their permissions on the server.
 */
async function refreshAdminSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

const TTL_MS = 60_000;
const MAX_ENTRIES = 1000;
const memo = new Map<string, { value: boolean; expires: number }>();

async function exists(key: string, load: () => Promise<boolean>) {
  const hit = memo.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await load();
  if (memo.size >= MAX_ENTRIES) memo.delete(memo.keys().next().value!);
  memo.set(key, { value, expires: Date.now() + TTL_MS });
  return value;
}

let redirectCache: { map: Map<string, RedirectRule>; expires: number } | null = null;
async function redirects() {
  if (!redirectCache || redirectCache.expires < Date.now()) {
    redirectCache = { map: await findActiveRedirects(), expires: Date.now() + TTL_MS };
  }
  return redirectCache.map;
}

/** A path with no route: Next renders the site's 404 page with a 404 status. */
const notFound = (request: NextRequest) => NextResponse.rewrite(new URL("/__not-found__/", request.url));

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // No session cookie at all: send straight to the login page (real 307).
    // Pages still verify the session; this just avoids rendering the shell.
    const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-") || c.name === "yojo_dev_staff");
    if (!hasSession && !pathname.startsWith("/admin/login")) {
      return NextResponse.redirect(new URL("/admin/login/", request.url), 307);
    }
    try {
      return await refreshAdminSession(request);
    } catch (error) {
      console.error("[proxy] admin session refresh failed", error);
      return NextResponse.next();
    }
  }

  // ---- 1. CMS redirects (match with or without the trailing slash)
  try {
    const map = await redirects();
    const rule = map.get(pathname) ?? map.get(pathname.endsWith("/") ? pathname.slice(0, -1) : `${pathname}/`);
    if (rule) {
      recordRedirectHit(map.has(pathname) ? pathname : pathname.endsWith("/") ? pathname.slice(0, -1) : `${pathname}/`);
      const target = /^https?:\/\//.test(rule.to) ? new URL(rule.to) : new URL(rule.to + search, request.url);
      return NextResponse.redirect(target, rule.status);
    }
  } catch (error) {
    console.error("[proxy] redirect lookup failed", error);
  }

  // ---- 2. Real 404s for unknown slugs
  const [segment, second, third, ...rest] = pathname.split("/").filter(Boolean);
  if (segment && !second && !FIXED_SEGMENTS.has(segment)) {
    try {
      const found = /^[a-z0-9-]{1,120}$/.test(segment) && (await exists(`pg:${segment}`, () => cmsPageExists(segment)));
      return found ? NextResponse.next() : notFound(request);
    } catch (error) {
      console.error("[proxy] page lookup failed", error);
      return NextResponse.next();
    }
  }
  if (!second || rest.length > 0) return NextResponse.next();

  try {
    let found = true;
    switch (segment) {
      case "packages":
        if (third) return notFound(request);
        found = await exists(`p:${second}`, () => packageExists(second));
        break;
      case "destinations":
        if (third) return notFound(request);
        found = await exists(`d:${second}`, () => destinationExists(second));
        break;
      case "tours":
        if (third) return notFound(request);
        found = await exists(`c:${second}`, async () => Boolean(await findTourCategoryBySlug(second)));
        break;
      case "visa":
        if (second === "finder") return NextResponse.next();
        found = third
          ? await exists(`vt:${second}/${third}`, () => visaTypePageExists(second, third))
          : await exists(`v:${second}`, () => visaGuideExists(second));
        break;
      case "blog":
        if (second === "category") {
          found = third ? await exists(`bc:${third}`, () => blogCategoryExists(third)) : false;
        } else if (third) {
          return notFound(request);
        } else {
          found = await exists(`b:${second}`, () => postExists(second));
        }
        break;
      default:
        return NextResponse.next();
    }
    return found ? NextResponse.next() : notFound(request);
  } catch (error) {
    console.error("[proxy] route lookup failed", error);
    return NextResponse.next();
  }
}
