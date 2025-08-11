// ABOUTME: Configuration parameters for database connections
// ABOUTME: Includes connection pooling and transaction settings

import dotenv from 'dotenv';
dotenv.config();

export const akademicoConfig = {
  host: process.env.AKADEMICO_HOST || 'localhost',
  port: Number(process.env.AKADEMICO_PORT) || 5432,
  user: process.env.AKADEMICO_USER || 'root',
  password: process.env.AKADEMICO_PASSWORD || '',
  database: process.env.AKADEMICO_DB || 'akademico',
  max: 10, // max pool connections
  idleTimeoutMillis: 30000
};

export const schoolPilotConfig = {
  host: process.env.SCHOOLPILOT_HOST || 'localhost',
  port: Number(process.env.SCHOOLPILOT_PORT) || 3306,
  user: process.env.SCHOOLPILOT_USER || 'root',
  password: process.env.SCHOOLPILOT_PASSWORD || '',
  database: process.env.SCHOOLPILOT_DB || 'schoolpilot',
  connectionLimit: 10, // max pool connections
  connectTimeout: 10000
};
