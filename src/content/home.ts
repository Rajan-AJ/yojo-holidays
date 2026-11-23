/**
 * Homepage editorial content that is NOT database content: the hero photo,
 * client figures, "Why choose us", the booking steps and the closing CTA.
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
import type { HomeIcon } from "@/components/home/icons";

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


/** Image behind the closing call to action. */
export const ctaImage = images.vietnamBridge;


/**
 * "Our track record" figures supplied by the client. Leave a value null until
 * the client confirms it: null figures are simply not shown. Never estimate.
 * (Counts of destinations, packages, travel styles and visa guides are
 * computed from the database on the homepage.)
 */
export const clientFigures: { icon: HomeIcon; value: number | null; suffix?: string; label: string; sublabel?: string }[] = [
  { icon: "star", value: null, suffix: "+", label: "Years of experience" },
  { icon: "users", value: null, suffix: "+", label: "Happy travellers" },
];

/** COPY TO BE CONFIRMED BY THE CLIENT. No numbers or guarantees until supplied. */
export const whyUs = {
  eyebrow: "Why choose us",
  title: "The Yojo",
  accent: "Difference",
  intro: "One team for the whole trip, from the first idea to the day you fly home.",
  principles: [
    {
      icon: "users" as HomeIcon,
      title: "Planned around you",
      body: "Every trip starts with how you like to travel: your pace, your budget and the people you're going with.",
    },
    {
      icon: "globe" as HomeIcon,
      title: "India and abroad, in one place",
      body: "Domestic holidays and international journeys, planned by the same people.",
    },
    {
      icon: "passport" as HomeIcon,
      title: "Visa help built in",
      body: "Visa guidance is part of planning the trip, so the paperwork is never an afterthought.",
    },
    {
      icon: "receipt" as HomeIcon,
      title: "Clear before you commit",
      body: "You see what is included, and what isn't, before you book.",
    },
    {
      icon: "route" as HomeIcon,
      title: "Flexible itineraries",
      body: "Start from one of our journeys or build your own. Every day can be adjusted.",
    },
    {
      icon: "chat" as HomeIcon,
      title: "Real people to talk to",
      body: "Questions go to the team planning your trip, not to a call centre.",
    },
  ],
};

/** How booking works. COPY TO BE CONFIRMED BY THE CLIENT (no time promises yet). */
export const journeySteps = {
  eyebrow: "How it works",
  title: "Your journey to",
  accent: "hassle-free travel",
  intro: "Five simple steps from enquiry to landing. We do the planning; you do the dreaming.",
  steps: [
    {
      icon: "chat" as HomeIcon,
      title: "Share your idea",
      body: "Tell us where you'd like to go, when, your budget and who's travelling.",
    },
    {
      icon: "route" as HomeIcon,
      title: "Get your plan",
      body: "We send a day-by-day itinerary with hotel options and a clear cost breakdown.",
    },
    {
      icon: "check" as HomeIcon,
      title: "Fine-tune and confirm",
      body: "Change anything you like, then confirm when it feels right.",
    },
    {
      icon: "passport" as HomeIcon,
      title: "We handle the details",
      body: "Bookings, transfers and visa guidance, all arranged before you leave.",
    },
    {
      icon: "plane" as HomeIcon,
      title: "Travel with ease",
      body: "Go knowing the people who planned your trip are a message away.",
    },
  ],
};

/** Reassurance chips in the closing call to action. Statements only. */
export const ctaPoints = ["Free consultation", "No hidden costs", "Visa guidance"];
