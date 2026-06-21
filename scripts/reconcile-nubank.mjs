// One-off script: reconcile Nubank checking + CC with bank statements
// Run: node scripts/reconcile-nubank.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sql = postgres("postgresql://finance:henrique1312@192.168.178.50:5432/finance", {
  ssl: false,
});

const CC_ACCOUNT    = "e3b6ac2d-b019-42b8-a7df-3bc1421e4add";
const CHK_ACCOUNT   = "efc8067a-5e79-440d-a0a0-4891bb444da8";
const NUBANK_DIR    = "C:/Users/Rick/Downloads/Nubank";

// IDs to delete (duplicates / wrong entries in current DB)
const DELETE_IDS = [
  "332c1d4f-cf37-4ead-a7e0-06f8e4a6ee6c", // Shopee +142.96 manual duplicate
  "6d7c2ed5-48c4-41ed-bd26-97a90ae00155", // "Funding BR" +1905 — reimport from CSV
  "5da6b47d-799b-4dac-ae83-8ac5f4fc44fb", // "BRL payments" +257.28 (EUR amt in BRL acct)
];

// ── Parsers ────────────────────────────────────────────────────────────────

/** Brazilian number "30,98" or "- 1.000,00" → float */
function parseBRL(raw) {
  return parseFloat(
    raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
  );
}

/** "DD/MM/YYYY" → "YYYY-MM-DD" */
function parseBRDate(s) {
  const [d, m, y] = s.split("/");
  return `${y}-${m}-${d}`;
}

/**
 * Parse a Nubank CC CSV (date,title,amount).
 * Amounts are positive for expenses → flip to negative.
 * Payments ("Pagamento recebido") are negative in CSV → flip to positive.
 */
function parseCCFile(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  const txs = [];
  for (let i = 1; i < lines.length; i++) {
    // CSV may have quoted fields with commas inside
    const match = lines[i].match(/^(\d{4}-\d{2}-\d{2}),"?([^"]+)"?,"?([^"]+)"?$/);
    if (!match) {
      // Try a more permissive parse for lines with quoted amount
      const parts = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
      if (parts.length < 3) continue;
      const date = parts[0].trim();
      const title = parts[1].trim().replace(/^"|"$/g, "");
      const amtRaw = parts[2].trim().replace(/^"|"$/g, "");
      const amount = parseBRL(amtRaw) * -1; // invert
      txs.push({ date, description: title, amount, currency: "BRL" });
    } else {
      const date = match[1];
      const title = match[2];
      const amount = parseBRL(match[3]) * -1;
      txs.push({ date, description: title, amount, currency: "BRL" });
    }
  }
  return txs;
}

/**
 * Parse a Nubank Checking CSV (Data,Valor,Identificador,Descrição).
 * Skip "Valor adicionado na conta por cartão de crédito" entries (CC-funded Pix credits,
 * net zero with the debit; expense shows on CC statement instead).
 */
function parseCheckingFile(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  const txs = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length < 4) continue;
    const date = parseBRDate(parts[0].trim());
    const amount = parseFloat(parts[1].trim());
    // parts[2] = identifier, rest = description
    const description = parts.slice(3).join(",").trim().replace(/^"|"$/g, "");

    // Skip CC-funded Pix pairs (net zero in checking; expense tracked on CC)
    if (description.startsWith("Valor adicionado na conta por cartão de crédito")) continue;
    // Also skip the paired outbound "Transferência enviada pelo Pix" for CC-funded items
    // (they have the same identifier as the paired inbound — we detect by checking if same
    //  identifier appears earlier in the file with opposite amount)
    // Simpler heuristic: skip Pix-out entries that are offsets of CC-funded credits
    // We detect these by: the credit entry with same ID starts with "Valor adicionado..."
    // Since we skip those credits, the paired debits will show as orphans. Let's skip them too
    // based on a pattern match: "Transferência enviada pelo Pix" where the description
    // mentions the outbound amount funded by CC. We identify them by finding same-day
    // same-ID counterparts — but since IDs are in parts[2], let's track them.

    txs.push({ date, amount, description, currency: "BRL", _id: parts[2].trim() });
  }

  // Remove paired CC-funded Pix: find IDs appearing with both +/- (CC credit + Pix debit)
  const idAmounts = {};
  txs.forEach((t) => {
    if (!idAmounts[t._id]) idAmounts[t._id] = [];
    idAmounts[t._id].push(t.amount);
  });

  return txs.filter((t) => {
    const amounts = idAmounts[t._id] || [];
    // If this ID has exactly two transactions that sum to ~0 (paired), skip both
    if (amounts.length === 2) {
      const sum = amounts[0] + amounts[1];
      if (Math.abs(sum) < 0.01) return false; // paired zero-sum → skip
    }
    return true;
  });
}

// ── Category assignment ────────────────────────────────────────────────────

function categorize(description, isChecking) {
  const d = description.toLowerCase();

  if (isChecking) {
    if (d.includes("daycoval")) return "Salary";
    if (d.includes("pagamento de fatura")) return "Transfer";
    if (d.includes("boleto") || d.includes("cea pay")) return "Shopping";
    return "Transfer";
  }

  // CC
  if (d.includes("pagamento recebido")) return "Transfer";
  if (d.includes("crédito de") || d.includes("credito de") || d.includes("estorno")) return "Transfer";
  if (d.includes("ifood") || d.includes("ifd*") || d.includes("panificadora") ||
      d.includes("restaurante") || d.includes("amazon fruit") || d.includes("trapiche") ||
      d.includes("gelasko") || d.includes("po de queijo") || d.includes("tropical banana") ||
      d.includes("lieferando")) return "Take out";
  if (d.includes("uber")) return "Transport";
  if (d.includes("microsoft") || d.includes("xbox") || d.includes("ppro *microsoft") ||
      d.includes("apple") || d.includes("netflix") || d.includes("produtosuol") ||
      d.includes("16personalities")) return "Subscriptions";
  if (d.includes("steam") || d.includes("wl *steam")) return "Fun";
  if (d.includes("superm") || d.includes("condor")) return "Groceries";
  if (d.includes("labtech") || d.includes("foccus") || d.includes("saude") ||
      d.includes("farmais") || d.includes("teschi")) return "Beauty and Health";
  if (d.includes("vera lucia") || d.includes("pix no crédito") || d.includes("pix no credito")) return "Transfer";
  if (d.includes("wise brasil") || d.includes("demerge")) return "Transfer";
  if (d.includes("iof")) return "Interest and Fees";
  if (d.includes("tim*tim")) return "Utilities";
  if (d.includes("zafalon") || d.includes("posto") || d.includes("estacionamento")) return "Transport";
  if (d.includes("ambiacobrancas")) return "Rent";
  if (d.includes("startlabs")) return "Shopping";
  if (d.includes("shopee") || d.includes("magalu") || d.includes("amazon") ||
      d.includes("chilli beans") || d.includes("iguatemi") || d.includes("dantecapell") ||
      d.includes("cabral") || d.includes("shpp") || d.includes("m4 produtos") ||
      d.includes("zp*priscila") || d.includes("joc jockey") || d.includes("valpas") ||
      d.includes("quero mais") || d.includes("ca modas") || d.includes("benedita") ||
      d.includes("defaultpag") || d.includes("farmais") || d.includes("gru air")) return "Shopping";

  return "Uncategorized";
}

// ── Exchange rates ─────────────────────────────────────────────────────────

async function fetchRates(minDate, maxDate) {
  const url = `https://api.frankfurter.dev/v1/${minDate}..${maxDate}?to=BRL`;
  console.log(`  Fetching rates ${minDate}..${maxDate}…`);
  const res = await fetch(url);
  const data = await res.json();
  return data.rates || {}; // { "2026-03-01": { BRL: 5.83 }, ... }
}

function getRate(ratesMap, dateStr) {
  // Direct hit
  if (ratesMap[dateStr]?.BRL) return ratesMap[dateStr].BRL;
  // Walk backwards up to 7 days to find nearest rate (weekends/holidays)
  const d = new Date(dateStr);
  for (let i = 1; i <= 7; i++) {
    const prev = new Date(d);
    prev.setDate(prev.getDate() - i);
    const key = prev.toISOString().split("T")[0];
    if (ratesMap[key]?.BRL) return ratesMap[key].BRL;
  }
  return 6.0; // fallback
}

// ── Dedup key (must match saveTransactions logic) ──────────────────────────

function txKey(date, amount, description) {
  const d = (description || "").trim().replace(/\s+/g, " ").toLowerCase();
  return `${date}|${amount}|${d}`;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══ Nubank Reconciliation ═══\n");

  // 1. Delete stale manual entries
  console.log("── Step 1: Delete stale manual entries ──");
  for (const id of DELETE_IDS) {
    const res = await sql`DELETE FROM transactions WHERE id = ${id} RETURNING description, amount`;
    if (res.length > 0) {
      console.log(`  ✓ Deleted: ${res[0].description} (${res[0].amount})`);
    } else {
      console.log(`  ⚠ Not found: ${id}`);
    }
  }

  // 2. Parse all CSV files
  console.log("\n── Step 2: Parse CSV files ──");

  const ccFiles = [
    "Nubank_2026-03-01.csv",
    "Nubank_2026-04-01.csv",
    "Nubank_2026-05-01.csv",
    "Nubank_2026-06-01.csv",
  ];
  const checkingFiles = [
    "NU_801722528_01MAR2026_31MAR2026.csv",
    "NU_801722528_01ABR2026_30ABR2026.csv",
    "NU_801722528_01MAI2026_31MAI2026.csv",
    "NU_801722528_01JUN2026_20JUN2026.csv",
  ];

  let allCC = [];
  for (const f of ccFiles) {
    const txs = parseCCFile(path.join(NUBANK_DIR, f));
    console.log(`  CC  ${f}: ${txs.length} entries`);
    allCC.push(...txs);
  }

  let allChk = [];
  for (const f of checkingFiles) {
    const txs = parseCheckingFile(path.join(NUBANK_DIR, f));
    console.log(`  CHK ${f}: ${txs.length} entries (after filtering paired Pix)`);
    allChk.push(...txs);
  }

  // 3. Fetch exchange rates
  console.log("\n── Step 3: Fetch exchange rates ──");
  const allDates = [...allCC, ...allChk].map((t) => t.date).sort();
  const minDate = allDates[0];
  const maxDate = allDates[allDates.length - 1];
  const ratesMap = await fetchRates(minDate, maxDate);

  // 4. Build payloads with amount_eur and category
  function buildPayload(txs, accountId, isChecking) {
    return txs.map((t) => {
      const rate = getRate(ratesMap, t.date);
      const amountEur = t.amount / rate;
      return {
        account_id: accountId,
        date: t.date,
        amount: t.amount,
        amount_eur: Math.round(amountEur * 100) / 100,
        description: t.description,
        category: categorize(t.description, isChecking),
        original_currency: "BRL",
        is_manual: false,
        installment_index: null,
        installment_total: null,
      };
    });
  }

  const ccPayload  = buildPayload(allCC,  CC_ACCOUNT,  false);
  const chkPayload = buildPayload(allChk, CHK_ACCOUNT, true);

  // 5. Deduplicate against existing DB
  console.log("\n── Step 4: Deduplicate & insert ──");

  async function insertAccount(payload, accountId, label) {
    if (payload.length === 0) { console.log(`  ${label}: nothing to insert`); return; }

    const dates = payload.map((p) => p.date).sort();
    const min = dates[0];
    const max = dates[dates.length - 1];

    const existingRows = await sql`
      SELECT date, amount, description FROM transactions
      WHERE account_id = ${accountId} AND date >= ${min} AND date <= ${max}
    `;

    const existingSet = new Set();
    existingRows.forEach((r) => {
      existingSet.add(txKey(r.date, Number(r.amount), String(r.description)));
    });

    const newRows = [];
    let dupes = 0;
    for (const row of payload) {
      const key = txKey(row.date, Number(row.amount), String(row.description));
      if (existingSet.has(key)) { dupes++; }
      else { newRows.push(row); existingSet.add(key); }
    }

    console.log(`  ${label}: ${newRows.length} to insert, ${dupes} duplicates skipped`);

    if (newRows.length > 0) {
      // Chunk into 200
      for (let i = 0; i < newRows.length; i += 200) {
        const chunk = newRows.slice(i, i + 200);
        await sql`INSERT INTO transactions ${sql(chunk)}`;
      }
      console.log(`  ${label}: ✓ inserted ${newRows.length}`);
    }
  }

  await insertAccount(ccPayload,  CC_ACCOUNT,  "Nubank Card");
  await insertAccount(chkPayload, CHK_ACCOUNT, "Nubank Checking");

  // 6. Summary
  console.log("\n── Final counts ──");
  const ccCount  = await sql`SELECT COUNT(*) as n FROM transactions WHERE account_id = ${CC_ACCOUNT}`;
  const chkCount = await sql`SELECT COUNT(*) as n FROM transactions WHERE account_id = ${CHK_ACCOUNT}`;
  console.log(`  Nubank Card total:     ${ccCount[0].n} transactions`);
  console.log(`  Nubank Checking total: ${chkCount[0].n} transactions`);

  await sql.end();
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
