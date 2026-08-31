import { Pool, types } from "pg";
import dotenv from "dotenv";
import path from "path";
import { app } from "electron";

const caminhoEnv = app.isPackaged
  ? path.join(path.dirname(process.execPath), ".env")
  : undefined;

dotenv.config(caminhoEnv ? { path: caminhoEnv } : undefined);

types.setTypeParser(1700, (value) => parseFloat(value)); // NUMERIC -> number

const exigeSSL = /sslmode=require|sslmode=verify-full/.test(
  process.env.DATABASE_URL ?? "",
);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: exigeSSL ? { rejectUnauthorized: false } : undefined,
});
