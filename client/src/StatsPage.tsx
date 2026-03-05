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

interface RatingPoint {
  rating: number;
  date: string;
}

interface Stats {
  total: number;
  correct: number;
  accuracy: number;
  rating: number;
  recent: Attempt[];
  ratingHistory: RatingPoint[];
}

function RatingChart({ history }: { history: RatingPoint[] }) {
  if (history.length === 0) return null;

  const W = 600;
  const H = 250;
  const PAD = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const ratings = history.map((p) => p.rating);
  const minR = Math.min(...ratings);
  const maxR = Math.max(...ratings);
  const range = maxR - minR || 100;
  const yMin = minR - range * 0.1;
  const yMax = maxR + range * 0.1;

  const toX = (i: number) => PAD.left + (history.length === 1 ? chartW / 2 : (i / (history.length - 1)) * chartW);
  const toY = (r: number) => PAD.top + chartH - ((r - yMin) / (yMax - yMin)) * chartH;

  const points = history.map((p, i) => `${toX(i)},${toY(p.rating)}`).join(" ");

  // Gridlines: ~4 horizontal lines
  const gridStep = Math.max(1, Math.round((yMax - yMin) / 4));
  const gridStart = Math.ceil(yMin / gridStep) * gridStep;
  const gridLines: number[] = [];
  for (let v = gridStart; v <= yMax; v += gridStep) gridLines.push(v);

  return (
    <div className="rating-chart">
      <h3>Rating Over Time</h3>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W }}>
        {gridLines.map((v) => (
          <g key={v}>
            <line x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)} stroke="#444" strokeWidth="0.5" />
            <text x={PAD.left - 6} y={toY(v) + 4} textAnchor="end" fill="#aaa" fontSize="11">{Math.round(v)}</text>
          </g>
        ))}
        {history.length === 1 ? (
          <circle cx={toX(0)} cy={toY(history[0].rating)} r="4" fill="#4caf50" />
        ) : (
          <polyline points={points} fill="none" stroke="#4caf50" strokeWidth="2" strokeLinejoin="round" />
        )}
      </svg>
    </div>
  );
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
        <div className="stat-card">
          <span className="stat-value">{stats.rating}</span>
          <span className="stat-label">Elo Rating</span>
        </div>
      </div>

      {stats.ratingHistory.length > 1 && <RatingChart history={stats.ratingHistory} />}

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
