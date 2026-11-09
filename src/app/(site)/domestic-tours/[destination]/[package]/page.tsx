import { PackagePage, packageMetadata, packageStaticParams } from "@/components/templates/package-page";

// /domestic-tours/[destination]/[package]/
export const generateStaticParams = () => packageStaticParams("DOMESTIC");

export async function generateMetadata({ params }: PageProps<"/domestic-tours/[destination]/[package]">) {
  const { destination, package: packageSlug } = await params;
  return packageMetadata("DOMESTIC", destination, packageSlug);
}

export default async function Page({ params }: PageProps<"/domestic-tours/[destination]/[package]">) {
  // Resolved outside <Suspense> on purpose: invalid combinations must return a real 404.
  const { destination, package: packageSlug } = await params;
  return <PackagePage scope="DOMESTIC" destinationSlug={destination} packageSlug={packageSlug} />;
}
