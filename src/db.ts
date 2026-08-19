import { Pool, types } from "pg";
import dotenv from "dotenv";

dotenv.config();

types.setTypeParser(1700, (value) => parseFloat(value)); // NUMERIC -> number

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
