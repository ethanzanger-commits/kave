import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
export default { dialect: "postgresql", schema: "./schema.js", dbCredentials: { url: process.env.DATABASE_URL } };
