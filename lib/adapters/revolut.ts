import Papa from "papaparse";
import { NormalizedTransaction } from "./types";

export const parseRevolut = (file: File): Promise<NormalizedTransaction[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const transactions: NormalizedTransaction[] = [];

        results.data.forEach((row: any) => {
          // 1. Safety Checks based on your CSV structure
          if (!row["Started Date"] || !row["Amount"]) return;

          // 2. Filter: Only Completed transactions
          if (row["State"] !== "COMPLETED") return;

          // 3. Optional: Skip internal vaults if they appear in your full export
          // (Your snippet didn't show them, but standard Revolut exports often have Type='VAULT')
          if (row["Type"] === "VAULT") return;

          // 4. Parse Date: "2025-12-01 02:12:07" -> "2025-12-01"
          const datePart = row["Started Date"].split(" ")[0];

          // 5. Map fields
          transactions.push({
            date: datePart,
            amount: parseFloat(row["Amount"]),
            description: row["Description"],
            currency: row["Currency"],
            category: "Uncategorized",
          });
        });

        resolve(transactions);
      },
      error: (err) => reject(err),
    });
  });
};
