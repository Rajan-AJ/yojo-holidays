/**
 * Homepage editorial content that is NOT database content: the hero photo,
 * the Domestic / International split and the "Why us" statements.
 *
 * Everything travel-related on the homepage (destinations, tours, itinerary,
 * travel styles, visa destinations, guides, FAQs, reviews) now comes from the
 * database through src/server/queries.
 *
 * - Photography here is a PLACEHOLDER from Unsplash (free under the Unsplash
 *   License) until the client's own images are uploaded. These move into
 *   SiteSetting / Media when the admin dashboard exists (Phase 11).
 * - The "Why us" copy is derived only from the business description in
 *   src/config/site.ts. COPY TO BE CONFIRMED BY THE CLIENT. No numbers until
 *   real ones are supplied.
 */
import type { ImageAsset } from "@/types/content";
import { routes } from "@/lib/routes";

/** Placeholder photo. Width-capped at source so the optimiser fetches a sane original. */
function photo(id: string, alt: string): ImageAsset {
  return { src: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=2000&q=80`, alt };
}

const images = {
  hero: photo(
    "1476514525535-07fb3b4ae5f1",
    "The bow of a wooden boat on a still turquoise lake, facing forested cliffs and grey mountain peaks",
  ),
  kerala: photo("1602216056096-3b40cc0c9944", "A thatched houseboat on a palm-lined backwater in Kerala"),
  vietnamBridge: photo(
    "1559592413-7cec4d0cae2b",
    "The Golden Bridge near Da Nang, Vietnam, held up by two giant stone hands above a forest",
  ),
  flight: photo("1436491865332-7a61a109cc05", "An aircraft wing above soft clouds in golden light"),
  planning: photo(
    "1488646953014-85cb44e25828",
    "A paper map on a table with a notebook, pencil, camera and travel guides",
  ),
};

export const hero = {
  title: "Where will you go next?",
  description: "Thoughtfully planned journeys for curious travellers.",
  image: images.hero,
};

export const scopeSplit = {
  domestic: {
    title: "India, up close.",
    description: "Backwaters, forts, mountains and coast, planned door to door.",
    href: routes.scope("DOMESTIC"),
    image: images.kerala,
  },
  international: {
    title: "The world, within reach.",
    description: "From Southeast Asia to Europe, with visas and the details handled.",
    href: routes.scope("INTERNATIONAL"),
    image: images.vietnamBridge,
  },
} as const;

export const visaImage = images.flight;

export const whyUs = {
  title: "Travel should feel simple.",
  intro: "One team for the whole trip, from the first idea to the day you fly home.",
  image: images.planning,
  principles: [
    {
      title: "Planned around you",
      body: "Every trip starts with how you like to travel: your pace, your budget and the people you're going with.",
    },
    {
      title: "India and abroad, in one place",
      body: "Domestic holidays and international journeys, planned by the same people.",
    },
    {
      title: "Visa help built in",
      body: "Visa guidance is part of planning the trip, so the paperwork is never an afterthought.",
    },
    {
      title: "Clear before you commit",
      body: "You see what is included, and what isn't, before you book.",
    },
  ],
};
