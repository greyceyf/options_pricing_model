"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Play, RotateCcw, TrendingUp, Activity, CheckCircle, AlertCircle, BarChart3 } from "lucide-react";

// --- Types ---
interface SimulationResult {
  price: number;
  std_error: number;
  conf_interval_95: [number, number];
  paths_sample: number[][];
  runtime_ms: number;
  greeks: {
    delta: number;
    gamma: number;
    vega: number;
    theta: number;
    rho: number;
  };
  distribution: { // New Field for Histogram
    value: number; 
    probability: number 
  }[]; 
}

interface ValidationResult {
  bs_price: number;
  mc_price: number;
  error_abs: number;
  error_percent: number;
  within_confidence_interval: boolean;
  convergence_data: {
    simulations: number;
    price: number;
    ci_lower: number;
    ci_upper: number;
  }[];
}

interface ChartDataPoint {
  step: number;
  [key: string]: number; // Dynamic keys for paths (path_0, path_1...)
}

export default function Home() {
  // State
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pricing" | "validation">("pricing");
  
  // Data State
  const [data, setData] = useState<SimulationResult | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [validationData, setValidationData] = useState<ValidationResult | null>(null);

  // Inputs
  const [params, setParams] = useState({
    S0: 100,
    K: 100,
    T: 1,
    r: 0.05,
    sigma: 0.2,
    q: 0.0,
    steps: 100,
    n_sims: 10000,
    use_antithetic: true,
  });

  // --- Actions ---

  const runSimulation = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/price/asian", {
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

  const runValidation = async () => {
    setLoading(true);
    try {
        // Run both validation endpoints in parallel
        const [valRes, convRes] = await Promise.all([
            fetch("http://localhost:8000/validate/european", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(params),
            }),
            fetch("http://localhost:8000/analytics/convergence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(params),
            })
        ]);

        const valJson = await valRes.json();
        const convJson = await convRes.json();

        setValidationData({ ...valJson, ...convJson });
    } catch (error) {
        console.error("Validation failed:", error);
    } finally {
        setLoading(false);
    }
  };

  // Helper: Convert array of arrays to Recharts friendly object
  const processChartData = (paths: number[][]) => {
    if (!paths || paths.length === 0) return;
    const steps = paths[0].length;
    const formattedData: ChartDataPoint[] = [];

    for (let i = 0; i < steps; i++) {
      const point: ChartDataPoint = { step: i };
      // Limit to 20 paths for performance
      paths.slice(0, 20).forEach((path, index) => {
        point[`path_${index}`] = path[i];
      });
      formattedData.push(point);
    }
    setChartData(formattedData);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Exotic Options Lab
            </h1>
            <p className="text-gray-500 mt-1">
              Monte Carlo Simulation Engine (Asian Arithmetic Options)
            </p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
              Python 3.12
            </span>
            <span className="px-3 py-1 bg-black text-white rounded-full text-xs font-bold uppercase tracking-wider">
              FastAPI
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("pricing")}
            className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === "pricing" 
                ? "text-blue-600 border-b-2 border-blue-600" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Pricing Lab
          </button>
          <button
            onClick={() => { setActiveTab("validation"); runValidation(); }}
            className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === "validation" 
                ? "text-blue-600 border-b-2 border-blue-600" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Validation & Convergence
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Controls (Always Visible) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Simulation Config</h2>
            </div>
            
            <div className="space-y-4">
              {[
                { label: "Stock Price (S0)", key: "S0" },
                { label: "Strike Price (K)", key: "K" },
                { label: "Volatility (σ)", key: "sigma", step: 0.01 },
                { label: "Risk-free Rate (r)", key: "r", step: 0.01 },
                { label: "Dividend Yield (q)", key: "q", step: 0.01 },
                { label: "Time (T Years)", key: "T", step: 0.1 },
                { label: "Simulations (N)", key: "n_sims", step: 1000 },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    {field.label}
                  </label>
                  <input
                    type="number"
                    step={field.step || 1}
                    value={params[field.key as keyof typeof params] as number}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        [field.key]: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                  />
                </div>
              ))}
            </div>

            {/* Antithetic Toggle */}
            <div className="flex items-center gap-3 pt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <input
                type="checkbox"
                id="antithetic"
                checked={params.use_antithetic}
                onChange={(e) =>
                  setParams({ ...params, use_antithetic: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor="antithetic" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                Use Antithetic Variates
              </label>
            </div>

            <button
              onClick={activeTab === "pricing" ? runSimulation : runValidation}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:shadow"
            >
              {loading ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              {loading ? "Calculating..." : activeTab === "pricing" ? "Run Pricing Model" : "Run Validation"}
            </button>
          </div>

          {/* Right Column: Dynamic Content based on Tab */}
          <div className="lg:col-span-2 space-y-6">

            {/* --- PRICING LAB VIEW --- */}
            {activeTab === "pricing" && (
                <>
                    {/* KPI Cards */}
                    {data && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Asian Price</p>
                            <p className="text-3xl font-bold text-gray-900 tracking-tight">
                                ${data.price.toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">95% Confidence</p>
                            <p className="text-lg font-mono font-medium text-gray-700 mt-1">
                                {data.conf_interval_95[0].toFixed(2)} — {data.conf_interval_95[1].toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Execution Time</p>
                            <p className="text-2xl font-bold text-emerald-600">
                                {data.runtime_ms.toFixed(0)}ms
                            </p>
                        </div>
                    </div>
                    )}

                    {/* Greeks Grid */}
                    {data && data.greeks && (
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
                                <div key={greek.label} className="p-3 bg-gray-50 rounded-lg text-center hover:bg-gray-100 transition-colors">
                                    <p className="text-xs text-gray-500 mb-1 font-medium">{greek.label}</p>
                                    <p className="font-mono font-bold text-gray-900">
                                        {greek.value.toFixed(4)}
                                    </p>
                                </div>
                            ))}
                            </div>
                        </div>
                    )}

                    {/* Main Line Chart */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                                <h3 className="font-semibold text-gray-900">
                                    Monte Carlo Paths
                                </h3>
                            </div>
                            {data && (
                                <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded text-gray-500">
                                    Visualizing 20 sample paths
                                </span>
                            )}
                        </div>

                        <div className="h-[350px] w-full">
                            {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis 
                                    dataKey="step" 
                                    stroke="#9ca3af" 
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis 
                                    stroke="#9ca3af" 
                                    domain={['auto', 'auto']}
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false} 
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#fff', 
                                        borderRadius: '8px', 
                                        border: '1px solid #e5e7eb',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                    itemStyle={{ fontSize: '12px' }}
                                    labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                                />
                                {Object.keys(chartData[0])
                                    .filter((k) => k.startsWith("path_"))
                                    .map((key, index) => (
                                    <Line
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        stroke={index === 0 ? "#2563eb" : "#93c5fd"}
                                        strokeWidth={index === 0 ? 2 : 1}
                                        opacity={index === 0 ? 1 : 0.5}
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                    />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                            ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-lg bg-gray-50/50">
                                <Play className="w-8 h-8 mb-2 opacity-20" />
                                <p className="text-sm">Run simulation to visualize paths</p>
                            </div>
                            )}
                        </div>
                    </div>

                    {/* Payoff Histogram (Fixed TS Error) */}
                    {data && data.distribution && (
                      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                          <BarChart3 className="w-5 h-5 text-blue-600" />
                          <h3 className="font-semibold text-gray-900">Payoff Distribution</h3>
                        </div>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.distribution}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis 
                                dataKey="value" 
                                tickFormatter={(val) => `$${Number(val).toFixed(0)}`} 
                                tick={{ fontSize: 12 }} 
                                stroke="#9ca3af"
                                tickLine={false}
                                axisLine={false}
                              />
                              <Tooltip 
                                cursor={{ fill: '#f9fafb' }}
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                labelFormatter={(val) => `Payoff: ~$${Number(val).toFixed(2)}`}
                                // FIX: Use any to bypass strict Recharts type issue
                                formatter={(val: any) => [`${(Number(val) * 100).toFixed(1)}%`, 'Probability']}
                              />
                              <Bar dataKey="probability" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                </>
            )}

            {/* --- VALIDATION LAB VIEW --- */}
            {activeTab === "validation" && validationData && (
                <>
                    {/* Validation Scorecard */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                            Model Validation (European Option)
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Black-Scholes (Exact)</p>
                                <p className="text-3xl font-bold text-gray-900">${validationData.bs_price.toFixed(4)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Monte Carlo (Approx)</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-3xl font-bold text-gray-900">${validationData.mc_price.toFixed(4)}</p>
                                    <span className={`text-sm font-medium ${validationData.error_percent < 1 ? "text-emerald-600" : "text-amber-600"}`}>
                                        ({validationData.error_percent.toFixed(2)}% error)
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${validationData.within_confidence_interval ? "bg-emerald-50 border border-emerald-100 text-emerald-800" : "bg-red-50 border border-red-100 text-red-800"}`}>
                            {validationData.within_confidence_interval ? (
                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            )}
                            <div>
                                <p className="font-semibold text-sm">
                                    {validationData.within_confidence_interval 
                                        ? "Validation Passed" 
                                        : "Validation Warning"}
                                </p>
                                <p className="text-xs mt-1 opacity-90">
                                    {validationData.within_confidence_interval 
                                        ? "The exact Black-Scholes price falls within the Monte Carlo 95% confidence interval." 
                                        : "The exact price is outside the confidence interval. Try increasing simulation count (N)."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Convergence Chart */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-900">Convergence Analysis</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Demonstrating the Law of Large Numbers: As simulations (N) increase, the confidence interval narrows.
                            </p>
                        </div>
                        
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={validationData.convergence_data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis 
                                        dataKey="simulations" 
                                        stroke="#9ca3af"
                                        tick={{ fontSize: 12 }} 
                                    />
                                    <YAxis 
                                        domain={['auto', 'auto']} 
                                        stroke="#9ca3af"
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(val) => `$${val}`}
                                    />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="price" 
                                        stroke="#2563eb" 
                                        strokeWidth={2} 
                                        name="Price Estimate" 
                                        dot={{ r: 4, fill: "#2563eb" }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="ci_lower" 
                                        stroke="#94a3b8" 
                                        strokeDasharray="5 5" 
                                        dot={false} 
                                        name="Lower 95% CI" 
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="ci_upper" 
                                        stroke="#94a3b8" 
                                        strokeDasharray="5 5" 
                                        dot={false} 
                                        name="Upper 95% CI" 
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}