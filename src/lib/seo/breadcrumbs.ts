import type { Crumb } from "@/components/ui/breadcrumbs";
import type { DestinationDetail, TourPackageDetail, TourScope } from "@/types/content";
import { routes } from "@/lib/routes";
import { scopeTitle } from "@/lib/labels";

/**
 * Breadcrumb trails built from real data relationships, never typed by hand
 * per page. The last crumb is the current page.
 */
const home: Crumb = { name: "Home", href: routes.home() };

export const scopeCrumb = (scope: TourScope): Crumb => ({ name: scopeTitle[scope], href: routes.scope(scope) });

export function destinationTrail(d: Pick<DestinationDetail, "scope" | "ancestors" | "name" | "href">): Crumb[] {
  return [home, scopeCrumb(d.scope), ...d.ancestors, { name: d.name, href: d.href }];
}

export function packageTrail(p: Pick<TourPackageDetail, "destinationRef" | "destinationAncestors" | "name" | "href">): Crumb[] {
  return [
    home,
    scopeCrumb(p.destinationRef.scope),
    ...p.destinationAncestors,
    { name: p.destinationRef.name, href: p.destinationRef.href },
    { name: p.name, href: p.href },
  ];
}

export function listingTrail(current: Crumb, parent?: Crumb): Crumb[] {
  return [home, ...(parent ? [parent] : []), current];
}

export const visaCrumb: Crumb = { name: "Visa", href: routes.visa() };

export function visaCountryTrail(country: { name: string; href: string }, extra?: Crumb): Crumb[] {
  return [home, visaCrumb, country, ...(extra ? [extra] : [])];
}
