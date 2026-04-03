import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyHazard = {
  name: '',
  description: '',
  consequences: '',
  existingControls: '',
  likelihood: 1,
  severity: 1
};

export default function HazardLibraryPage() {
  const [hazards, setHazards] = useState([]);
  const [newHazard, setNewHazard] = useState(emptyHazard);
  const [editingHazardId, setEditingHazardId] = useState('');
  const [editingHazard, setEditingHazard] = useState(emptyHazard);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getHazards().then(setHazards);
  }, []);

  const handleNewHazardSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const created = await api.createHazard({
        ...newHazard,
        likelihood: Number(newHazard.likelihood),
        severity: Number(newHazard.severity)
      });
      setHazards((prev) => [...prev, created]);
      setNewHazard(emptyHazard);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const startEditing = (hazard) => {
    setEditingHazardId(hazard.id);
    setEditingHazard({
      name: hazard.name,
      description: hazard.description,
      consequences: hazard.consequences,
      existingControls: hazard.existingControls,
      likelihood: Number(hazard.likelihood) || 1,
      severity: Number(hazard.severity) || 1
    });
  };

  const saveEditing = async (hazardId) => {
    setError('');
    try {
      const updated = await api.updateHazard(hazardId, {
        ...editingHazard,
        likelihood: Number(editingHazard.likelihood),
        severity: Number(editingHazard.severity)
      });
      setHazards((prev) => prev.map((hazard) => (hazard.id === hazardId ? updated : hazard)));
      setEditingHazardId('');
      setEditingHazard(emptyHazard);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="card">
      <h2>Hazard Library</h2>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Hazard</th>
              <th>Description</th>
              <th>Consequences</th>
              <th>Existing Controls</th>
              <th>Likelihood</th>
              <th>Severity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {hazards.map((hazard) => {
              const isEditing = editingHazardId === hazard.id;

              return (
                <tr key={hazard.id}>
                  <td>
                    {isEditing ? (
                      <input
                        value={editingHazard.name}
                        onChange={(event) =>
                          setEditingHazard((prev) => ({ ...prev, name: event.target.value }))
                        }
                      />
                    ) : (
                      hazard.name
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        value={editingHazard.description}
                        onChange={(event) =>
                          setEditingHazard((prev) => ({ ...prev, description: event.target.value }))
                        }
                      />
                    ) : (
                      hazard.description
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        value={editingHazard.consequences}
                        onChange={(event) =>
                          setEditingHazard((prev) => ({ ...prev, consequences: event.target.value }))
                        }
                      />
                    ) : (
                      hazard.consequences
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        value={editingHazard.existingControls}
                        onChange={(event) =>
                          setEditingHazard((prev) => ({ ...prev, existingControls: event.target.value }))
                        }
                      />
                    ) : (
                      hazard.existingControls
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        value={editingHazard.likelihood}
                        onChange={(event) =>
                          setEditingHazard((prev) => ({ ...prev, likelihood: Number(event.target.value) }))
                        }
                      >
                        {[1, 2, 3, 4, 5].map((score) => (
                          <option key={score} value={score}>{score}</option>
                        ))}
                      </select>
                    ) : (
                      hazard.likelihood
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        value={editingHazard.severity}
                        onChange={(event) =>
                          setEditingHazard((prev) => ({ ...prev, severity: Number(event.target.value) }))
                        }
                      >
                        {[1, 2, 3, 4, 5].map((score) => (
                          <option key={score} value={score}>{score}</option>
                        ))}
                      </select>
                    ) : (
                      hazard.severity
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <div className="inline-form">
                        <button className="btn small-btn" type="button" onClick={() => saveEditing(hazard.id)}>
                          Save
                        </button>
                        <button
                          className="btn small-btn secondary-btn"
                          type="button"
                          onClick={() => {
                            setEditingHazardId('');
                            setEditingHazard(emptyHazard);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button className="btn small-btn secondary-btn" type="button" onClick={() => startEditing(hazard)}>
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            <tr>
              <td>
                <input
                  value={newHazard.name}
                  onChange={(event) => setNewHazard((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="New hazard"
                />
              </td>
              <td>
                <input
                  value={newHazard.description}
                  onChange={(event) => setNewHazard((prev) => ({ ...prev, description: event.target.value }))}
                />
              </td>
              <td>
                <input
                  value={newHazard.consequences}
                  onChange={(event) => setNewHazard((prev) => ({ ...prev, consequences: event.target.value }))}
                />
              </td>
              <td>
                <input
                  value={newHazard.existingControls}
                  onChange={(event) =>
                    setNewHazard((prev) => ({ ...prev, existingControls: event.target.value }))
                  }
                />
              </td>
              <td>
                <select
                  value={newHazard.likelihood}
                  onChange={(event) =>
                    setNewHazard((prev) => ({ ...prev, likelihood: Number(event.target.value) }))
                  }
                >
                  {[1, 2, 3, 4, 5].map((score) => (
                    <option key={score} value={score}>{score}</option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  value={newHazard.severity}
                  onChange={(event) =>
                    setNewHazard((prev) => ({ ...prev, severity: Number(event.target.value) }))
                  }
                >
                  {[1, 2, 3, 4, 5].map((score) => (
                    <option key={score} value={score}>{score}</option>
                  ))}
                </select>
              </td>
              <td>
                <button className="btn small-btn" type="button" onClick={handleNewHazardSubmit}>
                  Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
