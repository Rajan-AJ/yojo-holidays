import { NotFoundContent } from "@/components/sections/not-found-content";

// notFound() inside the public site renders here, within the site layout
// (header + footer come from (site)/layout.tsx). Next adds noindex.
export default function SiteNotFound() {
  return <NotFoundContent />;
}
