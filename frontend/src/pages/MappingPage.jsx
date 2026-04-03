import { useEffect, useState } from 'react';
import { api } from '../api';

export default function MappingPage() {
  const [activities, setActivities] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [mappings, setMappings] = useState([]);

  useEffect(() => {
    Promise.all([api.getActivities(), api.getHazards(), api.getMappings()]).then(
      ([activityData, hazardData, mappingData]) => {
        setActivities(activityData);
        setHazards(hazardData);
        setMappings(mappingData);
      }
    );
  }, []);

  const resolveLabel = (mapping) => {
    const activity = activities.find((a) => a.id === mapping.activityId);
    const subActivity = activity?.subActivities.find((s) => s.id === mapping.subActivityId);
    const hazard = hazards.find((h) => h.id === mapping.hazardId);

    return {
      activity: activity?.name || mapping.activityId,
      subActivity: subActivity?.name || mapping.subActivityId,
      hazard: hazard?.name || mapping.hazardId
    };
  };

  return (
    <section className="card">
      <h2>Activity-Hazard Mapping</h2>
      <table>
        <thead>
          <tr>
            <th>Activity</th>
            <th>Sub-activity</th>
            <th>Hazard</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((mapping) => {
            const row = resolveLabel(mapping);
            return (
              <tr key={mapping.id}>
                <td>{row.activity}</td>
                <td>{row.subActivity}</td>
                <td>{row.hazard}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
