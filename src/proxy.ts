import { NextResponse, type NextRequest } from "next/server";
import { findDestinationScope } from "@/server/repositories/destinations";
import { findPackageScope, findTourCategoryBySlug } from "@/server/repositories/packages";
import { visaGuideExists, visaTypePageExists } from "@/server/repositories/visa";
import { CATEGORY_SUFFIX, routes } from "@/lib/routes";
import type { TourScope } from "@/types/content";

/**
 * Real HTTP status codes and clean URLs for database-driven travel pages.
 *
 * Why this exists: with Cache Components + Partial Prefetching, a URL whose
 * params weren't prerendered is answered with the route's App Shell straight
 * away (status 200), so notFound()/redirect() inside a page can only produce a
 * "soft" 404 or a client-side redirect. Proxy runs first and does a tiny
 * indexed lookup, so that:
 *
 *   /{scope}-tours/{destination}/[{package}/]
 *     unknown -> real 404; wrong scope -> 308 to the one canonical URL
 *   /{style}-tours/            (e.g. /family-tours/)
 *     known style -> rewritten to the internal /tour-styles/{style}/ route
 *     unknown     -> real 404
 *   /tour-styles/{style}/      -> 308 to /{style}-tours/ (one canonical URL)
 *   /visa/{country}/[{type}/]  unknown country, or a visa type without its
 *                              own page (thin content) -> real 404
 *
 * Valid pages pass straight through to their cached HTML. Pages keep their own
 * notFound()/permanentRedirect() as a second line of defence. Lookups are
 * memoised per server instance for a minute.
 */

export const config = {
  matcher: [
    "/international-tours/:destination/:package*",
    "/domestic-tours/:destination/:package*",
    "/tour-styles/:category*",
    "/visa/:country/:visaType*",
    "/:style([a-z0-9-]+-tours)",
  ],
};

const SCOPE_BY_SEGMENT: Record<string, TourScope> = {
  "international-tours": "INTERNATIONAL",
  "domestic-tours": "DOMESTIC",
};

const TTL_MS = 60_000;
const MAX_ENTRIES = 500;
const memo = new Map<string, { value: string | null; expires: number }>();

async function lookup(key: string, load: () => Promise<string | null>) {
  const hit = memo.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await load();
  if (memo.size >= MAX_ENTRIES) memo.delete(memo.keys().next().value!);
  memo.set(key, { value, expires: Date.now() + TTL_MS });
  return value;
}

/** A path with no route: Next renders the site's 404 page with a 404 status. */
const notFound = (request: NextRequest) => NextResponse.rewrite(new URL("/__not-found__/", request.url));

const redirect = (request: NextRequest, path: string) => NextResponse.redirect(new URL(path, request.url), 308);

export async function proxy(request: NextRequest) {
  const [segment, second, third, ...rest] = request.nextUrl.pathname.split("/").filter(Boolean);
  if (rest.length > 0) return NextResponse.next();

  try {
    // ---- /visa/{country}/ and /visa/{country}/{type}/ (/visa/finder/ is a static page)
    if (segment === "visa") {
      if (!second || second === "finder") return NextResponse.next();
      const key = third ? `vt:${second}/${third}` : `v:${second}`;
      try {
        const exists = await lookup(key, async () =>
          (third ? await visaTypePageExists(second, third) : await visaGuideExists(second)) ? "1" : null,
        );
        return exists ? NextResponse.next() : notFound(request);
      } catch (error) {
        console.error("[proxy] visa lookup failed", error);
        return NextResponse.next();
      }
    }

    // ---- /tour-styles/{style}/ -> canonical /{style}-tours/
    if (segment === "tour-styles") {
      return second ? redirect(request, routes.tourCategory(second)) : notFound(request);
    }

    const requestedScope = SCOPE_BY_SEGMENT[segment];

    // ---- /{style}-tours/ (scope listings /international-tours/ pass through)
    if (!requestedScope) {
      if (second || !segment?.endsWith(CATEGORY_SUFFIX)) return NextResponse.next();
      const slug = segment.slice(0, -CATEGORY_SUFFIX.length);
      const toStylePage = NextResponse.rewrite(
        new URL(`/tour-styles/${slug}/${request.nextUrl.search}`, request.url),
      );
      try {
        const exists = await lookup(`c:${slug}`, async () => ((await findTourCategoryBySlug(slug)) ? "1" : null));
        return exists ? toStylePage : notFound(request);
      } catch (error) {
        // Lookup failed: still route to the page, which does its own check.
        console.error("[proxy] category lookup failed", error);
        return toStylePage;
      }
    }

    if (!second) return NextResponse.next();

    // ---- /{scope}-tours/{destination}/{package}/
    if (third) {
      const scope = await lookup(`p:${second}/${third}`, () => findPackageScope(second, third));
      if (!scope) return notFound(request);
      if (scope !== requestedScope) return redirect(request, routes.tour(scope as TourScope, second, third));
      return NextResponse.next();
    }

    // ---- /{scope}-tours/{destination}/
    const scope = await lookup(`d:${second}`, () => findDestinationScope(second));
    if (!scope) return notFound(request);
    if (scope !== requestedScope) return redirect(request, routes.destination(scope as TourScope, second));
    return NextResponse.next();
  } catch (error) {
    // Never take the site down over a lookup: let the page handle it.
    console.error("[proxy] route lookup failed", error);
    return NextResponse.next();
  }
}
