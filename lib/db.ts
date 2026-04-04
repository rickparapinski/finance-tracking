import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var _sql: ReturnType<typeof postgres> | undefined;
}

export const sql = globalThis._sql ?? postgres(process.env.DATABASE_URL!, {
  ssl: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  types: {
    date: {
      to: 1082,
      from: [1082],
      serialize: (x: string) => x,
      parse: (x: string) => x, // return dates as YYYY-MM-DD strings, same as Supabase did
    },
  },
});

if (process.env.NODE_ENV !== "production") {
  globalThis._sql = sql;
}
