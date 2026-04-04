"use server";

import { NormalizedTransaction } from "./types";

export async function parseTFBank(formData: FormData): Promise<NormalizedTransaction[]> {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { PDFParse } = require("pdf-parse");
  const parser = new PDFParse(new Uint8Array(buffer));
  const result = await parser.getText();

  const text: string = result.pages.map((pg: any) => pg.text).join("\n");
  const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
  const transactions: NormalizedTransaction[] = [];

  // Each transaction row starts with a Bew.ID (9–11 digits) + Buchung date
  const ROW_START = /^(\d{9,11})\s+(\d{2}\.\d{2}\.\d{4})/;

  // Amount line — two shapes:
  //   Full:  "23.00 EUR -23.00 D"  or  "1 000.00 EUR 1 000.00 C"
  //   Short: "-66.33 D"  (interest / fee rows with no Trans.Betrag column)
  // The billing amount (Rechn.Betrag) already carries the correct sign.
  const AMOUNT_FULL  = /(-?[\d\s]+[.,]\d{2})\s+EUR\s+(-?[\d\s]+[.,]\d{2})\s+([CD])\s*$/;
  const AMOUNT_SHORT = /^(-?[\d\s]+[.,]\d{2})\s+([CD])\s*$/;

  // Lines to skip when collecting description text
  const SKIP_LINE = /^(Wechselkurs|Verwendeter|Bezahlter|Kontoauszug|Kontoinformation|Bew\.ID|Postadresse|TF Bank|www\.|service@|030-|Box |SE-|556)/i;

  function parseAmount(str: string): number {
    return parseFloat(str.replace(/\s/g, "").replace(",", "."));
  }

  for (let i = 0; i < lines.length; i++) {
    const startMatch = lines[i].match(ROW_START);
    if (!startMatch) continue;

    const buchung = startMatch[2]; // DD.MM.YYYY
    const [day, month, year] = buchung.split(".");
    const date = `${year}-${month}-${day}`;

    // Remainder of the start line, stripping the optional Bew.Datum date
    let rest = lines[i].slice(startMatch[0].length).trim();
    rest = rest.replace(/^\d{2}\.\d{2}\.\d{4}\s*/, "");

    const descParts: string[] = [];
    let amount: number | null = null;

    // Check if the amount is already on the start line (Bezahlung / Zinsen cases)
    const fullOnLine  = rest.match(AMOUNT_FULL);
    const shortOnLine = !fullOnLine && rest.match(AMOUNT_SHORT);

    if (fullOnLine) {
      amount = parseAmount(fullOnLine[2]);
      rest = rest.slice(0, rest.lastIndexOf(fullOnLine[0])).trim();
      descParts.push(rest);
    } else if (shortOnLine) {
      amount = parseAmount(shortOnLine[1]);
      rest = rest.slice(0, rest.lastIndexOf(shortOnLine[0])).trim();
      descParts.push(rest);
    } else {
      // Amount is on a subsequent line — scan ahead
      descParts.push(rest);
      let j = i + 1;
      while (j < lines.length && j <= i + 8) {
        const line = lines[j];
        if (ROW_START.test(line)) break;

        const full  = line.match(AMOUNT_FULL);
        const short = line.match(AMOUNT_SHORT);

        if (full) {
          amount = parseAmount(full[2]);
          j++;
          break;
        }
        if (short) {
          amount = parseAmount(short[1]);
          j++;
          break;
        }
        if (!SKIP_LINE.test(line)) descParts.push(line);
        j++;
      }
      i = j - 1;
    }

    if (amount === null) continue;

    transactions.push({
      date,
      amount,
      description: cleanDescription(descParts.join(" ")),
      currency: "EUR",
      category: "",
    });
  }

  console.log(`TF Bank: parsed ${transactions.length} transactions`);
  return transactions;
}

function cleanDescription(raw: string): string {
  let d = raw;

  // Remove Wechselkurs and everything after it
  d = d.replace(/\s*Wechselkurs.*$/i, "");

  // Type-specific simplification
  if (/^Bezahlung\s+Zahlung/i.test(d)) return "Zahlung";
  const p2p = d.match(/^P2P-Debet Teil\s+(\S+)/i);
  if (p2p) return p2p[1]; // e.g. "Revolut**8151*"

  // Remove "Kauf {CODE} " prefix
  d = d.replace(/^Kauf\s+[A-Z0-9]{5,12}\s+/i, "");
  // Remove *TRANSACTIONCODE patterns (e.g. *DQ6QL6N15)
  d = d.replace(/\*[A-Z0-9]{7,}/g, "");
  // Remove "1st Floor ..." address
  d = d.replace(/\s+\d+(?:st|nd|rd|th)\s+\w+.*/i, "");
  // Remove "38 avenue / 5 rue / 70 SIR JOHN" type addresses
  d = d.replace(/\s+\d+\s+(?:rue|avenue|street|quay|floor|sq\b).*/i, "");
  // Remove trailing standalone alphanumeric codes (e.g. 3C04Y23K5)
  d = d.replace(/\s+[A-Z\d]{8,}$/, "");

  return d.replace(/\s{2,}/g, " ").trim();
}
