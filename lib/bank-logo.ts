type BankInfo = { initials: string; bg: string; fg: string };

const KNOWN_BANKS: { pattern: RegExp; info: BankInfo }[] = [
  { pattern: /revolut/i,   info: { initials: "R",   bg: "#191C1F", fg: "#FFFFFF" } },
  { pattern: /nubank/i,    info: { initials: "N",   bg: "#8A05BE", fg: "#FFFFFF" } },
  { pattern: /n26/i,       info: { initials: "N26", bg: "#26CF90", fg: "#000000" } },
  { pattern: /tf.?bank/i,  info: { initials: "TF",  bg: "#004B87", fg: "#FFFFFF" } },
  { pattern: /ing/i,       info: { initials: "ING", bg: "#FF6200", fg: "#FFFFFF" } },
  { pattern: /monzo/i,     info: { initials: "M",   bg: "#FF3464", fg: "#FFFFFF" } },
  { pattern: /wise/i,      info: { initials: "W",   bg: "#9FE870", fg: "#163300" } },
  { pattern: /paypal/i,    info: { initials: "PP",  bg: "#003087", fg: "#FFFFFF" } },
  { pattern: /barclays/i,  info: { initials: "B",   bg: "#00AEEF", fg: "#FFFFFF" } },
  { pattern: /hsbc/i,      info: { initials: "H",   bg: "#DB0011", fg: "#FFFFFF" } },
  { pattern: /sparkasse/i, info: { initials: "S",   bg: "#FF0000", fg: "#FFFFFF" } },
  { pattern: /dkb/i,       info: { initials: "DKB", bg: "#004A98", fg: "#FFFFFF" } },
];

const FALLBACK_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316",
  "#eab308","#22c55e","#14b8a6","#0ea5e9","#3b82f6",
];

export function bankLogo(name: string): BankInfo {
  for (const { pattern, info } of KNOWN_BANKS) {
    if (pattern.test(name)) return info;
  }
  // Deterministic fallback color from name
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  const bg = FALLBACK_COLORS[h % FALLBACK_COLORS.length];
  const words = name.trim().split(/\s+/);
  const initials = words.length === 1
    ? words[0].slice(0, 2).toUpperCase()
    : words.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  return { initials, bg, fg: "#FFFFFF" };
}
