import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <p style={{ color: 'var(--foreground)', fontWeight: 'bold', marginBottom: '4px' }}>{label}</p>
        <p style={{ color: 'var(--primary)', marginBottom: '2px' }}>
          Emotion: <span style={{ textTransform: 'capitalize' }}>{data.emotion}</span>
        </p>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9em' }}>
          Intensity: {Number(data.intensityVal).toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

export default function EmotionGraph() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const res = await fetch("http://localhost:8000/emotion-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "web_user",
          date: today,
        }),
      });

      if (!res.ok) throw new Error("Failed to fetch graph data");

      const json = await res.json();

      const formattedData = json.points.map((p) => ({
        ...p,
        time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intensityVal: p.intensity,
      }));

      setData(formattedData);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      flex: 1,
      padding: "24px",
      backgroundColor: "var(--background)",
      color: "var(--foreground)",
      display: "flex",
      flexDirection: "column",
      gap: "24px",
    },
    header: {
      fontSize: "24px",
      fontWeight: "bold",
    },
    chartContainer: {
      width: "100%",
      height: "400px",
      backgroundColor: "var(--card)",
      borderRadius: "12px",
      padding: "20px",
      border: "1px solid var(--border)",
    },
  };

  if (loading && data.length === 0) return <div style={styles.container}>Loading graph...</div>;
  if (error) return <div style={styles.container}>Error: {error}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>Emotional Journey (Today)</div>

      <div style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="time" stroke="var(--muted-foreground)" />
            <YAxis stroke="var(--muted-foreground)" domain={[-1, 1]} />
            <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="intensityVal"
              name="Intensity"
              stroke="#8884d8"
              fillOpacity={1}
              fill="url(#colorIntensity)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
        * Showing emotional intensity of interactions over time.
      </div>
    </div>
  );
}
