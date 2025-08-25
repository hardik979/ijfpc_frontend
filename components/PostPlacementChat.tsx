"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

type ChartReply = {
  type: "chart";
  chart: { kind: "bar" | "line" | "pie"; xKey: string; yKeys: string[] };
  data: any[];
  unit?: string;
};

export default function PostPlacementChat() {
  const [input, setInput] = useState("");
  const [reply, setReply] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    setLoading(true);
    setReply(null);
    try {
      const res = await fetch("http://localhost:5000/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const json = await res.json();
      setReply(json);
    } finally {
      setLoading(false);
    }
  };

  const renderChart = (r: ChartReply) => {
    if (r.chart.kind === "bar") {
      const y = r.chart.yKeys[0];
      return (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={r.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={r.chart.xKey} />
              <YAxis />
              <Tooltip />
              <Bar dataKey={y} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }
    if (r.chart.kind === "line") {
      const y = r.chart.yKeys[0];
      return (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={r.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={r.chart.xKey} />
              <YAxis />
              <Tooltip />
              <Line dataKey={y} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Ask: "How many students got placed in July 2025?"'
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={ask}
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white"
        >
          {loading ? "…" : "Ask"}
        </button>
      </div>

      {reply?.type === "text" && (
        <div className="p-3 rounded bg-gray-50 border">{reply.text}</div>
      )}

      {reply?.type === "list" && (
        <div className="p-3 rounded bg-gray-50 border text-sm">
          <pre className="overflow-auto">
            {JSON.stringify(reply.rows, null, 2)}
          </pre>
        </div>
      )}

      {reply?.type === "chart" && renderChart(reply)}
    </div>
  );
}
