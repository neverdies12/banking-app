import pg from "pg";
import "dotenv/config";

// Keep DATE columns as plain "YYYY-MM-DD" strings instead of pg's default
// JS Date conversion, which shifts the day depending on server timezone.
pg.types.setTypeParser(1082, (val) => val);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
});
