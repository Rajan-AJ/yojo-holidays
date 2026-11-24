import Link from "next/link";
import type { ArticleSummary, BlogCategoryRef } from "@/types/content";
import { ArticleCard } from "@/components/cards/article-card";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export const BLOG_PAGE_SIZE = 12;

/** Topic pills: "All" + every blog category. */
export function BlogTopics({ categories, current }: { categories: (BlogCategoryRef & { postCount: number })[]; current?: string }) {
  if (categories.length === 0) return null;
  const pill = "inline-flex min-h-10 items-center rounded-full border px-4 text-body-sm transition-colors";
  return (
    <nav aria-label="Blog topics">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href="/blog/"
            aria-current={!current ? "page" : undefined}
            className={cn(pill, !current ? "border-ink bg-ink text-white" : "border-line-strong hover:border-ink")}
          >
            All
          </Link>
        </li>
        {categories
          .filter((c) => c.postCount > 0)
          .map((c) => (
            <li key={c.slug}>
              <Link
                href={c.href}
                aria-current={current === c.slug ? "page" : undefined}
                className={cn(pill, current === c.slug ? "border-ink bg-ink text-white" : "border-line-strong hover:border-ink")}
              >
                {c.name}
              </Link>
            </li>
          ))}
      </ul>
    </nav>
  );
}

/** Lead story + grid, with an "Older posts" keyset link when there may be more. */
export function BlogList({ posts, basePath, showLead = true }: { posts: ArticleSummary[]; basePath: string; showLead?: boolean }) {
  if (posts.length === 0) {
    return <p className="text-body-lg text-muted">New articles are on their way. Check back soon.</p>;
  }
  const [lead, ...rest] = showLead ? posts : [undefined, ...posts];
  const last = posts[posts.length - 1];
  const older =
    posts.length >= BLOG_PAGE_SIZE && last.publishedAt
      ? `${basePath}?before=${encodeURIComponent(`${last.publishedAt}_${last.id}`)}`
      : undefined;

  return (
    <div className="space-y-16">
      {lead && <ArticleCard article={lead} layout="feature" headingLevel="h2" sizes="(min-width: 1024px) 60vw, 100vw" />}
      {rest.length > 0 && (
        <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => post && (
            <li key={post.id}>
              <ArticleCard article={post} headingLevel="h2" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" />
            </li>
          ))}
        </ul>
      )}
      {older && (
        <div className="flex justify-center">
          <ButtonLink href={older} variant="ghost" rel="next">
            Older posts
            <ArrowIcon />
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

/** Parses ?before=ISO_uuid (keyset cursor). Invalid values are ignored. */
export function parseCursor(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const match = value?.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)_([0-9a-f-]{36})$/i);
  return match ? { publishedAt: match[1], id: match[2] } : undefined;
}
