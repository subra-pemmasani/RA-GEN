import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

export default function MappingPage({ currentUser }) {
  const [activities, setActivities] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [error, setError] = useState('');
  const canEdit = currentUser?.role === 'admin' || currentUser?.permissions?.canEditMappings;

  useEffect(() => {
    Promise.all([api.getActivities(), api.getHazards(), api.getMappings()]).then(
      ([activityData, hazardData, mappingData]) => {
        setActivities(activityData);
        setHazards(hazardData);
        setMappings(mappingData);
      }
    );
  }, []);

  const hazardsBySubActivity = useMemo(() => {
    const grouped = {};
    mappings.forEach((mapping) => {
      const key = `${mapping.activityId}::${mapping.subActivityId}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(mapping.hazardId);
    });
    return grouped;
  }, [mappings]);

  const saveHazardsForSubActivity = async (activityId, subActivityId, hazardIds) => {
    setError('');
    try {
      await api.updateSubActivityHazards(activityId, subActivityId, hazardIds);
      const refreshed = await api.getMappings();
      setMappings(refreshed);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const removeHazard = (activityId, subActivityId, hazardIdToRemove) => {
    const key = `${activityId}::${subActivityId}`;
    const nextHazards = (hazardsBySubActivity[key] || []).filter((hazardId) => hazardId !== hazardIdToRemove);
    saveHazardsForSubActivity(activityId, subActivityId, nextHazards);
  };

  const addHazard = (activityId, subActivityId, hazardIdToAdd) => {
    if (!hazardIdToAdd) return;
    const key = `${activityId}::${subActivityId}`;
    const existing = hazardsBySubActivity[key] || [];
    const nextHazards = existing.includes(hazardIdToAdd) ? existing : [...existing, hazardIdToAdd];
    saveHazardsForSubActivity(activityId, subActivityId, nextHazards);
  };

  return (
    <section className="card">
      <h2>Activity-Hazard Mapping</h2>
      {error ? <p className="error-text">{error}</p> : null}

      {activities.map((activity) => (
        <article key={activity.id} className="tile">
          <h3>{activity.name}</h3>
          <div className="mapping-stack">
            {activity.subActivities.map((subActivity) => {
              const key = `${activity.id}::${subActivity.id}`;
              const selectedHazards = hazardsBySubActivity[key] || [];
              const availableHazards = hazards.filter((hazard) => !selectedHazards.includes(hazard.id));

              return (
                <div key={subActivity.id} className="mapping-row">
                  <div className="mapping-subactivity">{subActivity.name}</div>
                  <div className="mapping-hazards-cell">
                    {selectedHazards.map((hazardId) => {
                      const hazard = hazards.find((item) => item.id === hazardId);
                      if (!hazard) return null;

                      return (
                        <button
                          key={hazardId}
                          type="button"
                          className="hazard-chip"
                          onClick={() => removeHazard(activity.id, subActivity.id, hazardId)}
                          disabled={!canEdit}
                          title="Click to remove"
                        >
                          {hazard.name} ✕
                        </button>
                      );
                    })}

                    <select
                      className="plus-chip"
                      value=""
                      disabled={!canEdit}
                      onChange={(event) => addHazard(activity.id, subActivity.id, event.target.value)}
                    >
                      <option value="">+ Add Hazard</option>
                      {availableHazards.map((hazard) => (
                        <option key={hazard.id} value={hazard.id}>
                          {hazard.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </section>
  );
}
