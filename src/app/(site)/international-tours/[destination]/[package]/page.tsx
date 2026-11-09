import { PackagePage, packageMetadata, packageStaticParams } from "@/components/templates/package-page";

// /international-tours/[destination]/[package]/
export const generateStaticParams = () => packageStaticParams("INTERNATIONAL");

export async function generateMetadata({ params }: PageProps<"/international-tours/[destination]/[package]">) {
  const { destination, package: packageSlug } = await params;
  return packageMetadata("INTERNATIONAL", destination, packageSlug);
}

export default async function Page({ params }: PageProps<"/international-tours/[destination]/[package]">) {
  // Resolved outside <Suspense> on purpose: invalid combinations must return a real 404.
  const { destination, package: packageSlug } = await params;
  return <PackagePage scope="INTERNATIONAL" destinationSlug={destination} packageSlug={packageSlug} />;
}
