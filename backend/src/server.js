import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getActivities, getHazards, getMappings, saveActivities } from './dataStore.js';

const app = express();
const port = process.env.PORT || 4000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/activities', async (_req, res) => {
  const activities = await getActivities();
  res.json(activities);
});

const makeId = (prefix) => `${prefix}-${Date.now()}`;

app.post('/api/activities', async (req, res) => {
  const { name } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Activity name is required.' });
  }

  const activities = await getActivities();
  const newActivity = {
    id: makeId('act'),
    name: String(name).trim(),
    subActivities: []
  };

  activities.push(newActivity);
  await saveActivities(activities);
  return res.status(201).json(newActivity);
});

app.post('/api/activities/:activityId/sub-activities', async (req, res) => {
  const { activityId } = req.params;
  const { name } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Sub-activity name is required.' });
  }

  const activities = await getActivities();
  const activity = activities.find((item) => item.id === activityId);

  if (!activity) {
    return res.status(404).json({ message: 'Activity not found.' });
  }

  const newSubActivity = {
    id: makeId('sub'),
    name: String(name).trim()
  };

  activity.subActivities.push(newSubActivity);
  await saveActivities(activities);
  return res.status(201).json(newSubActivity);
});

app.get('/api/hazards', async (_req, res) => {
  const hazards = await getHazards();
  res.json(hazards);
});

app.get('/api/mappings', async (_req, res) => {
  const mappings = await getMappings();
  res.json(mappings);
});

app.get('/api/ra-template', async (req, res) => {
  const { activityId, subActivityId } = req.query;

  if (!activityId || !subActivityId) {
    return res.status(400).json({ message: 'activityId and subActivityId are required.' });
  }

  const [activities, hazards, mappings] = await Promise.all([
    getActivities(),
    getHazards(),
    getMappings()
  ]);

  const activity = activities.find((item) => item.id === activityId);
  const subActivity = activity?.subActivities.find((item) => item.id === subActivityId);

  if (!activity || !subActivity) {
    return res.status(404).json({ message: 'Activity or sub-activity not found.' });
  }

  const matchedMappings = mappings.filter(
    (item) => item.activityId === activityId && item.subActivityId === subActivityId
  );

  const hazardsForRa = matchedMappings
    .map((mapping) => {
      const hazard = hazards.find((h) => h.id === mapping.hazardId);
      if (!hazard) return null;

      return {
        mappingId: mapping.id,
        hazardId: hazard.id,
        hazardName: hazard.name,
        hazardDescription: hazard.description,
        consequences: hazard.consequences,
        existingControls: hazard.existingControls,
        additionalControls: '',
        likelihood: 1,
        severity: 1,
        rpn: 1,
        residualLikelihood: 1,
        residualSeverity: 1,
        residualRpn: 1
      };
    })
    .filter(Boolean);

  return res.json({
    activity,
    subActivity,
    rows: hazardsForRa
  });
});

app.use(express.static(frontendDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(port, () => {
  console.log(`RA Generator API listening on port ${port}`);
});
