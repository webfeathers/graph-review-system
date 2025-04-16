// src/components/dashboard/status-chart.jsx
"use client";

import { useState, useEffect } from "react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";

export default function StatusChart() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Define colors for each status
  const COLORS = ["#6366F1", "#FBBF24", "#34D399", "#F87171"];
  
  useEffect(() => {
    fetchStatusData();
  }, []);
  
  const fetchStatusData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/reports/submissions-by-status");
      
      if (response.ok) {
        const responseData = await response.json();
        setData(responseData);
      } else {
        // If API is not implemented yet, use dummy data
        setData([
          { status: "SUBMITTED", count: 12 },
          { status: "UNDER_REVIEW", count: 8 },
          { status: "PARTIALLY_APPROVED", count: 4 },
          { status: "APPROVED", count: 6 }
        ]);
      }
    } catch (error) {
      console.error("Error fetching status data:", error);
      // Fallback to dummy data
      setData([
        { status: "SUBMITTED", count: 12 },
        { status: "UNDER_REVIEW", count: 8 },
        { status: "PARTIALLY_APPROVED", count: 4 },
        { status: "APPROVED", count: 6 }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatStatusLabel = (status) => {
    return status.replace("_", " ");
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
            nameKey="status"
            label={({ name, percent }) => `${formatStatusLabel(name)}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [value, "Count"]}
            labelFormatter={(name) => formatStatusLabel(name)}
          />
          <Legend formatter={(value) => formatStatusLabel(value)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}