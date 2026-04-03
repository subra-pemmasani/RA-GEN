import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getActivities,
  getHazards,
  getMappings,
  saveActivities,
  saveHazards,
  saveMappings
} from './dataStore.js';

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

const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

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

app.put('/api/activities/:activityId', async (req, res) => {
  const { activityId } = req.params;
  const { name } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Activity name is required.' });
  }

  const activities = await getActivities();
  const activity = activities.find((item) => item.id === activityId);

  if (!activity) {
    return res.status(404).json({ message: 'Activity not found.' });
  }

  activity.name = String(name).trim();
  await saveActivities(activities);
  return res.json(activity);
});

app.put('/api/activities/:activityId/sub-activities/:subActivityId', async (req, res) => {
  const { activityId, subActivityId } = req.params;
  const { name } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Sub-activity name is required.' });
  }

  const activities = await getActivities();
  const activity = activities.find((item) => item.id === activityId);

  if (!activity) {
    return res.status(404).json({ message: 'Activity not found.' });
  }

  const subActivity = activity.subActivities.find((item) => item.id === subActivityId);

  if (!subActivity) {
    return res.status(404).json({ message: 'Sub-activity not found.' });
  }

  subActivity.name = String(name).trim();
  await saveActivities(activities);
  return res.json(subActivity);
});

app.get('/api/hazards', async (_req, res) => {
  const hazards = await getHazards();
  res.json(hazards);
});

app.post('/api/hazards', async (req, res) => {
  const { name, description, consequences, existingControls, likelihood, severity } = req.body;

  if (!name || !description || !consequences || !existingControls) {
    return res.status(400).json({ message: 'All hazard fields are required.' });
  }

  const normalizedLikelihood = Number(likelihood);
  const normalizedSeverity = Number(severity);
  if (
    Number.isNaN(normalizedLikelihood) ||
    Number.isNaN(normalizedSeverity) ||
    normalizedLikelihood < 1 ||
    normalizedLikelihood > 5 ||
    normalizedSeverity < 1 ||
    normalizedSeverity > 5
  ) {
    return res.status(400).json({ message: 'Likelihood and severity must be between 1 and 5.' });
  }

  const hazards = await getHazards();
  const newHazard = {
    id: makeId('haz'),
    name: String(name).trim(),
    description: String(description).trim(),
    consequences: String(consequences).trim(),
    existingControls: String(existingControls).trim(),
    likelihood: normalizedLikelihood,
    severity: normalizedSeverity
  };
  hazards.push(newHazard);
  await saveHazards(hazards);
  return res.status(201).json(newHazard);
});

app.put('/api/hazards/:hazardId', async (req, res) => {
  const { hazardId } = req.params;
  const { name, description, consequences, existingControls, likelihood, severity } = req.body;

  if (!name || !description || !consequences || !existingControls) {
    return res.status(400).json({ message: 'All hazard fields are required.' });
  }

  const normalizedLikelihood = Number(likelihood);
  const normalizedSeverity = Number(severity);
  if (
    Number.isNaN(normalizedLikelihood) ||
    Number.isNaN(normalizedSeverity) ||
    normalizedLikelihood < 1 ||
    normalizedLikelihood > 5 ||
    normalizedSeverity < 1 ||
    normalizedSeverity > 5
  ) {
    return res.status(400).json({ message: 'Likelihood and severity must be between 1 and 5.' });
  }

  const hazards = await getHazards();
  const hazard = hazards.find((item) => item.id === hazardId);
  if (!hazard) {
    return res.status(404).json({ message: 'Hazard not found.' });
  }

  hazard.name = String(name).trim();
  hazard.description = String(description).trim();
  hazard.consequences = String(consequences).trim();
  hazard.existingControls = String(existingControls).trim();
  hazard.likelihood = normalizedLikelihood;
  hazard.severity = normalizedSeverity;

  await saveHazards(hazards);
  return res.json(hazard);
});

app.get('/api/mappings', async (_req, res) => {
  const mappings = await getMappings();
  res.json(mappings);
});

app.put('/api/mappings/:activityId/:subActivityId', async (req, res) => {
  const { activityId, subActivityId } = req.params;
  const { hazardIds } = req.body;

  if (!Array.isArray(hazardIds)) {
    return res.status(400).json({ message: 'hazardIds must be an array.' });
  }

  const uniqueHazardIds = [...new Set(hazardIds)];

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

  const allValidHazards = uniqueHazardIds.every((hazardId) =>
    hazards.some((hazard) => hazard.id === hazardId)
  );

  if (!allValidHazards) {
    return res.status(400).json({ message: 'One or more hazardIds are invalid.' });
  }

  const remainingMappings = mappings.filter(
    (item) => !(item.activityId === activityId && item.subActivityId === subActivityId)
  );

  const newMappings = uniqueHazardIds.map((hazardId) => ({
    id: makeId('map'),
    activityId,
    subActivityId,
    hazardId
  }));

  const updatedMappings = [...remainingMappings, ...newMappings];
  await saveMappings(updatedMappings);
  return res.json(newMappings);
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
        likelihood: Number(hazard.likelihood) || 1,
        severity: Number(hazard.severity) || 1,
        rpn: (Number(hazard.likelihood) || 1) * (Number(hazard.severity) || 1),
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
