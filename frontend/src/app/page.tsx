"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Play, RotateCcw, TrendingUp, Activity } from "lucide-react";

// --- Types ---
// Must match your Backend JSON response exactly
interface SimulationResult {
  price: number;
  std_error: number;
  conf_interval_95: [number, number];
  paths_sample: number[][];
  runtime_ms: number;
  greeks: { // New Field
    delta: number;
    gamma: number;
    vega: number;
    theta: number;
    rho: number;
  };
}


interface ChartDataPoint {
  step: number;
  [key: string]: number; // Dynamic keys for paths (path_0, path_1...)
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SimulationResult | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // Default Inputs
  const [params, setParams] = useState({
    S0: 100,
    K: 100,
    T: 1,
    r: 0.05,
    sigma: 0.2,
    steps: 100,
    n_sims: 10000,
    use_antithetic: true, // New Default
  });

  const runSimulation = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/price/asian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const result: SimulationResult = await response.json();

      setData(result);
      processChartData(result.paths_sample);
    } catch (error) {
      console.error("Simulation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Transform Backend Data (Arrays) -> Recharts Data (Objects)
  const processChartData = (paths: number[][]) => {
    const steps = paths[0].length;
    const formattedData: ChartDataPoint[] = [];

    for (let i = 0; i < steps; i++) {
      const point: ChartDataPoint = { step: i };
      // Only visualize the first 20 paths to keep the chart performant
      paths.slice(0, 20).forEach((path, index) => {
        point[`path_${index}`] = path[i];
      });
      formattedData.push(point);
    }
    setChartData(formattedData);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Exotic Options Lab
            </h1>
            <p className="text-gray-500">
              Monte Carlo Simulation Engine (Asian Arithmetic Options)
            </p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              Python 3.12
            </span>
            <span className="px-3 py-1 bg-black text-white rounded-full text-sm font-medium">
              FastAPI
            </span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Controls */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Parameters</h2>
            </div>
            
            <div className="space-y-4">
              {[
                { label: "Stock Price (S0)", key: "S0" },
                { label: "Strike Price (K)", key: "K" },
                { label: "Volatility (σ)", key: "sigma", step: 0.01 },
                { label: "Risk-free Rate (r)", key: "r", step: 0.01 },
                { label: "Time (T Years)", key: "T", step: 0.1 },
                { label: "Simulations", key: "n_sims", step: 1000 },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {field.label}
                  </label>
                  <input
                    type="number"
                    step={field.step || 1}
                    // FIX: Cast the value as number to satisfy TypeScript
                    value={params[field.key as keyof typeof params] as number}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        [field.key]: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  />
                </div>
              ))}
            </div>

            {/* Antithetic Toggle */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="antithetic"
                checked={params.use_antithetic}
                onChange={(e) =>
                  setParams({ ...params, use_antithetic: e.target.checked })
                }
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor="antithetic" className="text-sm font-medium text-gray-700">
                Use Antithetic Variates
              </label>
            </div>

            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50"
            >
              {loading ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {loading ? "Simulating..." : "Run Simulation"}
            </button>
          </div>

          {/* Right Column: Visualization & Results */}
          <div className="lg:col-span-2 space-y-6">

            {/* Greeks Grid */}
            {data && (
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  Risk Metrics (Greeks)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: "Delta (Δ)", value: data.greeks.delta },
                    { label: "Gamma (Γ)", value: data.greeks.gamma },
                    { label: "Vega (ν)", value: data.greeks.vega },
                    { label: "Theta (Θ)", value: data.greeks.theta },
                    { label: "Rho (ρ)", value: data.greeks.rho },
                  ].map((greek) => (
                    <div key={greek.label} className="p-3 bg-gray-50 rounded-lg text-center">
                      <p className="text-xs text-gray-500 mb-1">{greek.label}</p>
                      <p className="font-mono font-medium text-gray-900">
                        {greek.value.toFixed(4)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* KPI Cards */}
            {data && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">Option Price</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${data.price.toFixed(4)}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">95% Confidence</p>
                  <p className="text-lg font-semibold text-gray-900">
                    [{data.conf_interval_95[0].toFixed(2)}, {data.conf_interval_95[1].toFixed(2)}]
                  </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">Compute Time</p>
                  <p className="text-2xl font-bold text-green-600">
                    {data.runtime_ms.toFixed(0)}ms
                  </p>
                </div>
              </div>
            )}

            {/* Chart */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">
                    Monte Carlo Paths
                  </h3>
                </div>
                {data && (
                  <span className="text-xs text-gray-400">
                    Visualizing 20/{data.paths_sample.length} sample paths
                  </span>
                )}
              </div>

              <div className="h-[400px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="step" 
                        stroke="#9ca3af" 
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="#9ca3af" 
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 12 }} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '8px', 
                          border: '1px solid #e5e7eb' 
                        }}
                      />
                      {/* Render Lines Dynamically */}
                      {Object.keys(chartData[0])
                        .filter((k) => k.startsWith("path_"))
                        .map((key, index) => (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stroke={index === 0 ? "#2563eb" : "#93c5fd"}
                            strokeWidth={index === 0 ? 2 : 1}
                            opacity={index === 0 ? 1 : 0.4}
                            dot={false}
                          />
                        ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                    Run simulation to see paths
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}