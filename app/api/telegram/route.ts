import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const TAG_MAP: Record<string, string> = {
  "@revolut": "Revolut Main",
  "@klarna": "Klarna",
  "@nubankcc": "Nubank Card",
  "@nubank": "Nubank Checking",
  "@tf": "TF Bank Card",
  "@paypal": "Paypal",
  "@nu": "Nubank Checking",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.message || !body.message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = body.message.chat.id;
    const originalText = body.message.text.trim();

    const amountMatch = originalText.match(/^(-?[\d,]+(\.\d{1,2})?)/);

    if (!amountMatch) {
      await sendTelegramMessage(
        chatId,
        "❌ Format: Amount Description @tag\nExample: '100 Sneakers @klarna'",
      );
      return NextResponse.json({ ok: true });
    }

    const rawAmount = parseFloat(amountMatch[0].replace(/,/g, ""));

    let textWithoutAmount = originalText.replace(amountMatch[0], "").trim();
    const words = textWithoutAmount.split(/\s+/);
    const tags = words.filter((w) => w.startsWith("@"));
    const descriptionWords = words.filter((w) => !w.startsWith("@"));
    const description = descriptionWords.join(" ");

    let targetAccountName = "Revolut Main";

    if (tags.length > 0) {
      const tag = tags[0].toLowerCase();
      if (TAG_MAP[tag]) {
        targetAccountName = TAG_MAP[tag];
      } else {
        await sendTelegramMessage(
          chatId,
          `⚠️ Unknown tag '${tag}'. Saving to Revolut Main.`,
        );
      }
    }

    const [account] = await sql`
      SELECT id, currency FROM accounts WHERE name = ${targetAccountName}
    `;

    if (!account) {
      await sendTelegramMessage(
        chatId,
        `❌ Error: Account '${targetAccountName}' not found in DB.`,
      );
      return NextResponse.json({ ok: true });
    }

    const finalAmount = rawAmount > 0 ? -rawAmount : Math.abs(rawAmount);

    await sql`
      INSERT INTO transactions (account_id, date, amount, description, category, is_manual, original_currency)
      VALUES (${account.id}, ${new Date().toISOString().slice(0, 10)}, ${finalAmount},
              ${description || "Manual Entry"}, 'Manual Entry', true, ${account.currency})
    `;

    await sendTelegramMessage(
      chatId,
      `✅ Saved ${account.currency} ${Math.abs(finalAmount)} to ${targetAccountName}`,
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook Error:", err);
    return NextResponse.json({ ok: false });
  }
}

async function sendTelegramMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
