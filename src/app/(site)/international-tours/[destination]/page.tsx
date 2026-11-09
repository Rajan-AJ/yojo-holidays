import {
  DestinationPage,
  destinationMetadata,
  destinationStaticParams,
} from "@/components/templates/destination-page";

// /international-tours/[destination]/ - shares its template with the other scope.
export const generateStaticParams = () => destinationStaticParams("INTERNATIONAL");

export async function generateMetadata({ params }: PageProps<"/international-tours/[destination]">) {
  const { destination } = await params;
  return destinationMetadata("INTERNATIONAL", destination);
}

export default async function Page({ params }: PageProps<"/international-tours/[destination]">) {
  // Resolved outside <Suspense> on purpose: unknown slugs must return a real 404.
  const { destination } = await params;
  return <DestinationPage scope="INTERNATIONAL" slug={destination} />;
}
