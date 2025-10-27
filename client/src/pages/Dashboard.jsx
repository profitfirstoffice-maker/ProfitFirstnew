import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import axiosInstance from "../../axios";
import { format } from "date-fns";

import {
  BarChart,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";
import { parse, isWithinInterval } from "date-fns";
import DateRangeSelector from "../components/DateRangeSelector";
import {PulseLoader} from "react-spinners";

// --- Helper Components (Card, Tooltips, etc.) remain the same ---

const Card = ({ title, value, formula }) => (
  <div className="group relative bg-[#161616] p-4 rounded-xl tooltip-wrapper">
    {formula && (
      <div className="bottom-full left-1/2 mb-2 w-max tooltip-box bg-gray-800 text-white text-xs rounded-md py-1 px-3 border border-gray-600 shadow-lg absolute transform -translate-x-1/2">
        {formula}
      </div>
    )}
    <div className="text-sm text-gray-300">{title}</div>
    <div className="text-xl font-bold text-white">
      {value != null ? value : "—"}
    </div>
  </div>
);
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#00131C] p-4 rounded-lg border border-gray-700 shadow-xl text-white">
        <p className="font-bold text-base mb-2">{label}</p>
        {payload.map((p, i) => (
          <div
            key={i}
            style={{
              color: p.color,
              display: "flex",
              justifyContent: "space-between",
              width: "180px",
            }}
          >
            <span>{p.name}:</span>
            <span className="font-semibold">
              {p.name.includes("Margin")
                ? `${p.value.toFixed(2)}%`
                : `₹${p.value.toLocaleString("en-IN")}`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const MarketingTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#00131C] p-4 rounded-lg border border-gray-700 shadow-xl text-white">
        <p className="font-bold text-base mb-2">{label}</p>
        {payload.map((p, i) => (
          <div
            key={i}
            style={{
              color: p.color,
              display: "flex",
              justifyContent: "space-between",
              width: "200px",
            }}
          >
            <span>{p.name}:</span>
            <span className="font-semibold">
              {p.name === "Spend"
                ? `₹${p.value.toLocaleString("en-IN")}`
                : p.name === "ROAS"
                ? `${p.value.toFixed(2)}%`
                : p.name === "Reach" || p.name === "Link Clicks"
                ? p.value.toLocaleString("en-IN")
                : p.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke={fill}
      />
    </g>
  );
};

const Dashboard = () => {
  // State for data, loading, and errors
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dateRange, setDateRange] = useState(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29);
    return { startDate, endDate };
  });
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [productView, setProductView] = useState("best");
  const [activeIndex, setActiveIndex] = useState(null);

  // Fetch effect
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      const startDateString = format(dateRange.startDate, "yyyy-MM-dd");
      const endDateString = format(dateRange.endDate, "yyyy-MM-dd")

      try {
        const response = await axiosInstance.get("/data/dashboard", {
          params: {
            startDate:startDateString,
            endDate:endDateString,
          },
        });
        setDashboardData(response.data);
      } catch (err) {
        setError("Failed to load dashboard data. Please try again later.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [dateRange]);

  // Derived safe variables to avoid undefined errors
  const pieData = dashboardData?.financialsBreakdownData?.pieData ?? [];
  const financialList = dashboardData?.financialsBreakdownData?.list ?? [];
  const revenueValue = dashboardData?.financialsBreakdownData?.revenue ?? 0;
  const bestSelling = dashboardData?.products?.bestSelling ?? [];
  const leastSelling = dashboardData?.products?.leastSelling ?? [];
  const websiteOverview = dashboardData?.website ?? [];
  const summaryCards = dashboardData?.summary ?? [];
  const marketingCards = dashboardData?.marketing ?? [];
  const shippingCards = dashboardData?.shipping ?? [];
  const performanceChartData = dashboardData?.performanceChartData ?? [];
  const customerTypeByDay = dashboardData?.charts?.customerTypeByDay ?? [];
  const marketingChart = dashboardData?.charts?.marketing ?? [];



  // Handlers
  const onPieEnter = (_, index) => setActiveIndex(index);
  const onPieLeave = () => setActiveIndex(null);
  const onListHover = (name) => {
    const index = pieData.findIndex((item) => item.name === name);
    if (index >= 0) setActiveIndex(index);
  };

  const handleApply = (range) => {
    setDateRange(range);
    setShowDateSelector(false);
  };




  // --- Place this logic inside your Dashboard component, after the other state hooks ---

  // New state for shipping pie charts
  const [orderTypeActiveIndex, setOrderTypeActiveIndex] = useState(null);
  const [shipmentStatusActiveIndex, setShipmentStatusActiveIndex] = useState(null);

  // New data transformation using useMemo for efficiency
  const { orderTypeData, shipmentStatusData } = useMemo(() => {
    // Helper to safely find a value from the shippingCards array
    const findValue = (title) => shippingCards.find(c => c.title === title)?.value || 0;
    
    // Data for the "Order Type" (Prepaid/COD) pie chart
    const newOrderTypeData = [
      { name: 'Prepaid', value: findValue('Prepaid Orders'), color: '#3B82F6' },
      { name: 'COD', value: findValue('COD'), color: '#FBBF24' },
    ].filter(item => item.value > 0); // Only include items with a value > 0

    // Data for the "Shipment Status" pie chart
    const newShipmentStatusData = [
      { name: 'Delivered', value: findValue('Delivered'), color: '#10B981' },
      { name: 'In-Transit', value: findValue('In-Transit'), color: '#6366F1' },
      { name: 'RTO', value: findValue('RTO'), color: '#F44336' },
      { name: 'NDR Pending', value: findValue('NDR Pending'), color: '#F59E0B' },
      { name: 'Pickup Pending', value: findValue('Pickup Pending'), color: '#9CA3AF' },
    ].filter(item => item.value > 0);
    
    return { orderTypeData: newOrderTypeData, shipmentStatusData: newShipmentStatusData };
  }, [shippingCards]); // This logic re-runs only when shippingCards data changes

  // New handlers for the shipping pie charts
  const onOrderPieEnter = (_, index) => setOrderTypeActiveIndex(index);
  const onOrderListHover = (name) => {
    const index = orderTypeData.findIndex((item) => item.name === name);
    if (index >= 0) setOrderTypeActiveIndex(index);
  }

  const onShipmentPieEnter = (_, index) => setShipmentStatusActiveIndex(index);
  const onShipmentListHover = (name) => {
    const index = shipmentStatusData.findIndex((item) => item.name === name);
    if (index >= 0) setShipmentStatusActiveIndex(index);
  }
  
  // A reusable legend component for our new pie charts
  const PieLegend = ({ data, onHover, onLeave }) => (
    <div className="flex flex-col justify-center space-y-3">
        {data.map((item) => (
            <div
                key={item.name}
                className="flex items-center cursor-pointer"
                onMouseEnter={() => onHover(item.name)}
                onMouseLeave={onLeave}
            >
                <div style={{ backgroundColor: item.color }} className="w-3 h-3 rounded-sm mr-3"></div>
                <div className="flex flex-col">
                    <span className="text-gray-400 text-sm">{item.name}</span>
                    <span className="text-white font-semibold">
                        {item.value.toLocaleString("en-IN")}
                    </span>
                </div>
            </div>
        ))}
    </div>
  );

  if (isLoading) {
    return (
       <div className="flex items-center justify-center h-screen bg-[#0D1D1E]">
        <PulseLoader size={15} color="#12EB8E" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500 bg-[#0D1D1E]">
        {error}
      </div>
    );
  }
  if (!dashboardData) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white bg-[#0D1D1E]">
        No data available for the selected period.
      </div>
    );
  }

  return (
    <div className="p-6 text-white space-y-6 overflow-x-hidden bg-[#0D1D1E] min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex items-center gap-4 relative">
          <button
            onClick={() => setShowDateSelector(!showDateSelector)}
            className="px-3 py-1 rounded-md text-sm border bg-[#161616] border-gray-700"
          >
            {`${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`}
          </button>
          {showDateSelector && (
            <div className="absolute top-full mt-2 right-0 z-50 bg-[#161616] rounded-lg shadow-lg border border-gray-700">
              <DateRangeSelector onApply={handleApply} initialRange={dateRange} />
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 w-full">
        {summaryCards.map(({ title, value, formula }) => (
          <Card key={title} title={title} value={value} formula={formula} />
        ))}
      </div>

      {/* Performance Chart */}
      <div className="bg-[#00131C] rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Performance</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={performanceChartData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <defs>
                <linearGradient
                  id="revenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#00A389" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00A389" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis
                yAxisId="left"
                stroke="#4B5563"
                tick={{ fill: "#9CA3AF" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₹${value / 1000}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#4B5563"
                tick={{ fill: "#9CA3AF" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <XAxis
                dataKey="name"
                stroke="#4B5563"
                tick={{ fill: "#9CA3AF" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                fill="url(#revenueGradient)"
                stroke="#00A389"
                name="Revenue"
                yAxisId="left"
              />
              <Line
                type="monotone"
                dataKey="netProfit"
                stroke="#E3D35E"
                dot={false}
                strokeWidth={2}
                name="Net Profit"
                yAxisId="left"
              />
              <Bar
                dataKey="totalCosts"
                barSize={10}
                fill="#3B82F6"
                name="Total Costs"
                yAxisId="left"
              />
              <Line
                type="monotone"
                dataKey="netProfitMargin"
                stroke="#F44336"
                dot={false}
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Net Profit Margin"
                yAxisId="right"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost Breakdown */}
  <div className="bg-[#00131C] rounded-2xl p-6">
    <h3 className="text-xl font-bold text-white mb-6">Cost Breakdown</h3>
    <div className="flex items-center justify-around">
          <div className="w-64 h-64 relative">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={entry.color}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No breakdown data
              </div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-gray-400 text-sm">Revenue</span>
              <span className="text-white font-bold text-3xl">
                ₹{revenueValue.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
           <div className="grid grid-cols-3 gap-x-12 gap-y-4">
            {financialList.map((item) => (
                <div
                    key={item.name}
                    className="flex items-center cursor-pointer"
                    onMouseEnter={() => onListHover(item.name)}
                    onMouseLeave={onPieLeave}
                >
                    <div
                        style={{ backgroundColor: item.color }}
                        className="w-3 h-3 rounded-sm mr-3"
                    ></div>
                    <div className="flex flex-col">
                        <span className="text-gray-400 text-sm">{item.name}</span>
                        <span className="text-white font-semibold">
                            {/* --- FIX APPLIED HERE --- */}
                            {item.value != null
                                ? `₹${item.value.toLocaleString("en-IN")}`
                                : "—"
                            }
                        </span>
                    </div>
                </div>
            ))}
        </div>
    </div>
</div>

      {/* Marketing Section */}
      <h2 className="text-2xl font-bold pt-6">Marketing</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
        {marketingCards.map(({ title, value, formula }) => (
          <Card key={title} title={title} value={value} formula={formula} />
        ))}
      </div>

      {/* Marketing Performance Chart */}
      <div className="bg-[#00131C] rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">
          Marketing Performance
        </h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={marketingChart}
              margin={{ top: 20, right: 40, bottom: 20, left: 20 }}
            >
              <XAxis
                dataKey="name"
                stroke="#4B5563"
                tick={{ fill: "#9CA3AF" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                stroke="#4B5563"
                tick={{ fill: "#9CA3AF" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#4B5563"
                tick={{ fill: "#9CA3AF" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v.toFixed(2)}%`}
              />
              <Tooltip content={<MarketingTooltip />} />
              <Bar
                dataKey="spend"
                name="Spend"
                yAxisId="left"
                barSize={8}
                fill="#10B981"
              />
              <Bar
                dataKey="reach"
                name="Reach"
                yAxisId="left"
                barSize={8}
                fill="#6366F1"
              />
              <Bar
                dataKey="linkClicks"
                name="Link Clicks"
                yAxisId="left"
                barSize={8}
                fill="#F59E0B"
              />
              <Line
                type="monotone"
                dataKey="roas"
                name="ROAS"
                yAxisId="right"
                dot={false}
                strokeWidth={2}
                stroke="#FBBF24"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      

      {/* Website Overview */}
      <div className="pb-6">
        <h2 className="text-2xl font-bold mb-4 pt-6">🛍️ Website Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {websiteOverview.map(({ title, value, formula }) => (
            <Card key={title} title={title} value={value} formula={formula} />
          ))}
        </div>

        
      {/* Best & Least Selling Products */}
      <div className="bg-[#161616] mt-10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="space-x-2">
            {["best", "least"].map((type) => (
              <button
                key={type}
                onClick={() => setProductView(type)}
                className={`px-3 py-2 rounded-lg text-sm ${
                  productView === type
                    ? "bg-[#434343] text-white font-bold"
                    : "bg-[#2a2a2a] text-gray-400"
                }`}
              >
                {type === "best"
                  ? "Best Selling Products"
                  : "Least Selling Products"}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[225px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          <table className="w-full text-left text-white">
            <thead className="border-b border-gray-700 sticky top-0 bg-[#161616]">
              <tr className="text-gray-400 text-sm">
                <th className="py-2 px-2">NO.</th>
                <th className="py-2 px-2">Product Name</th>
                <th className="py-2 px-2">Orders</th>
                <th className="py-2 px-2">Total Sales</th>
              </tr>
            </thead>
            <tbody>
              {(productView === "best" ? bestSelling : leastSelling).map(
                (product, idx) => (
                  <tr
                    key={product.id || idx}
                    className="border-b border-gray-800 text-sm"
                  >
                    <td className="py-3 px-2">{idx + 1}</td>
                    <td className="py-3 px-2">{product.name}</td>
                    <td className="py-3 px-2">{product.sales}</td>
                    <td className="py-3 px-2">{product.total}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

        {/* Customer Type Breakdown (new vs returning per day) */}
        <div className="bg-[#00131C] rounded-2xl p-6 mt-6">
          <h3 className="text-xl font-bold text-white mb-4">
            Customer Type (New vs Returning)
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={customerTypeByDay}
                margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
              >
                <XAxis
                  dataKey="name"
                  stroke="#4B5563"
                  tick={{ fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#4B5563"
                  tick={{ fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value, name) => {
                    return [value, name === "newCustomers" ? "New" : "Returning"];
                  }}
                  contentStyle={{
                    backgroundColor: "#161616",
                    border: "1px solid #2e2e2e",
                  }}
                />
                <Bar
                  dataKey="newCustomers"
                  stackId="a"
                  name="New Customers"
                  fill="#22c55e"
                />
                <Bar
                  dataKey="returningCustomers"
                  stackId="a"
                  name="Returning Customers"
                  fill="#6366F1"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      
      </div>


       <h2 className="text-2xl font-bold pt-6">Shipping</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
        {shippingCards.map(({ title, value, formula }) => (
          <Card key={title} title={title} value={value} formula={formula} />
        ))}
      </div>


{/* --- Paste this entire JSX block after your Shipping cards section --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* Card for Order Type Pie Chart */}
        <div className="bg-[#00131C] rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">Order Type Breakdown</h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
             <div className="w-48 h-48">
               {orderTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      activeIndex={orderTypeActiveIndex}
                      activeShape={renderActiveShape}
                      data={orderTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                      onMouseEnter={onOrderPieEnter}
                      onMouseLeave={() => setOrderTypeActiveIndex(null)}
                    >
                      {orderTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color}/>
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
               ) : <div className="flex items-center justify-center h-full text-gray-400">No Order Data</div>}
             </div>
             <PieLegend data={orderTypeData} onHover={onOrderListHover} onLeave={() => setOrderTypeActiveIndex(null)} />
          </div>
        </div>

        {/* Card for Shipment Status Pie Chart */}
        <div className="bg-[#00131C] rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">Shipment Status</h3>
           <div className="flex flex-col sm:flex-row items-center justify-around gap-8">
             <div className="w-48 h-48">
               {shipmentStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        activeIndex={shipmentStatusActiveIndex}
                        activeShape={renderActiveShape}
                        data={shipmentStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                        onMouseEnter={onShipmentPieEnter}
                        onMouseLeave={() => setShipmentStatusActiveIndex(null)}
                      >
                        {shipmentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color}  />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
               ): <div className="flex items-center justify-center h-full text-gray-400">No Status Data</div>}
             </div>
             <PieLegend data={shipmentStatusData} onHover={onShipmentListHover} onLeave={() => setShipmentStatusActiveIndex(null)} />
          </div>
        </div>
      </div>
      {/* --- End of the new Pie Charts section --- */}






    </div>
  );
};

export default Dashboard;
