import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PORT = Number(process.env.PORT) || 5050;
export const HOST = process.env.HOST || '0.0.0.0';
export const JWT_SECRET = process.env.JWT_SECRET || 'incredible_x_tech_secret_key_2026';
export const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../data/incredible.db');
export const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');

