export default function PrintPage({ latestAssessment }) {
  if (!latestAssessment) {
    return (
      <section className="card">
        <h2>Printable RA Output</h2>
        <p>No generated assessment yet. Go to RA Generator and create one first.</p>
      </section>
    );
  }

  const sections = latestAssessment.subActivities || [];

  return (
    <section className="print-sheet">
      <header className="print-header">
        <h2>Risk Assessment</h2>
        <p><strong>Title:</strong> {latestAssessment.title}</p>
        <p><strong>Company:</strong> {latestAssessment.companyName}</p>
        <p><strong>Department:</strong> {latestAssessment.departmentName}</p>
        <p><strong>Activity:</strong> {latestAssessment.activityName}</p>
        <p><strong>Created By:</strong> {latestAssessment.createdByName}</p>
        <p><strong>Created:</strong> {new Date(latestAssessment.createdAt).toLocaleString()}</p>
      </header>

      {sections.map((section) => (
        <div key={section.subActivityId}>
          <h3>{section.subActivityName}</h3>
          <table className="print-table">
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
              {section.rows.map((row) => (
                <tr key={`${section.subActivityId}-${row.mappingId}`}>
                  <td>{row.hazardName}</td>
                  <td>{row.hazardDescription}</td>
                  <td>{row.consequences}</td>
                  <td>{row.existingControls}</td>
                  <td>{row.likelihood ?? ''}</td>
                  <td>{row.severity ?? ''}</td>
                  <td>{row.rpn ?? ''}</td>
                  <td>{row.additionalControls || ''}</td>
                  <td>{row.residualLikelihood ?? ''}</td>
                  <td>{row.residualSeverity ?? ''}</td>
                  <td>{row.residualRpn ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <button className="btn print-hide" type="button" onClick={() => window.print()}>
        Print A4
      </button>
    </section>
  );
}
