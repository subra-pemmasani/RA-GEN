import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function RiskRegisterPage({ setLatestAssessment }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.getRiskAssessments().then(setItems);
  }, []);

  return (
    <section className="card">
      <h2>Risk Register</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Company</th>
              <th>Department</th>
              <th>Activity</th>
              <th>Sub-Activities</th>
              <th>Created By</th>
              <th>Created At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.companyName}</td>
                <td>{item.departmentName}</td>
                <td>{item.activityName}</td>
                <td>{item.subActivities.map((sub) => sub.subActivityName).join(', ')}</td>
                <td>{item.createdByName}</td>
                <td>{new Date(item.createdAt).toLocaleString()}</td>
                <td>
                  <button
                    type="button"
                    className="btn small-btn"
                    onClick={() => {
                      setLatestAssessment(item);
                      navigate('/print');
                    }}
                  >
                    Open Print
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
