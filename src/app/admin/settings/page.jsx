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
            <div cla