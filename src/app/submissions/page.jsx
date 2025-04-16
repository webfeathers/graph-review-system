"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Search, Filter, ChevronDown } from "lucide-react";
import StatusBadge from "@/components/submissions/status-badge";

export default function SubmissionsPage() {
  const { data: session, status } = useSession();
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetchSubmissions();
    }
  }, [status]);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/submissions");
      const data = await response.json();
      setSubmissions(data);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter((submission) => {
    const matchesSearch =
      submission.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.orgId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter ? submission.status === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>

        {(session?.user?.role === "ADMIN" || session?.user?.role === "SUBMITTER") && (
          <Link
            href="/submissions/create"
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
          >
            New Submission
          </Link>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by title, customer, or org ID..."
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <button
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <Filter className="h-5 w-5 mr-2 text-gray-500" />
              <span>Filter</span>
              <ChevronDown className="h-4 w-4 ml-1 text-gray-500" />
            </button>

            {filterOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="p-2">
                  <div className="mb-2 text-sm font-medium text-gray-700">Status</div>
                  <div className="space-y-1">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="status"
                        checked={statusFilter === ""}
                        onChange={() => setStatusFilter("")}
                        className="mr-2"
                      />
                      <span className="text-sm">All</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="status"
                        checked={statusFilter === "SUBMITTED"}
                        onChange={() => setStatusFilter("SUBMITTED")}
                        className="mr-2"
                      />
                      <span className="text-sm">Submitted</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="status"
                        checked={statusFilter === "UNDER_REVIEW"}
                        onChange={() => setStatusFilter("UNDER_REVIEW")}
                        className="mr-2"
                      />
                      <span className="text-sm">Under Review</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="status"
                        checked={statusFilter === "PARTIALLY_APPROVED"}
                        onChange={() => setStatusFilter("PARTIALLY_APPROVED")}
                        className="mr-2"
                      />
                      <span className="text-sm">Partially Approved</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="status"
                        checked={statusFilter === "APPROVED"}
                        onChange={() => setStatusFilter("APPROVED")}
                        className="mr-2"
                      />
                      <span className="text-sm">Approved</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submissions List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">No submissions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Org ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted By
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubmissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/submissions/${submission.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {submission.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {submission.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {submission.orgId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={submission.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {submission.submittedBy.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}