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
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiProvider, setAiProvider] = useState(localStorage.getItem('ra_ai_provider') || 'ollama');
  const [aiConfig, setAiConfig] = useState(() => ({
    ollamaUrl: localStorage.getItem('ra_ai_ollama_url') || '',
    baseUrl: localStorage.getItem('ra_ai_ollama_base_url') || '',
    apiUrl: localStorage.getItem('ra_ai_api_url') || '',
    apiKey: localStorage.getItem('ra_ai_api_key') || '',
    model: localStorage.getItem('ra_ai_model') || ''
  }));

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

  useEffect(() => {
    if (!canUseAi) return;
    api
      .getAiStatus({ provider: aiProvider, config: aiConfig })
      .then((payload) => setAiAvailable(Boolean(payload?.available)))
      .catch(() => setAiAvailable(false));
  }, [canUseAi, aiProvider, aiConfig]);

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
      localStorage.setItem('ra_ai_provider', aiProvider);
      localStorage.setItem('ra_ai_ollama_url', aiConfig.ollamaUrl || '');
      localStorage.setItem('ra_ai_ollama_base_url', aiConfig.baseUrl || '');
      localStorage.setItem('ra_ai_api_url', aiConfig.apiUrl || '');
      localStorage.setItem('ra_ai_api_key', aiConfig.apiKey || '');
      localStorage.setItem('ra_ai_model', aiConfig.model || '');
      const result = await api.generateAiRa({
        activityName: selectedActivity?.name,
        jobScope: aiPrompt,
        provider: aiProvider,
        config: aiConfig
      });
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
        <button
          className={`hazard-chip ${customMode ? '' : 'inactive-chip'}`}
          type="button"
          disabled={!canCustomize}
          onClick={() => setCustomMode((prev) => !prev)}
        >
          {customMode ? 'Exit Editable Custom RA' : 'Open Editable Custom RA'}
        </button>
      </div>
      {customMode ? <p className="muted-text">Custom mode active: all RA text fields are editable for this one-off RA only.</p> : null}

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
        <label>
          AI Provider
          <select value={aiProvider} onChange={(event) => setAiProvider(event.target.value)}>
            <option value="ollama">Ollama (Local)</option>
            <option value="openai_compatible">OpenAI-Compatible API</option>
          </select>
        </label>
        {aiProvider === 'ollama' ? (
          <div className="inline-fields">
            <label>
              Ollama Generate URL
              <input
                value={aiConfig.ollamaUrl}
                onChange={(event) => setAiConfig((prev) => ({ ...prev, ollamaUrl: event.target.value }))}
                placeholder="http://localhost:11434/api/generate"
              />
            </label>
            <label>
              Ollama Base URL (status)
              <input
                value={aiConfig.baseUrl}
                onChange={(event) => setAiConfig((prev) => ({ ...prev, baseUrl: event.target.value }))}
                placeholder="http://localhost:11434"
              />
            </label>
            <label>
              Model
              <input
                value={aiConfig.model}
                onChange={(event) => setAiConfig((prev) => ({ ...prev, model: event.target.value }))}
                placeholder="llama3.1"
              />
            </label>
          </div>
        ) : (
          <div className="inline-fields">
            <label>
              API URL
              <input
                value={aiConfig.apiUrl}
                onChange={(event) => setAiConfig((prev) => ({ ...prev, apiUrl: event.target.value }))}
                placeholder="https://api.openai.com/v1/chat/completions"
              />
            </label>
            <label>
              API Key
              <input
                type="password"
                value={aiConfig.apiKey}
                onChange={(event) => setAiConfig((prev) => ({ ...prev, apiKey: event.target.value }))}
                placeholder="sk-..."
              />
            </label>
            <label>
              Model
              <input
                value={aiConfig.model}
                onChange={(event) => setAiConfig((prev) => ({ ...prev, model: event.target.value }))}
                placeholder="gpt-4o-mini"
              />
            </label>
          </div>
        )}
        <p className="muted-text">
          {aiAvailable
            ? 'AI provider is reachable.'
            : 'AI provider not detected. Check URL/API key/model and ensure service is running.'}
        </p>
        <textarea rows={3} value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="Describe the job scope for AI-generated RA." />
        <button type="button" className="btn" disabled={!canUseAi || !aiAvailable} onClick={handleGenerateAi}>Generate AI RA</button>
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
