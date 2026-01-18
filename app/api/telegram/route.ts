import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// 1. Define your Tag Mapping here
// key = the tag you type (lowercase), value = exact Account Name in DB
const TAG_MAP: Record<string, string> = {
  "@revolut": "Revolut Main",
  "@klarna": "Klarna",
  "@nubankcc": "Nubank Card",
  "@nubank": "Nubank Checking",
  "@tf": "TF Bank Card",
  // You can add aliases too
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

    // 2. Parse Amount (Start of string)
    // Matches: "10", "10.50", "-10", "1,200.50"
    const amountMatch = originalText.match(/^(-?[\d,]+(\.\d{1,2})?)/);

    if (!amountMatch) {
      await sendTelegramMessage(
        chatId,
        "❌ Format: Amount Description @tag\nExample: '100 Sneakers @klarna'"
      );
      return NextResponse.json({ ok: true });
    }

    let rawAmount = parseFloat(amountMatch[0].replace(/,/g, ""));

    // 3. Extract Tags and Description
    // Remove the amount from the text
    let textWithoutAmount = originalText.replace(amountMatch[0], "").trim();

    // Find tags (words starting with @)
    const words = textWithoutAmount.split(/\s+/);
    const tags = words.filter((w) => w.startsWith("@"));
    const descriptionWords = words.filter((w) => !w.startsWith("@"));
    const description = descriptionWords.join(" ");

    // 4. Determine Target Account
    let targetAccountName = "Revolut Main"; // Default
    let usedTag = "Default";

    if (tags.length > 0) {
      const tag = tags[0].toLowerCase();
      if (TAG_MAP[tag]) {
        targetAccountName = TAG_MAP[tag];
        usedTag = tag;
      } else {
        await sendTelegramMessage(
          chatId,
          `⚠️ Unknown tag '${tag}'. Saving to Revolut Main.`
        );
      }
    }

    // 5. Fetch Account ID and Currency from DB
    const { data: account } = await supabase
      .from("accounts")
      .select("id, currency")
      .eq("name", targetAccountName)
      .single();

    if (!account) {
      await sendTelegramMessage(
        chatId,
        `❌ Error: Account '${targetAccountName}' not found in DB.`
      );
      return NextResponse.json({ ok: true });
    }

    // 6. Logic: Expense vs Income
    // If you type "100", it's spending (-100).
    // If you type "-100", it's income/refund (+100) -> Wait, usually manual entry is spending.
    // Let's stick to: Positive numbers in chat = Expense (stored as Negative).
    // To record Income, type "-100" (stored as Positive).
    const finalAmount = rawAmount > 0 ? -rawAmount : Math.abs(rawAmount);

    // 7. Save to Database
    const { error } = await supabase.from("transactions").insert({
      account_id: account.id,
      date: new Date().toISOString(),
      amount: finalAmount,
      description: description || "Manual Entry",
      category: "Manual Entry",
      is_manual: true,
      original_currency: account.currency,
    });

    if (error) {
      console.error("Supabase Error:", error);
      await sendTelegramMessage(chatId, "❌ Database Error.");
    } else {
      await sendTelegramMessage(
        chatId,
        `✅ Saved ${account.currency} ${Math.abs(
          finalAmount
        )} to ${targetAccountName}`
      );
    }

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
