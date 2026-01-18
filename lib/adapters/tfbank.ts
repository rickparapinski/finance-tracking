"use server";

import { NormalizedTransaction } from "./types";

export async function parseTFBank(
  formData: FormData
): Promise<NormalizedTransaction[]> {
  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file provided");
  }

  // Convert File to Uint8Array (not Buffer!)
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Get the PDFParse class from the module
  const { PDFParse } = require("pdf-parse");

  // Instantiate with Uint8Array
  const pdfParser = new PDFParse(uint8Array);

  // Get text using the getText method
  const textResult = await pdfParser.getText();
  const text = textResult.text;

  const transactions: NormalizedTransaction[] = [];

  // Split text into lines for easier processing
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Look for lines starting with a 10-digit ID
    const idMatch = line.match(/^(\d{10})\s+(\d{2}\.\d{2}\.\d{4})\s+(.+)$/);

    if (idMatch) {
      const [_, id, postingDate, restOfLine] = idMatch;

      // The next few lines contain: Wechselkurs line, then amount line
      let descriptionParts = [restOfLine];
      let amountLine = null;
      let j = i + 1;

      // Look ahead for the amount line (contains EUR and D or C at the end)
      while (j < lines.length && j < i + 5) {
        const nextLine = lines[j].trim();

        // Check if this is the amount line (ends with D or C)
        if (
          nextLine.match(
            /^([\d\s]+\.?\d{2})\s+EUR\s+(-?[\d\s]+\.?\d{2})\s+([CD])$/
          )
        ) {
          amountLine = nextLine;
          break;
        }

        // Skip the "Wechselkurs" line
        if (!nextLine.startsWith("Wechselkurs")) {
          descriptionParts.push(nextLine);
        }

        j++;
      }

      if (amountLine) {
        const amountMatch = amountLine.match(
          /^([\d\s]+\.?\d{2})\s+EUR\s+(-?[\d\s]+\.?\d{2})\s+([CD])$/
        );

        if (amountMatch) {
          const [_, transAmount, accountAmount, type] = amountMatch;

          // Parse Date
          const [day, month, year] = postingDate.split(".");
          const date = `${year}-${month}-${day}`;

          // Parse Amount
          const cleanAmountString = accountAmount.replace(/\s/g, "");
          let amount = parseFloat(cleanAmountString);

          // Ensure correct sign
          if (type === "C") {
            amount = Math.abs(amount);
          } else if (type === "D") {
            amount = -Math.abs(amount);
          }

          // Clean Description
          let description = descriptionParts
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

          // Remove the date at the beginning if it exists (transaction date)
          description = description.replace(/^\d{2}\.\d{2}\.\d{4}\s+/, "");

          transactions.push({
            date,
            amount,
            description,
            currency: "EUR",
            category: "Uncategorized",
          });
        }
      }

      // Skip the lines we've already processed
      i = j;
    }
  }

  console.log(`Found ${transactions.length} transactions`);

  return transactions;
}
