import {
  DestinationPage,
  destinationMetadata,
  destinationStaticParams,
} from "@/components/templates/destination-page";

// /domestic-tours/[destination]/ - shares its template with the other scope.
export const generateStaticParams = () => destinationStaticParams("DOMESTIC");

export async function generateMetadata({ params }: PageProps<"/domestic-tours/[destination]">) {
  const { destination } = await params;
  return destinationMetadata("DOMESTIC", destination);
}

export default async function Page({ params }: PageProps<"/domestic-tours/[destination]">) {
  // Resolved outside <Suspense> on purpose: unknown slugs must return a real 404.
  const { destination } = await params;
  return <DestinationPage scope="DOMESTIC" slug={destination} />;
}
