import { useEffect, useState } from 'react';
import { api } from '../api';

export default function ActivityLibraryPage() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    api.getActivities().then(setActivities);
  }, []);

  return (
    <section className="card">
      <h2>Activity Library</h2>
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
