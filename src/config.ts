import dotenv from "dotenv";
import path from "path";

const ROOT_DIR = process.cwd();
dotenv.config({path: path.join(ROOT_DIR, ".env")});
/* Telegram */
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const ADMIN_CHAT = process.env.ADMIN_CHAT || "";
/* PostgreSQL */
const DB_USER = process.env.DB_USER || "";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "";
const DB_HOST = process.env.DB_HOST || "";
const DB_PORT = Number(process.env.DB_PORT);

export default { ADMIN_CHAT, BOT_TOKEN, DB_USER, DB_PASSWORD, DB_NAME, DB_HOST, DB_PORT };