const getToken = () => localStorage.getItem('ra_token');

const request = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  return response.json();
};

const getJson = (url) => request(url, { method: 'GET' });
const postJson = (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) });
const putJson = (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) });

export const api = {
  login: (email, password) => postJson('/api/auth/login', { email, password }),
  me: () => getJson('/api/auth/me'),
  getUsers: () => getJson('/api/users'),
  updateUserDepartmentAccess: (userId, allowedDepartmentIds) =>
    putJson(`/api/users/${userId}/department-access`, { allowedDepartmentIds }),

  getActivities: () => getJson('/api/activities'),
  getHazards: () => getJson('/api/hazards'),
  getMappings: () => getJson('/api/mappings'),
  getRaTemplate: (activityId, subActivityId) =>
    getJson(`/api/ra-template?activityId=${activityId}&subActivityId=${subActivityId}`),

  createActivity: (name) => postJson('/api/activities', { name }),
  createSubActivity: (activityId, name) => postJson(`/api/activities/${activityId}/sub-activities`, { name }),
  updateActivity: (activityId, name) => putJson(`/api/activities/${activityId}`, { name }),
  updateSubActivity: (activityId, subActivityId, name) =>
    putJson(`/api/activities/${activityId}/sub-activities/${subActivityId}`, { name }),

  createHazard: (payload) => postJson('/api/hazards', payload),
  updateHazard: (hazardId, payload) => putJson(`/api/hazards/${hazardId}`, payload),
  updateSubActivityHazards: (activityId, subActivityId, hazardIds) =>
    putJson(`/api/mappings/${activityId}/${subActivityId}`, { hazardIds }),

  getRiskAssessments: () => getJson('/api/risk-assessments'),
  createRiskAssessment: (payload) => postJson('/api/risk-assessments', payload)
};
