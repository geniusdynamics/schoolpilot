// ABOUTME: Ajv-based runtime validation for the DR-01 JSON Schema implementation.
// ABOUTME: Adds the date, date-time and uuid formats that Ajv does not ship by itself.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv, { type ValidateFunction } from 'ajv';

const here = path.dirname(fileURLToPath(import.meta.url));
const document = JSON.parse(fs.readFileSync(path.join(here, 'entity.schema.json'), 'utf8'));

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const dateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/;

function isCalendarDate(value: string): boolean {
  const match = datePattern.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isDateTime(value: string): boolean {
  if (!dateTimePattern.test(value)) return false;
  return isCalendarDate(value.slice(0, 10)) && !Number.isNaN(Date.parse(value));
}

export const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addFormat('uuid', { validate: (value: string) => uuidPattern.test(value) });
ajv.addFormat('date', { validate: (value: string) => isCalendarDate(value) });
ajv.addFormat('date-time', { validate: (value: string) => isDateTime(value) });

export const validateLearner: ValidateFunction = ajv.compile(document.definitions.learner);
export const validateEnrolment: ValidateFunction = ajv.compile(document.definitions.enrolment);
