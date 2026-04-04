import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { dbService } from './db.js';

const app = express();
const port = process.env.PORT || 4000;
const tokenSecret = process.env.TOKEN_SECRET || 'dev-only-change-this-secret';
const tokenTtlSeconds = 60 * 60 * 8;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

app.use(cors());
app.use(express.json());

const toBase64Url = (input) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const fromBase64Url = (input) => {
  const padded = input + '='.repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
};

const signTokenPayload = (payload) => {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const signature = crypto
    .createHmac('sha256', tokenSecret)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `${data}.${signature}`;
};

const verifyToken = (token) => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', tokenSecret)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  if (expectedSignature !== signature) return null;

  try {
    const payload = JSON.parse(fromBase64Url(body));
    if (!payload?.sub || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
};

const sanitizeUser = (user) => {
  const { password, ...safe } = user;
  return safe;
};

const authRequired = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized.' });

  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return res.status(401).json({ message: 'Invalid or expired token.' });

  const user = dbService.findUserById(payload.sub);
  if (!user) return res.status(401).json({ message: 'User not found.' });

  req.user = user;
  return next();
};

const adminRequired = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
  return next();
};

const permissionRequired = (key) => (req, res, next) => {
  if (req.user.role === 'admin') return next();
  if (!req.user.permissions?.[key]) {
    return res.status(403).json({ message: `Permission denied: ${key}` });
  }
  return next();
};

app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: 'sqlite' }));

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

  const user = dbService.findUserByCredentials(email, password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

  const now = Math.floor(Date.now() / 1000);
  const token = signTokenPayload({ sub: user.id, role: user.role, companyId: user.companyId, exp: now + tokenTtlSeconds });
  return res.json({ token, user: sanitizeUser(user), expiresIn: tokenTtlSeconds });
});

app.get('/api/auth/me', authRequired, (req, res) => res.json(sanitizeUser(req.user)));

app.get('/api/users', authRequired, adminRequired, (req, res) => {
  const users = dbService.listUsersByCompany(req.user.companyId).map(sanitizeUser);
  res.json(users);
});

app.post('/api/users', authRequired, adminRequired, (req, res) => {
  const { name, email, password, departmentId, departmentName } = req.body;
  if (!name || !email || !password || !departmentId || !departmentName) {
    return res.status(400).json({ message: 'name, email, password, departmentId and departmentName are required.' });
  }
  const created = dbService.createUser(req.user, req.body);
  return res.status(201).json(sanitizeUser(created));
});

app.put('/api/users/:userId/department-access', authRequired, adminRequired, (req, res) => {
  const { allowedDepartmentIds } = req.body;
  if (!Array.isArray(allowedDepartmentIds)) {
    return res.status(400).json({ message: 'allowedDepartmentIds must be an array.' });
  }

  const updated = dbService.updateUserDepartmentAccess(req.params.userId, req.user.companyId, [...new Set(allowedDepartmentIds)]);
  if (!updated) return res.status(404).json({ message: 'User not found in your company.' });
  return res.json(sanitizeUser(updated));
});

app.put('/api/users/:userId', authRequired, adminRequired, (req, res) => {
  const updated = dbService.updateUser(req.params.userId, req.user.companyId, req.body);
  if (!updated) return res.status(404).json({ message: 'User not found in your company.' });
  return res.json(sanitizeUser(updated));
});

app.use('/api', authRequired);

app.get('/api/activities', (_req, res) => res.json(dbService.getActivities()));
app.post('/api/activities', permissionRequired('canEditActivities'), (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Activity name is required.' });
  return res.status(201).json(dbService.createActivity(name));
});

app.post('/api/activities/:activityId/sub-activities', permissionRequired('canEditActivities'), (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Sub-activity name is required.' });
  const created = dbService.createSubActivity(req.params.activityId, name);
  if (!created) return res.status(404).json({ message: 'Activity not found.' });
  return res.status(201).json(created);
});

app.delete('/api/activities/:activityId/sub-activities/:subActivityId', permissionRequired('canEditActivities'), (req, res) => {
  const ok = dbService.removeSubActivity(req.params.activityId, req.params.subActivityId);
  if (!ok) return res.status(404).json({ message: 'Sub-activity not found.' });
  return res.status(204).send();
});

app.put('/api/activities/:activityId', permissionRequired('canEditActivities'), (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Activity name is required.' });
  const updated = dbService.updateActivity(req.params.activityId, name);
  if (!updated) return res.status(404).json({ message: 'Activity not found.' });
  return res.json(updated);
});

app.put('/api/activities/:activityId/sub-activities/:subActivityId', permissionRequired('canEditActivities'), (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Sub-activity name is required.' });
  const updated = dbService.updateSubActivity(req.params.activityId, req.params.subActivityId, name);
  if (!updated) return res.status(404).json({ message: 'Sub-activity not found.' });
  return res.json(updated);
});

app.get('/api/hazards', (_req, res) => res.json(dbService.getHazards()));
app.post('/api/hazards', permissionRequired('canEditHazards'), (req, res) => {
  const payload = req.body;
  if (!payload.name || !payload.description || !payload.consequences || !payload.existingControls) {
    return res.status(400).json({ message: 'All hazard fields are required.' });
  }
  return res.status(201).json(dbService.createHazard({ ...payload, likelihood: Number(payload.likelihood), severity: Number(payload.severity) }));
});
app.put('/api/hazards/:hazardId', permissionRequired('canEditHazards'), (req, res) => {
  const payload = req.body;
  const updated = dbService.updateHazard(req.params.hazardId, { ...payload, likelihood: Number(payload.likelihood), severity: Number(payload.severity) });
  if (!updated) return res.status(404).json({ message: 'Hazard not found.' });
  return res.json(updated);
});

app.get('/api/mappings', (_req, res) => res.json(dbService.getMappings()));
app.put('/api/mappings/:activityId/:subActivityId', permissionRequired('canEditMappings'), (req, res) => {
  const hazardIds = Array.isArray(req.body.hazardIds) ? [...new Set(req.body.hazardIds)] : null;
  if (!hazardIds) return res.status(400).json({ message: 'hazardIds must be an array.' });
  return res.json(dbService.replaceMappings(req.params.activityId, req.params.subActivityId, hazardIds));
});

app.get('/api/ra-template', (req, res) => {
  const { activityId, subActivityId } = req.query;
  if (!activityId || !subActivityId) {
    return res.status(400).json({ message: 'activityId and subActivityId are required.' });
  }

  const template = dbService.getRaTemplate(activityId, subActivityId);
  if (!template) return res.status(404).json({ message: 'Activity or sub-activity not found.' });
  return res.json(template);
});

app.get('/api/risk-assessments', (req, res) => {
  res.json(dbService.listRiskAssessmentsForUser(req.user));
});

app.post('/api/risk-assessments', (req, res) => {
  const { title, subActivities } = req.body;
  if (!title || !Array.isArray(subActivities) || subActivities.length === 0) {
    return res.status(400).json({ message: 'title and subActivities are required.' });
  }

  const created = dbService.createRiskAssessment(req.user, req.body);
  return res.status(201).json(created);
});

app.post('/api/ai/generate-ra', permissionRequired('canUseAIGenerator'), async (req, res) => {
  const { activityName, jobScope } = req.body;
  if (!jobScope) return res.status(400).json({ message: 'jobScope is required.' });

  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
  const prompt = `Generate a risk assessment in strict JSON format for this job scope.
Activity: ${activityName || 'General'}
Job Scope: ${jobScope}
Return JSON only in this shape:
{"title":"","rows":[{"hazardName":"","hazardDescription":"","consequences":"","existingControls":"","additionalControls":"","likelihood":1,"severity":1,"residualLikelihood":1,"residualSeverity":1}]}`;
  try {
    const response = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OLLAMA_MODEL || 'llama3.1', prompt, stream: false })
    });

    if (!response.ok) {
      return res.status(502).json({ message: 'Failed to connect to Ollama.' });
    }

    const payload = await response.json();
    const text = payload.response || '{}';
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

    const rows = (parsed.rows || []).map((row, index) => {
      const likelihood = Number(row.likelihood) || 1;
      const severity = Number(row.severity) || 1;
      const residualLikelihood = Number(row.residualLikelihood) || 1;
      const residualSeverity = Number(row.residualSeverity) || 1;
      return {
        mappingId: dbService.makeId(`ai-${index}`),
        hazardId: null,
        hazardName: row.hazardName || 'AI Hazard',
        hazardDescription: row.hazardDescription || '',
        consequences: row.consequences || '',
        existingControls: row.existingControls || '',
        additionalControls: row.additionalControls || '',
        likelihood,
        severity,
        rpn: likelihood * severity,
        residualLikelihood,
        residualSeverity,
        residualRpn: residualLikelihood * residualSeverity
      };
    });

    return res.json({ title: parsed.title || `AI RA - ${activityName || 'General'}`, rows });
  } catch {
    return res.status(500).json({ message: 'Unable to generate AI RA response.' });
  }
});

app.use(express.static(frontendDist));
app.get('*', (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));

app.listen(port, () => {
  console.log(`RA Generator API listening on port ${port} (SQLite backend)`);
});
