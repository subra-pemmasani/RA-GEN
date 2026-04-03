import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const scoreOptions = [1, 2, 3, 4, 5];

export default function RAGeneratorPage({ setLatestAssessment }) {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [selectedSubActivityId, setSelectedSubActivityId] = useState('');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.getActivities().then((data) => {
      setActivities(data);
      if (data.length > 0) {
        setSelectedActivityId(data[0].id);
        setSelectedSubActivityId(data[0].subActivities[0]?.id || '');
      }
    });
  }, []);

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === selectedActivityId),
    [activities, selectedActivityId]
  );

  useEffect(() => {
    if (!selectedActivityId || !selectedSubActivityId) return;

    api.getRaTemplate(selectedActivityId, selectedSubActivityId).then((payload) => {
      setRows(payload.rows);
    });
  }, [selectedActivityId, selectedSubActivityId]);

  const updateRow = (index, updates) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...updates };
        next.rpn = Number(next.likelihood) * Number(next.severity);
        next.residualRpn = Number(next.residualLikelihood) * Number(next.residualSeverity);
        return next;
      })
    );
  };

  const handleGeneratePrint = () => {
    if (!selectedActivity || !selectedSubActivityId) return;
    const selectedSubActivity = selectedActivity.subActivities.find((item) => item.id === selectedSubActivityId);
    setLatestAssessment({
      createdAt: new Date().toISOString(),
      activity: selectedActivity,
      subActivity: selectedSubActivity,
      rows
    });
    navigate('/print');
  };

  return (
    <section className="card">
      <h2>RA Generator</h2>
      <div className="inline-fields">
        <label>
          Activity
          <select value={selectedActivityId} onChange={(event) => setSelectedActivityId(event.target.value)}>
            {activities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Sub-activity
          <select
            value={selectedSubActivityId}
            onChange={(event) => setSelectedSubActivityId(event.target.value)}
          >
            {selectedActivity?.subActivities.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </label>
      </div>

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
            {rows.map((row, index) => (
              <tr key={row.mappingId}>
                <td>{row.hazardName}</td>
                <td>{row.hazardDescription}</td>
                <td>{row.consequences}</td>
                <td>{row.existingControls}</td>
                <td>
                  <select
                    value={row.likelihood}
                    onChange={(event) => updateRow(index, { likelihood: Number(event.target.value) })}
                  >
                    {scoreOptions.map((score) => (
                      <option key={score} value={score}>{score}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={row.severity}
                    onChange={(event) => updateRow(index, { severity: Number(event.target.value) })}
                  >
                    {scoreOptions.map((score) => (
                      <option key={score} value={score}>{score}</option>
                    ))}
                  </select>
                </td>
                <td>{row.rpn}</td>
                <td>
                  <textarea
                    rows={2}
                    value={row.additionalControls}
                    onChange={(event) => updateRow(index, { additionalControls: event.target.value })}
                  />
                </td>
                <td>
                  <select
                    value={row.residualLikelihood}
                    onChange={(event) =>
                      updateRow(index, { residualLikelihood: Number(event.target.value) })
                    }
                  >
                    {scoreOptions.map((score) => (
                      <option key={score} value={score}>{score}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={row.residualSeverity}
                    onChange={(event) =>
                      updateRow(index, { residualSeverity: Number(event.target.value) })
                    }
                  >
                    {scoreOptions.map((score) => (
                      <option key={score} value={score}>{score}</option>
                    ))}
                  </select>
                </td>
                <td>{row.residualRpn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="btn" onClick={handleGeneratePrint}>
        Generate Printable RA
      </button>
    </section>
  );
}
