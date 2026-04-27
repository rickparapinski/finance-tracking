import { NextRequest } from "next/server";
import { sql } from "@/lib/db";

// ── Parse Apple Wallet notification text ─────────────────────────────
// Handles formats like:
//   "€12.50 at Wolt"
//   "€12,50 bei Wolt"          (German decimal comma)
//   "€1.234,56 at Merchant"    (German thousands dot)
//   "Paid €8.99 to Spotify"
//   "Payment of €12.50 at H&M"
function parseWalletText(raw: string): {
  amount: number | null;
  merchant: string | null;
  currency: string;
} {
  const text = raw.trim();

  const currencySymbols: Record<string, string> = {
    "€": "EUR", "$": "USD", "£": "GBP", "¥": "JPY",
  };
  const symMatch = text.match(/[€$£¥]/);
  const currency = symMatch ? (currencySymbols[symMatch[0]] ?? "EUR") : "EUR";

  // Normalise amount string: handle both "1.234,56" and "1,234.56" formats
  function parseAmount(s: string): number {
    const hasDotAndComma = s.includes(".") && s.includes(",");
    let normalised: string;
    if (hasDotAndComma) {
      // Whichever comes last is the decimal separator
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
        normalised = s.replace(/\./g, "").replace(",", ".");
      } else {
        normalised = s.replace(/,/g, "");
      }
    } else {
      // Only one separator — if comma, treat as decimal
      normalised = s.replace(",", ".");
    }
    return parseFloat(normalised);
  }

  const amountPat = `[€$£¥]\\s*([\\d.,]+)`;
  const atPat = `(?:at|to|bei|für|an|@)\\s*(.+)`;

  const patterns: RegExp[] = [
    // "€12.50 at Wolt" / "€12,50 bei Wolt"
    new RegExp(`${amountPat}\\s*${atPat}`, "i"),
    // "Paid €12.50 to Spotify" / "Payment of €12.50 at H&M"
    new RegExp(`(?:paid|payment of|bezahlung|zahlung)\\s+${amountPat}\\s+${atPat}`, "i"),
    // "Apple Pay €12.50 Wolt" — no keyword
    new RegExp(`${amountPat}\\s+([\\w].+)`, "i"),
  ];

  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      const amount = parseAmount(m[1]);
      const merchant = m[2]?.trim().replace(/\.$/, "") ?? null;
      if (!isNaN(amount) && amount > 0 && merchant) {
        return { amount, merchant, currency };
      }
    }
  }

  return { amount: null, merchant: null, currency };
}

export async function POST(req: NextRequest) {
  // Optional secret check — set INGEST_SECRET in env to lock down the endpoint
  const secret = req.headers.get("x-ingest-secret");
  if (process.env.INGEST_SECRET && secret !== process.env.INGEST_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Accept "raw", "text", or "notification" as the payload key
  const raw = String(body.raw ?? body.text ?? body.notification ?? "").trim();
  if (!raw) return new Response("Missing notification text", { status: 400 });

  const { amount, merchant, currency } = parseWalletText(raw);

  await sql`
    INSERT INTO staged_transactions (raw_text, merchant, amount, currency, source)
    VALUES (${raw}, ${merchant}, ${amount}, ${currency}, ${"apple_wallet"})
  `;

  return Response.json({ ok: true, parsed: { amount, merchant, currency } });
}
