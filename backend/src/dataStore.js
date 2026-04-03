import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');

const readJson = async (filename) => {
  const fullPath = path.join(dataDir, filename);
  const raw = await fs.readFile(fullPath, 'utf-8');
  return JSON.parse(raw);
};

const writeJson = async (filename, data) => {
  const fullPath = path.join(dataDir, filename);
  await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
};

export const getActivities = async () => readJson('activities.json');
export const getHazards = async () => readJson('hazards.json');
export const getMappings = async () => readJson('activityHazardMappings.json');
export const saveActivities = async (activities) => writeJson('activities.json', activities);
export const saveHazards = async (hazards) => writeJson('hazards.json', hazards);
export const saveMappings = async (mappings) => writeJson('activityHazardMappings.json', mappings);
