"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle, Save, Plus, Trash } from "lucide-react";

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [slaConfigs, setSlaConfigs] = useState([]);
  const [newSlaConfig, setNewSlaConfig] = useState({
    statusFrom: "SUBMITTED",
    statusTo: "UNDER_REVIEW",
    durationHours: 24,
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const statuses = ["SUBMITTED", "UNDER_REVIEW", "PARTIALLY_APPROVED", "APPROVED"];

  useEffect(() => {
    if (status === "authenticated") {
      if (session.user.role !== "ADMIN") {
        router.push("/dashboard");
        return;
      }
      
      fetchSLAConfigs();
    }
  }, [status, session, router]);

  const fetchSLAConfigs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/sla");
      const data = await response.json();
      setSlaConfigs(data);
    } catch (error) {
      console.error("Error fetching SLA configs:", error);
      setErrorMessage("Failed to load SLA configurations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSLA = () => {
    // Check for duplicate
    const isDuplicate = slaConfigs.some(
      config => 
        config.statusFrom === newSlaConfig.statusFrom && 
        config.statusTo === newSlaConfig.statusTo
    );
    
    if (isDuplicate) {
      setErrorMessage("An SLA for this status transition already exists");
      return;
    }
    
    setSlaConfigs([...slaConfigs, { ...newSlaConfig, id: `temp-${Date.now()}` }]);
    setNewSlaConfig({
      statusFrom: "SUBMITTED",
      statusTo: "UNDER_REVIEW",
      durationHours: 24,
    });
    setErrorMessage("");
  };

  const handleUpdateSLA = (id, field, value) => {
    setSlaConfigs(
      slaConfigs.map(config => 
        config.id === id ? { ...config, [field]: value } : config
      )
    );
  };

  const handleRemoveSLA = (id) => {
    setSlaConfigs(slaConfigs.filter(config => config.id !== id));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    
    try {
      const response = await fetch("/api/admin/sla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slaConfigs }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save SLA configurations");
      }
      
      setSuccessMessage("SLA configurations saved successfully");
      fetchSLAConfigs(); // Refresh data
    } catch (error) {
      console.error("Error saving SLA configs:", error);
      setErrorMessage("Failed to save SLA configurations");
    } finally {
      setIsSaving(false);
    }
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">System Settings</h1>
      
      {/* SLA Configuration */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">SLA Configuration</h2>
          <p className="mt-1 text-sm text-gray-500">
            Define the timeframes for each status transition
          </p>
        </div>
        
        <div className="px-6 py-4">
          {errorMessage && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
            </div>
          )}
          
          {successMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm text-green-600">{successMessage}</p>
            </div>
          )}
          
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Current SLA Rules</h3>
            
            {slaConfigs.length === 0 ? (
              <p className="text-sm text-gray-500">No SLA rules defined yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        From Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        To Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timeframe (Hours)
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {slaConfigs.map((config) => (
                      <tr key={config.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={config.statusFrom}
                            onChange={(e) => handleUpdateSLA(config.id, "statusFrom", e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          >
                            {statuses.map((status) => (
                              <option key={status} value={status}>
                                {status.replace("_", " ")}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={config.statusTo}
                            onChange={(e) => handleUpdateSLA(config.id, "statusTo", e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          >
                            {statuses.map((status) => (
                              <option key={status} value={status}>
                                {status.replace("_", " ")}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            min="1"
                            value={config.durationHours}
                            onChange={(e) => handleUpdateSLA(config.id, "durationHours", parseInt(e.target.value))}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleRemoveSLA(config.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Add New SLA Rule</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="statusFrom" className="block text-sm font-medium text-gray-700">
                  From Status
                </label>
                <select
                  id="statusFrom"
                  value={newSlaConfig.statusFrom}
                  onChange={(e) => setNewSlaConfig({...newSlaConfig, statusFrom: e.target.value})}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="statusTo" className="block text-sm font-medium text-gray-700">
                  To Status
                </label>
                <select
                  id="statusTo"
                  value={newSlaConfig.statusTo}
                  onChange={(e) => setNewSlaConfig({...newSlaConfig, statusTo: e.target.value})}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="durationHours" className="block text-sm font-medium text-gray-700">
                  Timeframe (Hours)
                </label>
                <input
                  id="durationHours"
                  type="number"
                  min="1"
                  value={newSlaConfig.durationHours}
                  onChange={(e) => setNewSlaConfig({
                    ...newSlaConfig, 
                    durationHours: parseInt(e.target.value)
                  })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <button
                onClick={handleAddSLA}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add SLA Rule
              </button>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Salesforce Integration */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Salesforce Integration</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure your Salesforce integration settings
          </p>
        </div>
        
        <div className="px-6 py-4">
          <div className="mb-4">
            <label htmlFor="sfUrl" className="block text-sm font-medium text-gray-700">
              Salesforce Instance URL
            </label>
            <input
              type="text"
              id="sfUrl"
              placeholder="https://yourinstance.salesforce.com"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="sfToken" className="block text-sm font-medium text-gray-700">
              API Token
            </label>
            <input
              type="password"
              id="sfToken"
              placeholder="Your Salesforce API token"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
            
          <div className="mb-6">
            <div className="relative flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="enableSf"
                  type="checkbox"
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="enableSf" className="font-medium text-gray-700">
                  Enable Salesforce Integration
                </label>
                <p className="text-gray-500">
                  Automatically update Salesforce when a submission status changes
                </p>
              </div>
            </div>
          </div>
            
          <div className="flex justify-end">
            <button
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Salesforce Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}