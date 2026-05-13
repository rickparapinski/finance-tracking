"use client";

// Pixel-art SVG icons from Streamline — paths use fill="currentColor".
// Mirrors the CategoryIcon.tsx pattern exactly.

// Account.type values from the data model
type AccountIconKey = "Checking" | "Savings" | "Investment" | "Credit Card" | "Loan";

// Raw inner-SVG path strings extracted from public/icons/*.svg
const ICONS: Record<AccountIconKey, string> = {
  // checking-account.svg — bank building
  Checking: `<path d="M30.47 10.67h-1.52V9.14h-1.52v1.53h-3.05v1.52h1.52v12.19h-3.05v-4.57h-1.52v4.57h-1.52v-3.05h-1.53v3.05h-4.57v-3.05h-1.52v3.05h-1.53v-4.57H9.14v4.57H6.09V12.19h1.53v-1.52H4.57V9.14H3.04v1.53H1.52V7.62H0v4.57h1.52v15.24H0V32h32v-4.57h-1.53V12.19H32V7.62h-1.53Zm-3.04 1.52h1.52v12.19h-1.52Zm-24.39 0h1.53v12.19H3.04Zm0 13.72h25.91v1.52H3.04Zm27.43 4.57H1.52v-1.53h28.95Z" fill="currentColor"/><path d="M27.43 6.1h3.04v1.52h-3.04Z" fill="currentColor"/><path d="M24.38 7.62h3.05v1.52h-3.05Z" fill="currentColor"/><path d="M24.38 4.57h3.05V6.1h-3.05Z" fill="currentColor"/><path d="M21.33 6.1h3.05v1.52h-3.05Z" fill="currentColor"/><path d="M21.33 3.05h3.05v1.52h-3.05Z" fill="currentColor"/><path d="M18.28 4.57h3.05V6.1h-3.05Z" fill="currentColor"/><path d="M18.28 1.52h3.05v1.53h-3.05Z" fill="currentColor"/><path d="M13.71 6.1v1.52h-1.52v1.52h-1.53v1.53H9.14v4.57h1.52v1.52h1.53v1.53h1.52v1.52h4.57v-1.52h1.53v-1.53h1.52v-1.52h1.52v-4.57h-1.52V9.14h-1.52V7.62h-1.53V6.1Zm4.57 3.04v1.53h-4.57v1.52h4.57v1.52h1.53v1.53h-1.53v1.52h-1.52v1.53h-1.52v-1.53h-1.53v-1.52h4.57v-1.53h-4.57v-1.52h-1.52v-1.52h1.52V9.14h1.53V7.62h1.52v1.52Z" fill="currentColor"/><path d="M13.71 3.05h4.57v1.52h-4.57Z" fill="currentColor"/><path d="M13.71 0h4.57v1.52h-4.57Z" fill="currentColor"/><path d="M10.66 4.57h3.05V6.1h-3.05Z" fill="currentColor"/><path d="M10.66 1.52h3.05v1.53h-3.05Z" fill="currentColor"/><path d="M7.62 6.1h3.04v1.52H7.62Z" fill="currentColor"/><path d="M7.62 3.05h3.04v1.52H7.62Z" fill="currentColor"/><path d="M4.57 7.62h3.05v1.52H4.57Z" fill="currentColor"/><path d="M4.57 4.57h3.05V6.1H4.57Z" fill="currentColor"/><path d="M1.52 6.1h3.05v1.52H1.52Z" fill="currentColor"/>`,

  // Savings and Investment share the bank icon — they're asset accounts
  Savings:    `<path d="M30.47 10.67h-1.52V9.14h-1.52v1.53h-3.05v1.52h1.52v12.19h-3.05v-4.57h-1.52v4.57h-1.52v-3.05h-1.53v3.05h-4.57v-3.05h-1.52v3.05h-1.53v-4.57H9.14v4.57H6.09V12.19h1.53v-1.52H4.57V9.14H3.04v1.53H1.52V7.62H0v4.57h1.52v15.24H0V32h32v-4.57h-1.53V12.19H32V7.62h-1.53Zm-3.04 1.52h1.52v12.19h-1.52Zm-24.39 0h1.53v12.19H3.04Zm0 13.72h25.91v1.52H3.04Zm27.43 4.57H1.52v-1.53h28.95Z" fill="currentColor"/><path d="M27.43 6.1h3.04v1.52h-3.04Z" fill="currentColor"/><path d="M24.38 7.62h3.05v1.52h-3.05Z" fill="currentColor"/><path d="M24.38 4.57h3.05V6.1h-3.05Z" fill="currentColor"/><path d="M21.33 6.1h3.05v1.52h-3.05Z" fill="currentColor"/><path d="M21.33 3.05h3.05v1.52h-3.05Z" fill="currentColor"/><path d="M18.28 4.57h3.05V6.1h-3.05Z" fill="currentColor"/><path d="M18.28 1.52h3.05v1.53h-3.05Z" fill="currentColor"/><path d="M13.71 6.1v1.52h-1.52v1.52h-1.53v1.53H9.14v4.57h1.52v1.52h1.53v1.53h1.52v1.52h4.57v-1.52h1.53v-1.53h1.52v-1.52h1.52v-4.57h-1.52V9.14h-1.52V7.62h-1.53V6.1Zm4.57 3.04v1.53h-4.57v1.52h4.57v1.52h1.53v1.53h-1.53v1.52h-1.52v1.53h-1.52v-1.53h-1.53v-1.52h4.57v-1.53h-4.57v-1.52h-1.52v-1.52h1.52V9.14h1.53V7.62h1.52v1.52Z" fill="currentColor"/><path d="M13.71 3.05h4.57v1.52h-4.57Z" fill="currentColor"/><path d="M13.71 0h4.57v1.52h-4.57Z" fill="currentColor"/><path d="M10.66 4.57h3.05V6.1h-3.05Z" fill="currentColor"/><path d="M10.66 1.52h3.05v1.53h-3.05Z" fill="currentColor"/><path d="M7.62 6.1h3.04v1.52H7.62Z" fill="currentColor"/><path d="M7.62 3.05h3.04v1.52H7.62Z" fill="currentColor"/><path d="M4.57 7.62h3.05v1.52H4.57Z" fill="currentColor"/><path d="M4.57 4.57h3.05V6.1H4.57Z" fill="currentColor"/><path d="M1.52 6.1h3.05v1.52H1.52Z" fill="currentColor"/>`,

  Investment: `<path d="M30.47 10.67h-1.52V9.14h-1.52v1.53h-3.05v1.52h1.52v12.19h-3.05v-4.57h-1.52v4.57h-1.52v-3.05h-1.53v3.05h-4.57v-3.05h-1.52v3.05h-1.53v-4.57H9.14v4.57H6.09V12.19h1.53v-1.52H4.57V9.14H3.04v1.53H1.52V7.62H0v4.57h1.52v15.24H0V32h32v-4.57h-1.53V12.19H32V7.62h-1.53Zm-3.04 1.52h1.52v12.19h-1.52Zm-24.39 0h1.53v12.19H3.04Zm0 13.72h25.91v1.52H3.04Zm27.43 4.57H1.52v-1.53h28.95Z" fill="currentColor"/><path d="M27.43 6.1h3.04v1.52h-3.04Z" fill="currentColor"/><path d="M24.38 7.62h3.05v1.52h-3.05Z" fill="currentColor"/><path d="M24.38 4.57h3.05V6.1h-3.05Z" fill="currentColor"/><path d="M21.33 6.1h3.05v1.52h-3.05Z" fill="currentColor"/><path d="M21.33 3.05h3.05v1.52h-3.05Z" fill="currentColor"/><path d="M18.28 4.57h3.05V6.1h-3.05Z" fill="currentColor"/><path d="M18.28 1.52h3.05v1.53h-3.05Z" fill="currentColor"/><path d="M13.71 6.1v1.52h-1.52v1.52h-1.53v1.53H9.14v4.57h1.52v1.52h1.53v1.53h1.52v1.52h4.57v-1.52h1.53v-1.53h1.52v-1.52h1.52v-4.57h-1.52V9.14h-1.52V7.62h-1.53V6.1Zm4.57 3.04v1.53h-4.57v1.52h4.57v1.52h1.53v1.53h-1.53v1.52h-1.52v1.53h-1.52v-1.53h-1.53v-1.52h4.57v-1.53h-4.57v-1.52h-1.52v-1.52h1.52V9.14h1.53V7.62h1.52v1.52Z" fill="currentColor"/><path d="M13.71 3.05h4.57v1.52h-4.57Z" fill="currentColor"/><path d="M13.71 0h4.57v1.52h-4.57Z" fill="currentColor"/><path d="M10.66 4.57h3.05V6.1h-3.05Z" fill="currentColor"/><path d="M10.66 1.52h3.05v1.53h-3.05Z" fill="currentColor"/><path d="M7.62 6.1h3.04v1.52H7.62Z" fill="currentColor"/><path d="M7.62 3.05h3.04v1.52H7.62Z" fill="currentColor"/><path d="M4.57 7.62h3.05v1.52H4.57Z" fill="currentColor"/><path d="M4.57 4.57h3.05V6.1H4.57Z" fill="currentColor"/><path d="M1.52 6.1h3.05v1.52H1.52Z" fill="currentColor"/>`,

  // credit-card-account.svg — credit card
  "Credit Card": `<path d="m30.47 23.62 -1.52 0 0 1.52 -25.91 0 0 1.53 1.53 0 0 1.52 25.9 0 0 -1.52 1.53 0 0 -18.29 -1.53 0 0 15.24z" fill="currentColor"/><path d="M27.43 5.33h1.52V22.1h-1.52Z" fill="currentColor"/><path d="m22.85 9.91 -1.52 0 0 -1.53 -1.52 0 0 -1.52 -4.57 0 0 1.52 -1.53 0 0 1.53 1.53 0 0 1.52 1.52 0 0 4.57 -1.52 0 0 1.52 -1.53 0 0 1.53 1.53 0 0 1.52 4.57 0 0 -1.52 1.52 0 0 -1.53 1.52 0 0 -1.52 1.53 0 0 -4.57 -1.53 0 0 -1.52z" fill="currentColor"/><path d="M12.19 16h1.52v1.52h-1.52Z" fill="currentColor"/><path d="M12.19 9.91h1.52v1.52h-1.52Z" fill="currentColor"/><path d="m12.19 17.52 -1.53 0 0 1.53 -1.52 0 0 1.52 4.57 0 0 -1.52 -1.52 0 0 -1.53z" fill="currentColor"/><path d="m10.66 12.95 -1.52 0 0 1.53 1.52 0 0 1.52 1.53 0 0 -4.57 -1.53 0 0 1.52z" fill="currentColor"/><path d="m10.66 9.91 1.53 0 0 -1.53 1.52 0 0 -1.52 -4.57 0 0 1.52 1.52 0 0 1.53z" fill="currentColor"/><path d="M9.14 16h1.52v1.52H9.14Z" fill="currentColor"/><path d="M9.14 9.91h1.52v1.52H9.14Z" fill="currentColor"/><path d="M7.62 17.52h1.52v1.53H7.62Z" fill="currentColor"/><path d="M7.62 14.48h1.52V16H7.62Z" fill="currentColor"/><path d="M7.62 11.43h1.52v1.52H7.62Z" fill="currentColor"/><path d="M7.62 8.38h1.52v1.53H7.62Z" fill="currentColor"/><path d="M6.09 16h1.53v1.52H6.09Z" fill="currentColor"/><path d="M6.09 9.91h1.53v1.52H6.09Z" fill="currentColor"/><path d="m7.62 14.48 0 -1.53 -1.53 0 0 -1.52 -1.52 0 0 4.57 1.52 0 0 -1.52 1.53 0z" fill="currentColor"/><path d="M1.52 3.81h25.91v1.52H1.52Z" fill="currentColor"/><path d="M1.52 22.1h25.91v1.52H1.52Z" fill="currentColor"/><path d="M0 5.33h1.52V22.1H0Z" fill="currentColor"/>`,

  // loan-account.svg — coin stack
  Loan: `<path d="M7.62 29.715h12.19v1.52H7.62Z" fill="currentColor"/><path d="M19.81 28.195h4.57v1.52h-4.57Z" fill="currentColor"/><path d="m15.24 26.665 0 -1.52 -10.67 0 0 1.52 1.53 0 0 3.05 1.52 0 0 -3.05 7.62 0z" fill="currentColor"/><path d="m12.19 22.095 0 -1.52 -10.66 0 0 1.52 1.52 0 0 3.05 1.52 0 0 -3.05 7.62 0z" fill="currentColor"/><path d="M0 17.525h1.53v3.05H0Z" fill="currentColor"/><path d="M16.76 16.005h1.53v1.52h-1.53Z" fill="currentColor"/><path d="M4.57 16.005h6.1v1.52h-6.1Z" fill="currentColor"/><path d="M15.24 12.955h1.52v3.05h-1.52Z" fill="currentColor"/><path d="M10.67 14.475h1.52v1.53h-1.52Z" fill="currentColor"/><path d="M3.05 14.475h1.52v1.53H3.05Z" fill="currentColor"/><path d="m7.62 14.475 0 -1.52 1.52 0 0 -1.53 -4.57 0 0 1.53 1.53 0 0 1.52 1.52 0z" fill="currentColor"/><path d="M1.53 12.955h1.52v1.52H1.53Z" fill="currentColor"/><path d="M13.72 9.905h1.52v3.05h-1.52Z" fill="currentColor"/><path d="M0 5.335h1.53v7.62H0Z" fill="currentColor"/><path d="M27.43 9.9v1.52h-1.52v1.53h1.52v13.71h-3.05v1.54h3.05v1.52H32V9.9Zm3.05 16.76h-1.53v-3.05h1.53Z" fill="currentColor"/><path d="M24.38 9.905h1.53v1.52h-1.53Z" fill="currentColor"/><path d="M9.14 9.905h1.53v1.52H9.14Z" fill="currentColor"/><path d="M21.34 8.385h3.04v1.52h-3.04Z" fill="currentColor"/><path d="M12.19 8.385h1.53v1.52h-1.53Z" fill="currentColor"/><path d="M4.57 8.385h4.57v1.52H4.57Z" fill="currentColor"/><path d="M19.81 6.855h1.53v1.53h-1.53Z" fill="currentColor"/><path d="M3.05 6.855h1.52v1.53H3.05Z" fill="currentColor"/><path d="M18.29 5.335h1.52v1.52h-1.52Z" fill="currentColor"/><path d="m9.14 6.855 0 -1.52 -1.52 0 0 -1.52 -1.52 0 0 1.52 -1.53 0 0 1.52 4.57 0z" fill="currentColor"/><path d="M16.76 3.815h1.53v1.52h-1.53Z" fill="currentColor"/><path d="M10.67 3.815h1.52v4.57h-1.52Z" fill="currentColor"/><path d="M1.53 3.815h1.52v1.52H1.53Z" fill="currentColor"/><path d="M12.19 2.285h4.57v1.53h-4.57Z" fill="currentColor"/><path d="M3.05 2.285h1.52v1.53H3.05Z" fill="currentColor"/><path d="M4.57 0.765h6.1v1.52h-6.1Z" fill="currentColor"/>`,
};

interface AccountIconProps {
  /** Account type string from the data model (e.g. "Checking", "Credit Card", "Loan") */
  type: string;
  className?: string;
}

export function AccountIcon({ type, className = "w-6 h-6" }: AccountIconProps) {
  const paths = ICONS[type as AccountIconKey];

  if (!paths) {
    // Unknown type — same 2×2 dot-grid placeholder as CategoryIcon
    return (
      <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
        <rect x="8"  y="8"  width="6" height="6" fill="currentColor" />
        <rect x="18" y="8"  width="6" height="6" fill="currentColor" />
        <rect x="8"  y="18" width="6" height="6" fill="currentColor" />
        <rect x="18" y="18" width="6" height="6" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      // dangerouslySetInnerHTML is safe — content is a static compile-time constant
      dangerouslySetInnerHTML={{ __html: paths }}
    />
  );
}
