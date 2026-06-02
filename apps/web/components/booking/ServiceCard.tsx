import Link from "next/link";

interface ServiceCardProps {
  readonly href: string;
  readonly name: string;
  readonly durationLabel: string;
  readonly priceLabel: string;
}

/** Tappable service tile for booking step 1. Mirror-safe via logical properties. */
export function ServiceCard({ href, name, durationLabel, priceLabel }: ServiceCardProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-md rounded-lg border border-hairline bg-surface-card px-lg py-md transition-colors hover:border-ink"
    >
      <span className="flex flex-col gap-xxs">
        <span className="text-body-md text-ink">{name}</span>
        <span className="text-caption text-muted">{durationLabel}</span>
      </span>
      <span className="text-body-sm text-ink">{priceLabel}</span>
    </Link>
  );
}
