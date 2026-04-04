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
          // 1. Safety Checks
          if (!row["Started Date"] || !row["Amount"]) return;

          // 2. Filter: Only Completed transactions
          if (row["State"] !== "COMPLETED") return;

          // 3. Skip internal vaults if needed
          if (row["Type"] === "VAULT") return;

          // 4. Parse Date
          const datePart = row["Started Date"].split(" ")[0];

          // 5. Map fields
          const amount = parseFloat(row["Amount"]) - parseFloat(row["Fee"] || "0");
          if (amount === 0) return; // skip zero-amount rows (e.g. fee-only charges with Amount=0)

          transactions.push({
            date: datePart,
            amount,
            description: row["Description"],
            currency: row["Currency"],
            category: "",
          });
        });

        resolve(transactions);
      },
      error: (err) => reject(err),
    });
  });
};
