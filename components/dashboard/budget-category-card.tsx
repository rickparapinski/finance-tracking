import { Nah } from "@/components/Nah";

interface BudgetCategoryCardProps {
  name: string;
  spent: number;
  budget: number;
  currencySymbol?: string;
}

const SEGMENTS = 8;

function SegmentedBar({ pct, dark }: { pct: number; dark?: boolean }) {
  const filled = Math.min(SEGMENTS, Math.ceil(pct * SEGMENTS));
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: SEGMENTS }).map((_, i) => (
        <div
          key={i}
          className="h-2 flex-1 rounded-[2px]"
          style={{
            backgroundColor:
              i < filled
                ? "#C5F03A"
                : dark
                  ? "rgba(250,247,236,0.12)"
                  : "rgba(31,31,31,0.1)",
            border: i < filled ? "none" : "1px solid rgba(31,31,31,0.15)",
          }}
        />
      ))}
    </div>
  );
}

function Squiggle() {
  return (
    <svg
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{ left: 0, width: "100%", top: "0.55em" }}
      viewBox="0 0 48 6"
      preserveAspectRatio="none"
      height={5}
    >
      <path
        d="M0 3 Q6 0 12 3 Q18 6 24 3 Q30 0 36 3 Q42 6 48 3"
        fill="none"
        stroke="#C5F03A"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function fmt(n: number, symbol: string) {
  const val = n % 1 === 0 ? String(n) : n.toFixed(2);
  return `${val} ${symbol}`;
}

export function BudgetCategoryCard({
  name,
  spent,
  budget,
  currencySymbol = "€",
}: BudgetCategoryCardProps) {
  const over = spent > budget;
  const pct = budget > 0 ? spent / budget : 0;

  if (!over) {
    return (
      <div className="bg-surface border-2 border-ink rounded-md p-4">
        <h3 className="font-pixel text-ink text-sm">{name}</h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-xl text-ink">
            {fmt(spent, currencySymbol)}
          </span>
          <span className="font-sans text-xs text-ink-soft">
            / {fmt(budget, currencySymbol)}
          </span>
        </div>
        <div className="mt-3">
          <SegmentedBar pct={pct} />
        </div>
        <p className="font-mono text-[11px] text-ink-soft mt-2">
          {fmt(budget - spent, currencySymbol)} left
        </p>
      </div>
    );
  }

  // Over-budget: charcoal slab + Nah disappointed perched on top-right
  const overage = spent - budget;
  return (
    <div className="relative pt-10">
      {/* Nah perched on the top-right edge of the slab */}
      <div className="absolute top-0 right-4 z-10">
        <Nah expression="disappointed" size={56} />
      </div>

      <div className="bg-ink rounded-md p-4">
        <h3 className="font-pixel text-cream-soft text-sm mb-3">{name}</h3>

        {/* Amounts */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-mono text-2xl text-cream-soft">
            {fmt(spent, currencySymbol)}
          </span>
          <span
            className="font-sans text-xs"
            style={{ color: "rgba(250,247,236,0.45)" }}
          >
            of
          </span>
          {/* Budget number with squiggle strikethrough */}
          <span
            className="relative font-mono text-sm inline-block pb-1"
            style={{ color: "rgba(250,247,236,0.45)" }}
          >
            {fmt(budget, currencySymbol)}
            <Squiggle />
          </span>
        </div>

        {/* Nah's voice */}
        <p
          className="font-sans text-[11px] mt-1"
          style={{ color: "rgba(250,247,236,0.35)" }}
        >
          we talked about this.
        </p>

        {/* 8-segment bar — all filled */}
        <div className="mt-4">
          <SegmentedBar pct={pct} dark />
        </div>

        {/* Overage label */}
        <p className="font-mono text-[11px] text-lime mt-2">
          +{fmt(overage, currencySymbol)} over budget
        </p>
      </div>
    </div>
  );
}
