const getJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
};

const postJson = async (url, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  return response.json();
};

const putJson = async (url, body) => {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  return response.json();
};

export const api = {
  getActivities: () => getJson('/api/activities'),
  getHazards: () => getJson('/api/hazards'),
  getMappings: () => getJson('/api/mappings'),
  getRaTemplate: (activityId, subActivityId) =>
    getJson(`/api/ra-template?activityId=${activityId}&subActivityId=${subActivityId}`),
  createActivity: (name) => postJson('/api/activities', { name }),
  createSubActivity: (activityId, name) =>
    postJson(`/api/activities/${activityId}/sub-activities`, { name }),
  updateActivity: (activityId, name) => putJson(`/api/activities/${activityId}`, { name }),
  updateSubActivity: (activityId, subActivityId, name) =>
    putJson(`/api/activities/${activityId}/sub-activities/${subActivityId}`, { name }),
  createHazard: (payload) => postJson('/api/hazards', payload),
  updateHazard: (hazardId, payload) => putJson(`/api/hazards/${hazardId}`, payload),
  updateSubActivityHazards: (activityId, subActivityId, hazardIds) =>
    putJson(`/api/mappings/${activityId}/${subActivityId}`, { hazardIds })
};
