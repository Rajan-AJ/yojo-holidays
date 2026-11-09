import type { Price } from "@/types/content";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * "From ₹45,000 per person" or "Price on request".
 * Never renders a number that is not in the data.
 */
export function PriceDisplay({
  price,
  size = "md",
  className,
}: {
  price: Price;
  size?: "sm" | "md";
  className?: string;
}) {
  if (price.amount === null) {
    return <p className={cn("text-body-sm text-muted", className)}>Price on request</p>;
  }

  return (
    <p className={cn("leading-tight", className)}>
      <span className="caption block text-muted">From</span>
      <span className={cn("font-serif", size === "md" ? "text-h4" : "text-body-lg")}>
        {formatPrice(price.amount, price.currency)}
      </span>
      {price.note && <span className="caption ml-1.5 text-muted">{price.note}</span>}
    </p>
  );
}
