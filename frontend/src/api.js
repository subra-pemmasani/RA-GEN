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

export const api = {
  getActivities: () => getJson('/api/activities'),
  getHazards: () => getJson('/api/hazards'),
  getMappings: () => getJson('/api/mappings'),
  getRaTemplate: (activityId, subActivityId) =>
    getJson(`/api/ra-template?activityId=${activityId}&subActivityId=${subActivityId}`),
  createActivity: (name) => postJson('/api/activities', { name }),
  createSubActivity: (activityId, name) =>
    postJson(`/api/activities/${activityId}/sub-activities`, { name })
};
