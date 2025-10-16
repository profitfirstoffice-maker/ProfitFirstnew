import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Calendar,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import { AiOutlineClose } from "react-icons/ai";
import axiosInstance from "../../axios";
import {PulseLoader} from "react-spinners";

const TinyChart = ({ data, strokeColor }) => (
  <ResponsiveContainer width="100%" height={50}>
    <LineChart data={data}>
      <Line
        type="monotone"
        dataKey="v"
        stroke={strokeColor}
        strokeWidth={2}
        dot={false}
      />
    </LineChart>
  </ResponsiveContainer>
);

const MetricCard = ({ title, value, change, changeType, label, chartData }) => {
  const isIncrease = changeType === "increase";
  const colorClass = isIncrease ? "text-green-400" : "text-red-400";
  const strokeColor = isIncrease ? "#4ade80" : "#f87171";
  const Icon = isIncrease ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm p-4 rounded-xl flex flex-col justify-between transition-all duration-300 ease-in-out hover:scale-105 hover:z-20 cursor-pointer">
      <div>
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        <div className="flex items-baseline space-x-2 mt-1">
          <p className="text-2xl font-semibold text-white">{value}</p>
          <div className={`flex items-center text-xs font-semibold ${colorClass}`}>
            <Icon className="w-3 h-3 mr-0.5" />
            <span>{change}</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </div>
      <div className="mt-2">
        <TinyChart data={chartData || []} strokeColor={strokeColor} />
      </div>
    </div>
  );
};

const Aiprediction = ({ onClose }) => {
  const [data, setData] = useState({
    metricsByMonth: {},
    dashboardData: null,
    mainChartsData: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("Revenue");

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await axiosInstance.get("/data/aiprediction");
        if (!isMounted) return;

        const responseData = res.data;
        setData({
          metricsByMonth: responseData?.metricsByMonth || {},
          dashboardData: responseData?.dashboardData || null,
          mainChartsData: responseData?.mainChartsData || {},
        });

        const monthKeys = Object.keys(responseData?.metricsByMonth || {});
        if (monthKeys.length > 0) {
          // Default to the first predicted month, or the last available month
          const firstPredictionIndex = responseData.mainChartsData?.Revenue.findIndex(m => m.Predicted !== null && m.Actual === null) ?? -1;
          if (firstPredictionIndex > 0) {
            setSelectedMonth(monthKeys[firstPredictionIndex]);
          } else {
            setSelectedMonth(monthKeys[monthKeys.length - 1]);
          }
        }
        
      } catch (e) {
        setError(e?.response?.data?.message || e.message || "Failed to load data");
      } finally {
        if(isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []); 

  const { metricsByMonth, dashboardData, mainChartsData } = data;

  const currentMetrics = useMemo(
    () => metricsByMonth?.[selectedMonth] || [],
    [metricsByMonth, selectedMonth]
  );

  const mainChartSeries = useMemo(
    () => (mainChartsData?.[selectedMetric] ? mainChartsData[selectedMetric] : []),
    [mainChartsData, selectedMetric]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0D1D1E]">
        <PulseLoader size={15} color="#12EB8E" />
      </div>
    );
  }

  if (error) {
    return ( 
      <div className="bg-gradient-to-br from-black to-emerald-900 text-white p-6 h-screen flex justify-center items-center">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-black to-emerald-900 text-white relative p-4 sm:p-6 lg:p-8 min-h-screen">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-20"
        title="Close AI Prediction"
      >
        <AiOutlineClose size={24} />
      </button>

      {/* Background Glow Effect */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-cyan-500/30 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/30 rounded-full filter blur-3xl opacity-20 animate-pulse animation-delay-4000"></div>

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <h1 className="text-xl sm:text-3xl font-bold text-white">
            AI-Powered Growth Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-800/60 px-3 py-1.5 rounded-lg">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
              <span className="font-bold text-lg">
                {dashboardData?.brand?.name || "—"}
              </span>
            </div>
            <select
              className="bg-slate-800/60 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {Object.keys(metricsByMonth || {}).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-6">
          {currentMetrics.slice(0, 4).map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-6">
          {currentMetrics.slice(4, 8).map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-slate-800/60 backdrop-blur-sm p-4 sm:p-6 rounded-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                Actual vs. Predicted {selectedMetric} (in thousands)
              </h2>
              <select
                className="bg-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
              >
                {Object.keys(mainChartsData || {}).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={mainChartSeries} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8" }} fontSize={12} />
                <YAxis tick={{ fill: "#94a3b8" }} fontSize={12} unit="k" />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(30, 41, 59, 0.8)", borderColor: "#475569", borderRadius: "0.5rem" }}
                  formatter={(value) => `₹${value}k`}
                />
                <Legend wrapperStyle={{ fontSize: "14px" }} />
                <Area type="monotone" dataKey="Actual" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" connectNulls />
                <Area type="monotone" dataKey="Predicted" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorPredicted)" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Sidebar with Insights */}
          <div className="space-y-6">
            <div className="bg-slate-800/60 backdrop-blur-sm p-4 sm:p-6 rounded-xl">
              <h3 className="font-semibold mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-cyan-400" />
                Upcoming Events
              </h3>
              <ul className="space-y-3">
                {(dashboardData?.upcomingEvents || []).map((event) => (
                  <li key={`${event.date}-${event.name}`} className="flex items-center text-sm">
                    <span className="bg-slate-700 text-slate-300 rounded-md px-2 py-0.5 text-xs font-mono mr-3">
                      {event.date}
                    </span>
                    <span>{event.name}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-800/60 backdrop-blur-sm p-4 sm:p-6 rounded-xl">
              <h3 className="font-semibold mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-cyan-400" />
                Actionable Insights
              </h3>
              <ul className="space-y-3">
                {(dashboardData?.actionableInsights || []).map((insight, i) => (
                  <li key={i} className="flex items-start text-sm">
                    <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 text-green-400 flex-shrink-0" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Financial Breakdown Table */}
        <div className="mt-6 bg-slate-800/60 backdrop-blur-sm p-4 sm:p-6 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Financial Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">COGS</th>
                  <th className="px-4 py-3">Gross Profit</th>
                  <th className="px-4 py-3">Operating Costs</th>
                  <th className="px-4 py-3">Net Profit</th>
                  <th className="px-4 py-3">Net Margin</th>
                </tr>
              </thead>
              <tbody>
                {(dashboardData?.financialBreakdown || []).map((row) => (
                  <tr key={row.month} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium text-white">{row.month}</td>
                    <td className="px-4 py-3">₹{row.cogs}</td>
                    <td className="px-4 py-3">₹{row.grossProfit}</td>
                    <td className="px-4 py-3">₹{row.operatingCosts}</td>
                    <td className="px-4 py-3 text-green-400 font-semibold">₹{row.netProfit}</td>
                    <td className="px-4 py-3 font-medium">{row.netProfitMargin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Aiprediction;