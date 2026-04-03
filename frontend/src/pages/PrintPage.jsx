export default function PrintPage({ latestAssessment }) {
  if (!latestAssessment) {
    return (
      <section className="card">
        <h2>Printable RA Output</h2>
        <p>No generated assessment yet. Go to RA Generator and create one first.</p>
      </section>
    );
  }

  return (
    <section className="print-sheet">
      <header className="print-header">
        <h2>Risk Assessment</h2>
        <p><strong>Activity:</strong> {latestAssessment.activity.name}</p>
        <p><strong>Sub-activity:</strong> {latestAssessment.subActivity.name}</p>
        <p><strong>Created:</strong> {new Date(latestAssessment.createdAt).toLocaleString()}</p>
      </header>

      <table className="print-table">
        <thead>
          <tr>
            <th>Hazard</th>
            <th>Description</th>
            <th>Consequences</th>
            <th>Existing Controls</th>
            <th>RPN</th>
            <th>Additional Controls</th>
            <th>Residual RPN</th>
          </tr>
        </thead>
        <tbody>
          {latestAssessment.rows.map((row) => (
            <tr key={row.mappingId}>
              <td>{row.hazardName}</td>
              <td>{row.hazardDescription}</td>
              <td>{row.consequences}</td>
              <td>{row.existingControls}</td>
              <td>{row.rpn}</td>
              <td>{row.additionalControls || '-'}</td>
              <td>{row.residualRpn}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="btn print-hide" type="button" onClick={() => window.print()}>
        Print A4
      </button>
    </section>
  );
}
