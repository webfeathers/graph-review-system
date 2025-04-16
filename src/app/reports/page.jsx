"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer 
} from "recharts";
import { Download, Filter } from "lucide-react";

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [submissionsByStatus, setSubmissionsByStatus] = useState([]);
  const [submissionsByUser, setSubmissionsByUser] = useState([]);
  const [responseTimeData, setResponseTimeData] = useState([]);
  const [approvalRateData, setApprovalRateData] = useState([]);
  const [timeRange, setTimeRange] = useState("last30days");
  
  // Colors for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];
  
  useEffect(() => {
    if (status === "authenticated") {
      fetchReportData();
    }
  }, [status, timeRange]);
  
  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch submission by status data
      const statusResponse = await fetch(`/api/reports/submissions-by-status?timeRange=${timeRange}`);
      const statusData = await statusResponse.json();
      setSubmissionsByStatus(statusData);
      
      // Fetch submission by user data
      const userResponse = await fetch(`/api/reports/submissions-by-user?timeRange=${timeRange}`);
      const userData = await userResponse.json();
      setSubmissionsByUser(userData);
      
      // Fetch response time data
      const responseTimeResponse = await fetch(`/api/reports/response-time?timeRange=${timeRange}`);
      const responseTimeData = await responseTimeResponse.json();
      setResponseTimeData(responseTimeData);
      
      // Fetch approval rate data
      const approvalRateResponse = await fetch(`/api/reports/approval-rate?timeRange=${timeRange}`);
      const approvalRateData = await approvalRateResponse.json();
      setApprovalRateData(approvalRateData);
      
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExportCSV = async (reportType) => {
    try {
      const response = await fetch(`/api/reports/export?type=${reportType}&timeRange=${timeRange}`);
      const blob = await response.blob();
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${reportType}-report.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting report:", error);
    }
  };
  
  const formatStatusLabel = (status) => {
    return status.replace("_", " ");
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        
        <div className="flex items-center space-x-3">
          <div className="relative inline-block">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="last90days">Last 90 Days</option>
              <option value="thisYear">This Year</option>
              <option value="allTime">All Time</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <Filter className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Submissions by Status */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Submissions by Status</h2>
            <button
              onClick={() => handleExportCSV("status")}
              className="text-blue-600 hover:text-blue-800"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={submissionsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="status"
                  label={({ name, percent }) => `${formatStatusLabel(name)}: ${(percent * 100).toFixed(0)}%`}
                >
                  {submissionsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, formatStatusLabel(name)]} />
                <Legend formatter={(value) => formatStatusLabel(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Submissions by User */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Submissions by User</h2>
            <button
              onClick={() => handleExportCSV("user")}
              className="text-blue-600 hover:text-blue-800"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={submissionsByUser}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Submissions" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Average Response Time */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Average Response Time (hours)</h2>
            <button
              onClick={() => handleExportCSV("response-time")}
              className="text-blue-600 hover:text-blue-800"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={responseTimeData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="averageHours" 
                  name="Avg. Hours" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Approval Rate */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Approval Rate Over Time</h2>
            <button
              onClick={() => handleExportCSV("approval-rate")}
              className="text-blue-600 hover:text-blue-800"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={approvalRateData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="approvalRate" 
                  name="Approval Rate (%)" 
                  stroke="#82ca9d" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Detailed Statistics */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Detailed Statistics</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Submissions</h3>
            <p className="text-2xl font-bold text-gray-900">
              {submissionsByStatus.reduce((sum, item) => sum + item.count, 0)}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500">Approval Rate</h3>
            <p className="text-2xl font-bold text-gray-900">
              {approvalRateData.length > 0
                ? `${approvalRateData[approvalRateData.length - 1].approvalRate}%`
                : "N/A"}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500">Avg. Response Time</h3>
            <p className="text-2xl font-bold text-gray-900">
              {responseTimeData.length > 0
                ? `${responseTimeData[responseTimeData.length - 1].averageHours.toFixed(1)} hrs`
                : "N/A"}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500">Most Active Reviewer</h3>
            <p className="text-2xl font-bold text-gray-900">
              {submissionsByUser.length > 0
                ? submissionsByUser.reduce((prev, current) => 
                    prev.count > current.count ? prev : current
                  ).name
                : "N/A"}
            </p>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Discussion Analytics</h3>
          <p className="text-sm text-gray-500">
            Average comments per submission: <span className="font-medium">4.2</span>
          </p>
          <p className="text-sm text-gray-500">
            Average back-and-forth before approval: <span className="font-medium">2.8</span> exchanges
          </p>
          <p className="text-sm text-gray-500">
            Most discussed submission: <span className="font-medium">Enterprise Onboarding Framework</span> (12 comments)
          </p>
        </div>
      </div>
    </div>
  );
}