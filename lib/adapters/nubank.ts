import Papa from "papaparse";
import { NormalizedTransaction } from "./types";

export const parseNubank = (file: File): Promise<NormalizedTransaction[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const transactions: NormalizedTransaction[] = [];
        const rows = results.data as any[];

        // DETECT FILE TYPE BASED ON HEADERS
        // Checking Account has "Data" (Portuguese)
        // Credit Card has "date" (English/ISO)
        const isChecking = rows[0] && "Data" in rows[0];

        rows.forEach((row) => {
          let dateStr = "";
          let amount = 0;
          let description = "";
          let category = "Uncategorized";

          if (isChecking) {
            // === LOGIC FOR CHECKING ACCOUNT ===
            // Header: Data, Valor, Identificador, Descrição
            if (!row["Data"] || !row["Valor"]) return;

            // 1. Fix Date: "09/12/2025" -> "2025-12-09"
            const [day, month, year] = row["Data"].split("/");
            dateStr = `${year}-${month}-${day}`;

            // 2. Amount: Keep as is (Negative is already expense)
            amount = parseFloat(row["Valor"]);

            description = row["Descrição"];
            category = "Checking"; // Nubank checking CSV doesn't have categories usually
          } else {
            // === LOGIC FOR CREDIT CARD ===
            // Header: date, title, amount
            if (!row["date"] || !row["amount"]) return;

            // 1. Date is already ISO "2026-01-02"
            dateStr = row["date"];

            // 2. Amount: Nubank Card exports positive numbers for spending.
            // We need to INVERT them for our DB (Expense = Negative).
            // Example: 119.90 (Steam) -> becomes -119.90
            // Example: -818.87 (Payment Received) -> becomes +818.87
            amount = parseFloat(row["amount"]) * -1;

            description = row["title"];
            category = row["category"] || "Credit Card";
          }

          transactions.push({
            date: dateStr,
            amount: amount,
            description: description,
            currency: "BRL",
            category: category,
          });
        });

        resolve(transactions);
      },
      error: (err) => reject(err),
    });
  });
};
