import Link from "next/link";

interface BarberCardProps {
  readonly href: string;
  readonly name: string;
  readonly bio?: string | null;
}

/** Tappable barber tile for booking step 2. */
export function BarberCard({ href, name, bio }: BarberCardProps) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-xxs rounded-lg border border-hairline bg-surface-card px-lg py-md transition-colors hover:border-ink"
    >
      <span className="text-body-md text-ink">{name}</span>
      {bio ? <span className="text-caption text-muted">{bio}</span> : null}
    </Link>
  );
}
