import { useEffect, useState } from 'react';
import { api } from '../api';

export default function ActivityLibraryPage({ currentUser }) {
  const [activities, setActivities] = useState([]);
  const [newActivityName, setNewActivityName] = useState('');
  const [newSubActivityName, setNewSubActivityName] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [error, setError] = useState('');
  const [editingActivityId, setEditingActivityId] = useState('');
  const [editingActivityName, setEditingActivityName] = useState('');
  const [editingSubActivity, setEditingSubActivity] = useState({
    activityId: '',
    subActivityId: '',
    name: ''
  });
  const canEdit = currentUser?.role === 'admin' || currentUser?.permissions?.canEditActivities;

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

  const startActivityEdit = (activity) => {
    setEditingActivityId(activity.id);
    setEditingActivityName(activity.name);
  };

  const handleActivityEditSave = async (event) => {
    event.preventDefault();
    if (!editingActivityId) return;
    setError('');

    try {
      const updated = await api.updateActivity(editingActivityId, editingActivityName);
      setActivities((prev) =>
        prev.map((activity) => (activity.id === editingActivityId ? { ...activity, ...updated } : activity))
      );
      setEditingActivityId('');
      setEditingActivityName('');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const startSubActivityEdit = (activityId, subActivity) => {
    setEditingSubActivity({
      activityId,
      subActivityId: subActivity.id,
      name: subActivity.name
    });
  };

  const handleSubActivityEditSave = async (event) => {
    event.preventDefault();
    if (!editingSubActivity.activityId || !editingSubActivity.subActivityId) return;
    setError('');

    try {
      const updated = await api.updateSubActivity(
        editingSubActivity.activityId,
        editingSubActivity.subActivityId,
        editingSubActivity.name
      );

      setActivities((prev) =>
        prev.map((activity) => {
          if (activity.id !== editingSubActivity.activityId) return activity;
          return {
            ...activity,
            subActivities: activity.subActivities.map((sub) =>
              sub.id === editingSubActivity.subActivityId ? { ...sub, ...updated } : sub
            )
          };
        })
      );
      setEditingSubActivity({ activityId: '', subActivityId: '', name: '' });
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
          <button className="btn" type="submit" disabled={!canEdit}>Add Activity</button>
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
          <button className="btn" type="submit" disabled={!selectedActivityId || !canEdit}>
            Add Sub-activity
          </button>
        </form>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {activities.map((activity) => (
        <article key={activity.id} className="tile">
          {editingActivityId === activity.id ? (
            <form onSubmit={handleActivityEditSave} className="inline-form">
              <input
                value={editingActivityName}
                onChange={(event) => setEditingActivityName(event.target.value)}
              />
              <button type="submit" className="btn small-btn">Save</button>
              <button
                type="button"
                className="btn small-btn secondary-btn"
                onClick={() => {
                  setEditingActivityId('');
                  setEditingActivityName('');
                }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="row-between">
              <h3>{activity.name}</h3>
              <button type="button" className="btn small-btn secondary-btn" disabled={!canEdit} onClick={() => startActivityEdit(activity)}>
                Edit
              </button>
            </div>
          )}
          <ul>
            {activity.subActivities.map((sub) => (
              <li key={sub.id} className="row-between">
                {editingSubActivity.subActivityId === sub.id ? (
                  <form onSubmit={handleSubActivityEditSave} className="inline-form">
                    <input
                      value={editingSubActivity.name}
                      onChange={(event) =>
                        setEditingSubActivity((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                    <button type="submit" className="btn small-btn">Save</button>
                    <button
                      type="button"
                      className="btn small-btn secondary-btn"
                      onClick={() => setEditingSubActivity({ activityId: '', subActivityId: '', name: '' })}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <span>{sub.name}</span>
                    <button
                      type="button"
                      className="btn small-btn secondary-btn"
                      disabled={!canEdit}
                      onClick={() => startSubActivityEdit(activity.id, sub)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn small-btn secondary-btn"
                      disabled={!canEdit}
                      onClick={async () => {
                        try {
                          await api.removeSubActivity(activity.id, sub.id);
                          setActivities((prev) =>
                            prev.map((item) =>
                              item.id === activity.id
                                ? { ...item, subActivities: item.subActivities.filter((s) => s.id !== sub.id) }
                                : item
                            )
                          );
                        } catch (requestError) {
                          setError(requestError.message);
                        }
                      }}
                    >
                      Remove
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
