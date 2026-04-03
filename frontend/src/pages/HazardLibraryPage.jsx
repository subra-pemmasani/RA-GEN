import { useEffect, useState } from 'react';
import { api } from '../api';

export default function HazardLibraryPage() {
  const [hazards, setHazards] = useState([]);

  useEffect(() => {
    api.getHazards().then(setHazards);
  }, []);

  return (
    <section className="card">
      <h2>Hazard Library</h2>
      <div className="grid">
        {hazards.map((hazard) => (
          <article key={hazard.id} className="tile">
            <h3>{hazard.name}</h3>
            <p><strong>Description:</strong> {hazard.description}</p>
            <p><strong>Consequences:</strong> {hazard.consequences}</p>
            <p><strong>Existing Controls:</strong> {hazard.existingControls}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
