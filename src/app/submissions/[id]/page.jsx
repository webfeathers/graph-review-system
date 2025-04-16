"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronLeft, FileText, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import StatusBadge from "@/components/submissions/status-badge";
import CommentThread from "@/components/submissions/comment-thread";
import { formatDistanceToNow, isPast } from "date-fns";

export default function SubmissionDetailPage({ params }) {
  const { id } = params;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [submission, setSubmission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusHistory, setStatusHistory] = useState([]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchSubmission();
      fetchStatusHistory();
    }
  }, [status, id]);

  const fetchSubmission = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/submissions/${id}`);
      if (!response.ok) {
        throw new Error("Submission not found");
      }
      const data = await response.json();
      setSubmission(data);
    } catch (error) {
      console.error("Error fetching submission:", error);
      router.push("/submissions");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatusHistory = async () => {
    try {
      const response = await fetch(`/api/submissions/${id}/history`);
      const data = await response.json();
      setStatusHistory(data);
    } catch (error) {
      console.error("Error fetching status history:", error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!session?.user) return;
    
    setIsUpdating(true);
    
    try {
      const response = await fetch(`/api/submissions/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update status");
      }
      
      // Refresh submission data
      fetchSubmission();
      fetchStatusHistory();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const canChangeStatus = () => {
    if (!session?.user) return false;
    
    // Admins can always change status
    if (session.user.role === "ADMIN") return true;
    
    // Reviewers can change status
    if (session.user.role === "REVIEWER") return true;
    
    // Submitters can only change back to submitted if it was rejected
    if (session.user.role === "SUBMITTER" && 
        submission.submittedById === session.user.id &&
        submission.status === "REJECTED") {
      return true;
    }
    
    return false;
  };

  const getNextStatuses = () => {
    const currentStatus = submission.status;
    
    // Define possible transitions based on current status
    const transitions = {
      SUBMITTED: ["UNDER_REVIEW"],
      UNDER_REVIEW: ["PARTIALLY_APPROVED", "APPROVED", "SUBMITTED"],
      PARTIALLY_APPROVED: ["APPROVED", "UNDER_REVIEW"],
      APPROVED: ["UNDER_REVIEW"],
    };
    
    return transitions[currentStatus] || [];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">Submission not found.</p>
          <Link href="/submissions" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
            Back to Submissions
          </Link>
        </div>
      </div>
    );
  }

  const isSlaExpired = submission.slaDeadline && isPast(new Date(submission.slaDeadline));

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Link
          href="/submissions"
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Submissions
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{submission.title}</h1>
              <div className="mt-1 flex items-center">
                <StatusBadge status={submission.status} />
                {submission.slaDeadline && (
                  <div className={`ml-3 flex items-center text-sm ${isSlaExpired ? 'text-red-600' : 'text-gray-500'}`}>
                    <Clock className="h-4 w-4 mr-1" />
                    {isSlaExpired ? (
                      <span className="flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-1 text-red-600" />
                        SLA Expired
                      </span>
                    ) : (
                      <span>
                        Due {formatDistanceToNow(new Date(submission.slaDeadline), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {canChangeStatus() && (
              <div className="flex">
                {getNextStatuses().map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={isUpdating}
                    className="ml-3 inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {status === "SUBMITTED" ? "Return to Submitter" : status.replace("_", " ")}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="space-y-6">
                {/* Submission Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Details</h3>
                  <div className="mt-3 border border-gray-200 rounded-md overflow-hidden">
                    <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                      <dt className="text-sm font-medium text-gray-500">Customer Name</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {submission.customerName}
                      </dd>
                    </div>
                    <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Organization ID</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {submission.orgId}
                      </dd>
                    </div>
                    <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                      <dt className="text-sm font-medium text-gray-500">Submitted By</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center">
                        {submission.submittedBy.image ? (
                          <Image
                            src={submission.submittedBy.image}
                            alt={submission.submittedBy.name}
                            width={24}
                            height={24}
                            className="h-6 w-6 rounded-full mr-2"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                            <span className="text-xs text-gray-500">
                              {submission.submittedBy.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        {submission.submittedBy.name}
                      </dd>
                    </div>
                    <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Date Submitted</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {new Date(submission.createdAt).toLocaleString()}
                      </dd>
                    </div>
                    <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                      <dt className="text-sm font-medium text-gray-500">Salesforce Sync</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {submission.sfSyncStatus ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-green-100 text-green-800">
                            Synced
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                      </dd>
                    </div>
                  </div>
                </div>
                
                {/* Comments */}
                <CommentThread submissionId={id} />
              </div>
            </div>
            
            {/* Sidebar */}
            <div>
              {/* Status History */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Status History</h3>
                {statusHistory.length === 0 ? (
                  <p className="text-sm text-gray-500">No status changes yet.</p>
                ) : (
                  <div className="relative">
                    <div className="absolute top-0 bottom-0 left-2.5 w-0.5 bg-gray-200"></div>
                    <ul className="space-y-3">
                      {statusHistory.map((item, index) => (
                        <li key={item.id} className="relative pl-8">
                          <div className="absolute left-0 top-2 h-5 w-5 rounded-full border-2 border-blue-600 bg-white"></div>
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">
                              {item.oldStatus ? (
                                <span>
                                  Changed from{" "}
                                  <StatusBadge status={item.oldStatus} /> to{" "}
                                  <StatusBadge status={item.newStatus} />
                                </span>
                              ) : (
                                <span>
                                  Created with status <StatusBadge status={item.newStatus} />
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(item.changedAt).toLocaleString()}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* Documents */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Files</h3>
                <div className="p-4 text-center">
                  <FileText className="h-10 w-10 text-gray-400 mx-auto" />
                  <p className="mt-2 text-sm text-gray-500">No files uploaded yet.</p>
                  <button className="mt-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Upload File
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}