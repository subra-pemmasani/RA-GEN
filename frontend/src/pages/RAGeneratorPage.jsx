import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const scoreOptions = [1, 2, 3, 4, 5];

export default function RAGeneratorPage({ setLatestAssessment, user }) {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [selectedSubActivityIds, setSelectedSubActivityIds] = useState([]);
  const [subActivityRows, setSubActivityRows] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const canCustomize = user.role === 'admin' || user.permissions?.canCustomizeRA;
  const canUseAi = user.role === 'admin' || user.permissions?.canUseAIGenerator;

  useEffect(() => {
    api.getActivities().then((data) => {
      setActivities(data);
      if (data.length > 0) {
        setSelectedActivityId(data[0].id);
        setSelectedSubActivityIds(data[0].subActivities[0] ? [data[0].subActivities[0].id] : []);
      }
    });
  }, []);

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === selectedActivityId),
    [activities, selectedActivityId]
  );

  useEffect(() => {
    if (!selectedActivityId || selectedSubActivityIds.length === 0) {
      setSubActivityRows([]);
      return;
    }

    Promise.all(selectedSubActivityIds.map((subId) => api.getRaTemplate(selectedActivityId, subId))).then(
      (payloads) => {
        setSubActivityRows(
          payloads.map((payload) => ({
            subActivityId: payload.subActivity.id,
            subActivityName: payload.subActivity.name,
            rows: payload.rows
          }))
        );
      }
    );
  }, [selectedActivityId, selectedSubActivityIds]);

  const updateRow = (subActivityId, index, updates) => {
    setSubActivityRows((prev) =>
      prev.map((entry) => {
        if (entry.subActivityId !== subActivityId) return entry;

        return {
          ...entry,
          rows: entry.rows.map((row, i) => {
            if (i !== index) return row;
            const next = { ...row, ...updates };
            next.rpn = Number(next.likelihood) * Number(next.severity);
            next.residualRpn =
              next.residualLikelihood && next.residualSeverity
                ? Number(next.residualLikelihood) * Number(next.residualSeverity)
                : null;
            return next;
          })
        };
      })
    );
  };

  const toggleSubActivity = (subActivityId) => {
    setSelectedSubActivityIds((prev) =>
      prev.includes(subActivityId) ? prev.filter((id) => id !== subActivityId) : [...prev, subActivityId]
    );
  };

  const handleActivityChange = (nextActivityId) => {
    setSelectedActivityId(nextActivityId);
    const nextActivity = activities.find((activity) => activity.id === nextActivityId);
    const firstSubActivityId = nextActivity?.subActivities[0]?.id;
    setSelectedSubActivityIds(firstSubActivityId ? [firstSubActivityId] : []);
  };

  const handleGeneratePrint = async () => {
    if (!selectedActivity || subActivityRows.length === 0) return;
    setError('');

    const payload = {
      title: title || `${selectedActivity.name} RA`,
      activityId: selectedActivity.id,
      activityName: selectedActivity.name,
      subActivities: subActivityRows.map((entry) => ({
        subActivityId: entry.subActivityId,
        subActivityName: entry.subActivityName,
        rows: entry.rows
      }))
    };

    try {
      const created = await api.createRiskAssessment(payload);
      setLatestAssessment(created);
      navigate('/print');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleGenerateAi = async () => {
    if (!aiPrompt.trim()) return;
    setError('');

    try {
      const result = await api.generateAiRa({ activityName: selectedActivity?.name, jobScope: aiPrompt });
      setTitle(result.title);
      setCustomMode(true);
      setSubActivityRows([
        {
          subActivityId: `ai-${Date.now()}`,
          subActivityName: 'AI Generated Scope',
          rows: result.rows
        }
      ]);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="card">
      <h2>RA Generator</h2>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="inline-fields">
        <label>
          RA Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Weekly Roof RA" />
        </label>
        <label>
          Activity
          <select value={selectedActivityId} onChange={(event) => handleActivityChange(event.target.value)}>
            {activities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="chip-wrap">
        <button className={`hazard-chip ${customMode ? '' : 'inactive-chip'}`} type="button" disabled={!canCustomize} onClick={() => setCustomMode((prev) => !prev)}>
          {customMode ? 'Custom Mode ON' : 'Enable Custom Mode'}
        </button>
      </div>

      <div className="tile">
        <h3>Select Multiple Sub-activities</h3>
        <div className="chip-wrap">
          {selectedActivity?.subActivities.map((sub) => {
            const active = selectedSubActivityIds.includes(sub.id);
            return (
              <button
                key={sub.id}
                type="button"
                className={`hazard-chip ${active ? '' : 'inactive-chip'}`}
                onClick={() => toggleSubActivity(sub.id)}
              >
                {sub.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="tile">
        <h3>Generate AI RA (Ollama)</h3>
        <textarea rows={3} value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="Describe the job scope for AI-generated RA." />
        <button type="button" className="btn" disabled={!canUseAi} onClick={handleGenerateAi}>Generate AI RA</button>
      </div>

      {subActivityRows.map((entry) => (
        <div key={entry.subActivityId} className="tile">
          <h3>
            {customMode ? (
              <input
                value={entry.subActivityName}
                onChange={(event) =>
                  setSubActivityRows((prev) =>
                    prev.map((item) =>
                      item.subActivityId === entry.subActivityId
                        ? { ...item, subActivityName: event.target.value }
                        : item
                    )
                  )
                }
              />
            ) : (
              entry.subActivityName
            )}
          </h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hazard</th>
                  <th>Description</th>
                  <th>Consequences</th>
                  <th>Existing Controls</th>
                  <th>L</th>
                  <th>S</th>
                  <th>RPN</th>
                  <th>Additional Controls</th>
                  <th>Residual L</th>
                  <th>Residual S</th>
                  <th>Residual RPN</th>
                </tr>
              </thead>
              <tbody>
                {entry.rows.map((row, index) => (
                  <tr key={row.mappingId}>
                    <td>{customMode ? <input value={row.hazardName} onChange={(e) => updateRow(entry.subActivityId, index, { hazardName: e.target.value })} /> : row.hazardName}</td>
                    <td>{customMode ? <input value={row.hazardDescription} onChange={(e) => updateRow(entry.subActivityId, index, { hazardDescription: e.target.value })} /> : row.hazardDescription}</td>
                    <td>{customMode ? <input value={row.consequences} onChange={(e) => updateRow(entry.subActivityId, index, { consequences: e.target.value })} /> : row.consequences}</td>
                    <td>{customMode ? <input value={row.existingControls} onChange={(e) => updateRow(entry.subActivityId, index, { existingControls: e.target.value })} /> : row.existingControls}</td>
                    <td>
                      <select value={row.likelihood} onChange={(event) => updateRow(entry.subActivityId, index, { likelihood: Number(event.target.value) })}>
                        {scoreOptions.map((score) => <option key={score} value={score}>{score}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={row.severity} onChange={(event) => updateRow(entry.subActivityId, index, { severity: Number(event.target.value) })}>
                        {scoreOptions.map((score) => <option key={score} value={score}>{score}</option>)}
                      </select>
                    </td>
                    <td>{row.rpn}</td>
                    <td>
                      <textarea rows={2} value={row.additionalControls || ''} onChange={(event) => updateRow(entry.subActivityId, index, { additionalControls: event.target.value })} />
                    </td>
                    <td>
                      <select value={row.residualLikelihood || ''} onChange={(event) => updateRow(entry.subActivityId, index, { residualLikelihood: Number(event.target.value) || null })}>
                        <option value="">-</option>
                        {scoreOptions.map((score) => <option key={score} value={score}>{score}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={row.residualSeverity || ''} onChange={(event) => updateRow(entry.subActivityId, index, { residualSeverity: Number(event.target.value) || null })}>
                        <option value="">-</option>
                        {scoreOptions.map((score) => <option key={score} value={score}>{score}</option>)}
                      </select>
                    </td>
                    <td>{row.residualRpn || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <button type="button" className="btn" onClick={handleGeneratePrint}>
        Save to Register & Generate Printable RA
      </button>
      <p className="muted-text">Logged in as {user.name} ({user.departmentName})</p>
    </section>
  );
}
