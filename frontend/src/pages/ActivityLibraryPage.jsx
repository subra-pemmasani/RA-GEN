import { useEffect, useState } from 'react';
import { api } from '../api';

export default function ActivityLibraryPage() {
  const [activities, setActivities] = useState([]);
  const [newActivityName, setNewActivityName] = useState('');
  const [newSubActivityName, setNewSubActivityName] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getActivities().then((data) => {
      setActivities(data);
      if (data[0]) {
        setSelectedActivityId(data[0].id);
      }
    });
  }, []);

  const handleAddActivity = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const created = await api.createActivity(newActivityName);
      const nextActivities = [...activities, created];
      setActivities(nextActivities);
      setSelectedActivityId(created.id);
      setNewActivityName('');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleAddSubActivity = async (event) => {
    event.preventDefault();
    if (!selectedActivityId) return;
    setError('');

    try {
      const created = await api.createSubActivity(selectedActivityId, newSubActivityName);
      setActivities((prev) =>
        prev.map((activity) => {
          if (activity.id !== selectedActivityId) return activity;
          return {
            ...activity,
            subActivities: [...activity.subActivities, created]
          };
        })
      );
      setNewSubActivityName('');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="card">
      <h2>Activity Library</h2>
      <div className="inline-fields">
        <form onSubmit={handleAddActivity} className="tile">
          <h3>Add Activity</h3>
          <label>
            Activity name
            <input
              value={newActivityName}
              onChange={(event) => setNewActivityName(event.target.value)}
              placeholder="e.g. Confined Space Entry"
            />
          </label>
          <button className="btn" type="submit">Add Activity</button>
        </form>

        <form onSubmit={handleAddSubActivity} className="tile">
          <h3>Add Sub-activity</h3>
          <label>
            Select activity
            <select
              value={selectedActivityId}
              onChange={(event) => setSelectedActivityId(event.target.value)}
            >
              <option value="">Choose activity</option>
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sub-activity name
            <input
              value={newSubActivityName}
              onChange={(event) => setNewSubActivityName(event.target.value)}
              placeholder="e.g. Gas testing"
            />
          </label>
          <button className="btn" type="submit" disabled={!selectedActivityId}>
            Add Sub-activity
          </button>
        </form>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {activities.map((activity) => (
        <article key={activity.id} className="tile">
          <h3>{activity.name}</h3>
          <ul>
            {activity.subActivities.map((sub) => (
              <li key={sub.id}>{sub.name}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
