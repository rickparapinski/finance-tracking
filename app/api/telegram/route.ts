import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API = `https://api.telegram.org/bot${TOKEN}`;

// ─── Telegram helpers ────────────────────────────────────────────────────────

async function tg(method: string, body: object) {
  await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function reply(chatId: number, text: string, extra: object = {}) {
  await tg("sendMessage", { chat_id: chatId, text, parse_mode: "Markdown", ...extra });
}

async function editMessage(chatId: number, messageId: number, text: string) {
  await tg("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [] },
  });
}

async function answerCallback(callbackQueryId: string) {
  await tg("answerCallbackQuery", { callback_query_id: callbackQueryId });
}

// ─── Categorization ──────────────────────────────────────────────────────────

async function autoCategory(description: string): Promise<string> {
  const rules = await sql`
    SELECT cr.pattern, cr.is_case_sensitive, c.name
    FROM category_rules cr
    JOIN categories c ON cr.category_id = c.id
    WHERE cr.is_active = true AND c.is_active = true
    ORDER BY cr.priority ASC
  `;

  for (const r of rules) {
    const hay    = r.is_case_sensitive ? description : description.toLowerCase();
    const needle = r.is_case_sensitive ? r.pattern   : r.pattern.toLowerCase();
    if (hay.includes(needle)) return r.name;
  }

  return "Uncategorized";
}

// ─── Date parsing ────────────────────────────────────────────────────────────

function parseDate(text: string): { date: string; rest: string } {
  const now = new Date();

  // "yesterday"
  if (/\byesterday\b/i.test(text)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return {
      date: d.toISOString().slice(0, 10),
      rest: text.replace(/\byesterday\b/i, "").trim(),
    };
  }

  // "DD/MM" or "DD.MM" at end of message
  const dateMatch = text.match(/\b(\d{1,2})[./](\d{1,2})\s*$/);
  if (dateMatch) {
    const day   = dateMatch[1].padStart(2, "0");
    const month = dateMatch[2].padStart(2, "0");
    const year  = now.getFullYear();
    return {
      date: `${year}-${month}-${day}`,
      rest: text.slice(0, dateMatch.index).trim(),
    };
  }

  return { date: now.toISOString().slice(0, 10), rest: text };
}

// ─── Message handler ─────────────────────────────────────────────────────────

async function handleMessage(message: any) {
  const chatId = message.chat.id;
  const text   = (message.text ?? "").trim();

  // Parse amount — leading +/- sets income vs expense explicitly
  // No sign → treated as expense (negative)
  const amountMatch = text.match(/^([+-]?[\d]+([.,]\d{1,2})?)/);
  if (!amountMatch) {
    await reply(chatId, "❌ Start with an amount\\. Example: `50 Wolt` or `+3000 Salary` or `50 Wolt 25/03`");
    return;
  }

  const rawAmount = parseFloat(amountMatch[0].replace(",", "."));
  const rest      = text.slice(amountMatch[0].length).trim();

  const { date, rest: descRaw } = parseDate(rest);
  const description = descRaw || "Manual entry";

  // Positive input = expense (negative), + prefix or negative = income
  const signedAmount = rawAmount > 0 ? -rawAmount : Math.abs(rawAmount);
  const isIncome     = signedAmount > 0;
  const emoji        = isIncome ? "💰" : "💸";
  const sign         = isIncome ? "+" : "-";
  const dateLabel    = date === new Date().toISOString().slice(0, 10) ? "today" : date;

  // Fetch accounts for keyboard
  const accounts = await sql`SELECT id, name, currency FROM accounts WHERE status = 'active' ORDER BY name`;

  if (accounts.length === 0) {
    await reply(chatId, "❌ No active accounts found\\.");
    return;
  }

  // callback_data: confirm:{accountId}:{signedAmount}:{YYYYMMDD}
  // Total budget: 64 bytes — UUID(36) + amount(~8) + date(8) + separators+prefix(12) = ~64
  const compact = date.replace(/-/g, ""); // YYYYMMDD
  const keyboard = accounts.map((acc: any) => ([{
    text: `${acc.name} (${acc.currency})`,
    callback_data: `confirm:${acc.id}:${signedAmount}:${compact}`,
  }]));

  await reply(chatId,
    `${emoji} *${sign}${Math.abs(signedAmount).toFixed(2)}* · ${description} · _${dateLabel}_\n\nWhich account?`,
    { reply_markup: { inline_keyboard: keyboard } }
  );
}

// ─── Callback handler ─────────────────────────────────────────────────────────

async function handleCallback(callbackQuery: any) {
  const { id, data, message } = callbackQuery;
  await answerCallback(id);

  if (!data?.startsWith("confirm:")) return;

  const [, accountId, amountStr, compact] = data.split(":");
  const amount = parseFloat(amountStr);
  const date   = compact
    ? `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`
    : new Date().toISOString().slice(0, 10);
  const chatId = message.chat.id;

  // Parse description from bot's message text
  // Format: "💸 *-50.00* · Wolt · _today_\n\nWhich account?"
  const descMatch = message.text?.match(/·\s+(.+?)\s+·/);
  const description = descMatch ? descMatch[1].trim() : "Manual entry";

  const [account] = await sql`SELECT name, currency FROM accounts WHERE id = ${accountId}`;
  if (!account) {
    await editMessage(chatId, message.message_id, "❌ Account not found.");
    return;
  }

  const category = await autoCategory(description);
  const isIncome = amount > 0;
  const emoji    = isIncome ? "💰" : "💸";
  const sign     = isIncome ? "+" : "-";

  await sql`
    INSERT INTO transactions (account_id, date, amount, description, category, is_manual, original_currency)
    VALUES (${accountId}, ${date}, ${amount}, ${description}, ${category}, true, ${account.currency})
  `;

  await editMessage(
    chatId,
    message.message_id,
    `✅ *${sign}${Math.abs(amount).toFixed(2)} ${account.currency}* saved\n` +
    `📋 ${description}\n` +
    `🏷 ${category}\n` +
    `🏦 ${account.name}\n` +
    `📅 ${date}`
  );
}

// ─── Route entry point ────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.callback_query) {
      await handleCallback(body.callback_query);
    } else if (body.message?.text) {
      await handleMessage(body.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: false });
  }
}
