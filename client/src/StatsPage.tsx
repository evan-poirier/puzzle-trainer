import { useState, useEffect } from "react";

interface Attempt {
  id: number;
  correct: boolean;
  createdAt: string;
  puzzle: {
    rating: number;
    themes: string;
  };
}

interface Stats {
  total: number;
  correct: number;
  accuracy: number;
  recent: Attempt[];
}

interface StatsPageProps {
  onAuthError: () => void;
}

export default function StatsPage({ onAuthError }: StatsPageProps) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => {
        if (res.status === 401) {
          onAuthError();
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setStats(data);
      });
  }, [onAuthError]);

  if (!stats) return <p>Loading stats...</p>;

  return (
    <div className="stats-container">
      <div className="stats-summary">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Attempted</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.correct}</span>
          <span className="stat-label">Correct</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.accuracy}%</span>
          <span className="stat-label">Accuracy</span>
        </div>
      </div>

      {stats.recent.length > 0 && (
        <table className="stats-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Rating</th>
              <th>Themes</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {stats.recent.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                <td>{a.puzzle.rating}</td>
                <td>{a.puzzle.themes.replace(/ /g, ", ")}</td>
                <td className={a.correct ? "status-correct" : "status-wrong"}>
                  {a.correct ? "Correct" : "Wrong"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {stats.total === 0 && <p>No attempts yet. Go solve some puzzles!</p>}
    </div>
  );
}
