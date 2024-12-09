import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || "8080";
export const ROOT_DIR = process.env.ROOT_DIR || "./";