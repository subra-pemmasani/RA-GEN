const getJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
};

export const api = {
  getActivities: () => getJson('/api/activities'),
  getHazards: () => getJson('/api/hazards'),
  getMappings: () => getJson('/api/mappings'),
  getRaTemplate: (activityId, subActivityId) =>
    getJson(`/api/ra-template?activityId=${activityId}&subActivityId=${subActivityId}`)
};
