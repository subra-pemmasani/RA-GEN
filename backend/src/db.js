import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');
const dbPath = path.join(dataDir, 'ra_gen.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  department_id TEXT NOT NULL,
  department_name TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  allowed_department_ids TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sub_activities (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hazards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  consequences TEXT NOT NULL,
  existing_controls TEXT NOT NULL,
  likelihood INTEGER NOT NULL,
  severity INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mappings (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  sub_activity_id TEXT NOT NULL,
  hazard_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_assessments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  department_id TEXT NOT NULL,
  department_name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  title TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  activity_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_assessment_sections (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  sub_activity_id TEXT NOT NULL,
  sub_activity_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_assessment_rows (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  mapping_id TEXT,
  hazard_id TEXT,
  hazard_name TEXT,
  hazard_description TEXT,
  consequences TEXT,
  existing_controls TEXT,
  additional_controls TEXT,
  likelihood INTEGER,
  severity INTEGER,
  rpn INTEGER,
  residual_likelihood INTEGER,
  residual_severity INTEGER,
  residual_rpn INTEGER
);
`);

const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const seedIfEmpty = () => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return;

  const users = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf-8'));
  const activities = JSON.parse(fs.readFileSync(path.join(dataDir, 'activities.json'), 'utf-8'));
  const hazards = JSON.parse(fs.readFileSync(path.join(dataDir, 'hazards.json'), 'utf-8'));
  const mappings = JSON.parse(fs.readFileSync(path.join(dataDir, 'activityHazardMappings.json'), 'utf-8'));

  const insertUser = db.prepare(`INSERT INTO users VALUES (@id,@company_id,@company_name,@department_id,@department_name,@name,@email,@password,@role,@allowed_department_ids,@permissions)`);
  const insertActivity = db.prepare('INSERT INTO activities VALUES (@id,@name)');
  const insertSub = db.prepare('INSERT INTO sub_activities VALUES (@id,@activity_id,@name)');
  const insertHazard = db.prepare('INSERT INTO hazards VALUES (@id,@name,@description,@consequences,@existing_controls,@likelihood,@severity)');
  const insertMapping = db.prepare('INSERT INTO mappings VALUES (@id,@activity_id,@sub_activity_id,@hazard_id)');

  const tx = db.transaction(() => {
    users.forEach((user) => insertUser.run({
      id: user.id,
      company_id: user.companyId,
      company_name: user.companyName,
      department_id: user.departmentId,
      department_name: user.departmentName,
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      allowed_department_ids: JSON.stringify(user.allowedDepartmentIds || [user.departmentId]),
      permissions: JSON.stringify(user.permissions || {})
    }));

    activities.forEach((activity) => {
      insertActivity.run({ id: activity.id, name: activity.name });
      (activity.subActivities || []).forEach((sub) => {
        insertSub.run({ id: sub.id, activity_id: activity.id, name: sub.name });
      });
    });

    hazards.forEach((hazard) => insertHazard.run({
      id: hazard.id,
      name: hazard.name,
      description: hazard.description,
      consequences: hazard.consequences,
      existing_controls: hazard.existingControls,
      likelihood: Number(hazard.likelihood) || 1,
      severity: Number(hazard.severity) || 1
    }));

    mappings.forEach((mapping) => insertMapping.run({
      id: mapping.id,
      activity_id: mapping.activityId,
      sub_activity_id: mapping.subActivityId,
      hazard_id: mapping.hazardId
    }));
  });

  tx();
};

seedIfEmpty();

const userColumns = db.prepare("PRAGMA table_info('users')").all();
if (!userColumns.some((column) => column.name === 'permissions')) {
  db.exec("ALTER TABLE users ADD COLUMN permissions TEXT NOT NULL DEFAULT '{}'");
}

const parseUser = (row) => ({
  id: row.id,
  companyId: row.company_id,
  companyName: row.company_name,
  departmentId: row.department_id,
  departmentName: row.department_name,
  name: row.name,
  email: row.email,
  password: row.password,
  role: row.role,
  allowedDepartmentIds: JSON.parse(row.allowed_department_ids),
  permissions: {
    canEditActivities: true,
    canEditHazards: true,
    canEditMappings: true,
    canEditUsers: row.role === 'admin',
    canEditRiskRegister: true,
    canCustomizeRA: true,
    canUseAIGenerator: true,
    ...(row.permissions ? JSON.parse(row.permissions) : {})
  }
});

export const dbService = {
  makeId,
  findUserByCredentials(email, password) {
    const row = db.prepare('SELECT * FROM users WHERE lower(email)=lower(?) AND password=?').get(email, password);
    return row ? parseUser(row) : null;
  },
  findUserById(id) {
    const row = db.prepare('SELECT * FROM users WHERE id=?').get(id);
    return row ? parseUser(row) : null;
  },
  listUsersByCompany(companyId) {
    return db.prepare('SELECT * FROM users WHERE company_id=?').all(companyId).map(parseUser);
  },
  updateUserDepartmentAccess(userId, companyId, allowedDepartmentIds) {
    const existing = db.prepare('SELECT * FROM users WHERE id=? AND company_id=?').get(userId, companyId);
    if (!existing) return null;
    db.prepare('UPDATE users SET allowed_department_ids=? WHERE id=?').run(JSON.stringify(allowedDepartmentIds), userId);
    return this.findUserById(userId);
  },
  createUser(companyAdmin, payload) {
    const id = makeId('usr');
    db.prepare('INSERT INTO users (id,company_id,company_name,department_id,department_name,name,email,password,role,allowed_department_ids,permissions) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
      id,
      companyAdmin.companyId,
      companyAdmin.companyName,
      payload.departmentId,
      payload.departmentName,
      payload.name,
      payload.email,
      payload.password,
      payload.role || 'user',
      JSON.stringify(payload.allowedDepartmentIds || [payload.departmentId]),
      JSON.stringify(payload.permissions || {})
    );
    return this.findUserById(id);
  },
  updateUser(userId, companyId, payload) {
    const existing = db.prepare('SELECT * FROM users WHERE id=? AND company_id=?').get(userId, companyId);
    if (!existing) return null;
    db.prepare(`UPDATE users SET
      name=?,
      email=?,
      department_id=?,
      department_name=?,
      role=?,
      allowed_department_ids=?,
      permissions=?,
      password=?
      WHERE id=?`).run(
      payload.name || existing.name,
      payload.email || existing.email,
      payload.departmentId || existing.department_id,
      payload.departmentName || existing.department_name,
      payload.role || existing.role,
      JSON.stringify(payload.allowedDepartmentIds || JSON.parse(existing.allowed_department_ids)),
      JSON.stringify(payload.permissions || (existing.permissions ? JSON.parse(existing.permissions) : {})),
      payload.password || existing.password,
      userId
    );
    return this.findUserById(userId);
  },
  getActivities() {
    const activities = db.prepare('SELECT * FROM activities').all();
    const subs = db.prepare('SELECT * FROM sub_activities').all();
    return activities.map((activity) => ({
      id: activity.id,
      name: activity.name,
      subActivities: subs.filter((sub) => sub.activity_id === activity.id).map((sub) => ({ id: sub.id, name: sub.name }))
    }));
  },
  createActivity(name) {
    const id = makeId('act');
    db.prepare('INSERT INTO activities VALUES (?,?)').run(id, name);
    return { id, name, subActivities: [] };
  },
  createSubActivity(activityId, name) {
    const exists = db.prepare('SELECT id FROM activities WHERE id=?').get(activityId);
    if (!exists) return null;
    const id = makeId('sub');
    db.prepare('INSERT INTO sub_activities VALUES (?,?,?)').run(id, activityId, name);
    return { id, name };
  },
  removeSubActivity(activityId, subActivityId) {
    const exists = db.prepare('SELECT id FROM sub_activities WHERE id=? AND activity_id=?').get(subActivityId, activityId);
    if (!exists) return false;
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM mappings WHERE sub_activity_id=?').run(subActivityId);
      db.prepare('DELETE FROM sub_activities WHERE id=?').run(subActivityId);
    });
    tx();
    return true;
  },
  updateActivity(activityId, name) {
    const found = db.prepare('SELECT * FROM activities WHERE id=?').get(activityId);
    if (!found) return null;
    db.prepare('UPDATE activities SET name=? WHERE id=?').run(name, activityId);
    return { ...found, name, subActivities: this.getActivities().find((a) => a.id === activityId)?.subActivities || [] };
  },
  updateSubActivity(activityId, subActivityId, name) {
    const found = db.prepare('SELECT * FROM sub_activities WHERE id=? AND activity_id=?').get(subActivityId, activityId);
    if (!found) return null;
    db.prepare('UPDATE sub_activities SET name=? WHERE id=?').run(name, subActivityId);
    return { id: subActivityId, name };
  },
  getHazards() {
    return db.prepare('SELECT * FROM hazards').all().map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      consequences: row.consequences,
      existingControls: row.existing_controls,
      likelihood: row.likelihood,
      severity: row.severity
    }));
  },
  createHazard(payload) {
    const id = makeId('haz');
    db.prepare('INSERT INTO hazards VALUES (?,?,?,?,?,?,?)').run(
      id,
      payload.name,
      payload.description,
      payload.consequences,
      payload.existingControls,
      payload.likelihood,
      payload.severity
    );
    return { id, ...payload };
  },
  updateHazard(hazardId, payload) {
    const found = db.prepare('SELECT id FROM hazards WHERE id=?').get(hazardId);
    if (!found) return null;
    db.prepare('UPDATE hazards SET name=?,description=?,consequences=?,existing_controls=?,likelihood=?,severity=? WHERE id=?').run(
      payload.name,
      payload.description,
      payload.consequences,
      payload.existingControls,
      payload.likelihood,
      payload.severity,
      hazardId
    );
    return { id: hazardId, ...payload };
  },
  getMappings() {
    return db.prepare('SELECT * FROM mappings').all().map((row) => ({
      id: row.id,
      activityId: row.activity_id,
      subActivityId: row.sub_activity_id,
      hazardId: row.hazard_id
    }));
  },
  replaceMappings(activityId, subActivityId, hazardIds) {
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM mappings WHERE activity_id=? AND sub_activity_id=?').run(activityId, subActivityId);
      const insert = db.prepare('INSERT INTO mappings VALUES (?,?,?,?)');
      hazardIds.forEach((hazardId) => {
        insert.run(makeId('map'), activityId, subActivityId, hazardId);
      });
    });
    tx();
    return this.getMappings().filter((m) => m.activityId === activityId && m.subActivityId === subActivityId);
  },
  getRaTemplate(activityId, subActivityId) {
    const activity = db.prepare('SELECT * FROM activities WHERE id=?').get(activityId);
    const subActivity = db.prepare('SELECT * FROM sub_activities WHERE id=? AND activity_id=?').get(subActivityId, activityId);
    if (!activity || !subActivity) return null;

    const rows = db.prepare(`
      SELECT m.id as mapping_id, h.*
      FROM mappings m
      JOIN hazards h ON h.id = m.hazard_id
      WHERE m.activity_id=? AND m.sub_activity_id=?
    `).all(activityId, subActivityId).map((row) => ({
      mappingId: row.mapping_id,
      hazardId: row.id,
      hazardName: row.name,
      hazardDescription: row.description,
      consequences: row.consequences,
      existingControls: row.existing_controls,
      additionalControls: '',
      likelihood: row.likelihood,
      severity: row.severity,
      rpn: row.likelihood * row.severity,
      residualLikelihood: null,
      residualSeverity: null,
      residualRpn: null
    }));

    return {
      activity: { id: activity.id, name: activity.name },
      subActivity: { id: subActivity.id, name: subActivity.name },
      rows
    };
  },
  createRiskAssessment(user, payload) {
    const assessmentId = makeId('ra');

    const tx = db.transaction(() => {
      db.prepare('INSERT INTO risk_assessments VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
        assessmentId,
        user.companyId,
        user.companyName,
        user.departmentId,
        user.departmentName,
        user.id,
        user.name,
        new Date().toISOString(),
        payload.title,
        payload.activityId,
        payload.activityName
      );

      const insertSection = db.prepare('INSERT INTO risk_assessment_sections VALUES (?,?,?,?)');
      const insertRow = db.prepare('INSERT INTO risk_assessment_rows VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');

      payload.subActivities.forEach((section) => {
        const sectionId = makeId('ras');
        insertSection.run(sectionId, assessmentId, section.subActivityId, section.subActivityName);

        section.rows.forEach((row) => {
          insertRow.run(
            makeId('rar'),
            sectionId,
            row.mappingId,
            row.hazardId,
            row.hazardName,
            row.hazardDescription,
            row.consequences,
            row.existingControls,
            row.additionalControls,
            row.likelihood,
            row.severity,
            row.rpn,
            row.residualLikelihood,
            row.residualSeverity,
            row.residualRpn
          );
        });
      });
    });

    tx();
    return this.getRiskAssessmentById(assessmentId);
  },
  getRiskAssessmentById(id) {
    const assessment = db.prepare('SELECT * FROM risk_assessments WHERE id=?').get(id);
    if (!assessment) return null;
    const sections = db.prepare('SELECT * FROM risk_assessment_sections WHERE assessment_id=?').all(id);
    const rows = db.prepare('SELECT * FROM risk_assessment_rows WHERE section_id IN (SELECT id FROM risk_assessment_sections WHERE assessment_id=?)').all(id);

    return {
      id: assessment.id,
      companyId: assessment.company_id,
      companyName: assessment.company_name,
      departmentId: assessment.department_id,
      departmentName: assessment.department_name,
      createdBy: assessment.created_by,
      createdByName: assessment.created_by_name,
      createdAt: assessment.created_at,
      title: assessment.title,
      activityId: assessment.activity_id,
      activityName: assessment.activity_name,
      subActivities: sections.map((section) => ({
        subActivityId: section.sub_activity_id,
        subActivityName: section.sub_activity_name,
        rows: rows.filter((row) => row.section_id === section.id).map((row) => ({
          mappingId: row.mapping_id,
          hazardId: row.hazard_id,
          hazardName: row.hazard_name,
          hazardDescription: row.hazard_description,
          consequences: row.consequences,
          existingControls: row.existing_controls,
          additionalControls: row.additional_controls,
          likelihood: row.likelihood,
          severity: row.severity,
          rpn: row.rpn,
          residualLikelihood: row.residual_likelihood,
          residualSeverity: row.residual_severity,
          residualRpn: row.residual_rpn
        }))
      }))
    };
  },
  listRiskAssessmentsForUser(user) {
    const assessments = db.prepare('SELECT id FROM risk_assessments WHERE company_id=?').all(user.companyId);
    return assessments
      .map((item) => this.getRiskAssessmentById(item.id))
      .filter((item) => user.allowedDepartmentIds.includes(item.departmentId));
  }
};
