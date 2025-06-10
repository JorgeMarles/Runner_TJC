import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || "8080";
export const ROOT_DIR = process.env.ROOT_DIR || "./";
export const RABBITMQ_USERNAME = process.env.RABBITMQ_USERNAME || "";
export const RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || "";
export const RABBITMQ_HOST = process.env.RABBITMQ_HOST || "";
export const RABBITMQ_PORT = process.env.RABBITMQ_PORT || "";
export const CONSUL_URL = process.env.CONSUL_URL || "";
export const CONSUL_SERVICE_NAME = process.env.CONSUL_SERVICE_NAME || "";