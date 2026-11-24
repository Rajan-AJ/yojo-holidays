import { PackagePage, packageMetadata, packageStaticParams } from "@/components/templates/package-page";

// /packages/[slug]/ - generated from the database; no package is hard-coded.
export const generateStaticParams = packageStaticParams;

export async function generateMetadata({ params }: PageProps<"/packages/[slug]">) {
  return packageMetadata((await params).slug);
}

export default async function Page({ params }: PageProps<"/packages/[slug]">) {
  // Resolved outside <Suspense> on purpose: unknown slugs must return a real 404.
  return <PackagePage slug={(await params).slug} />;
}
