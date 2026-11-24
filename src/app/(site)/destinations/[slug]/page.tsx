import {
  DestinationPage,
  destinationMetadata,
  destinationStaticParams,
} from "@/components/templates/destination-page";

// /destinations/[slug]/ - generated from the database.
export const generateStaticParams = destinationStaticParams;

export async function generateMetadata({ params }: PageProps<"/destinations/[slug]">) {
  return destinationMetadata((await params).slug);
}

export default async function Page({ params }: PageProps<"/destinations/[slug]">) {
  // Resolved outside <Suspense> on purpose: unknown slugs must return a real 404.
  return <DestinationPage slug={(await params).slug} />;
}
