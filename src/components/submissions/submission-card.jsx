// src/components/submissions/submission-card.jsx
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import StatusBadge from "./status-badge";

export default function SubmissionCard({ submission }) {
  const { id, title, customerName, status, createdAt, submittedBy, slaDeadline } = submission;
  
  const isPastDeadline = slaDeadline && new Date(slaDeadline) < new Date();
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-5">
        <div className="flex justify-between items-start">
          <Link 
            href={`/submissions/${id}`}
            className="text-lg font-medium text-blue-600 hover:text-blue-800"
          >
            {title}
          </Link>
          <StatusBadge status={status} />
        </div>
        
        <p className="mt-2 text-sm text-gray-500">
          Customer: {customerName}
        </p>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500">
            <span>Submitted {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
            <span className="mx-2">•</span>
            <span>By {submittedBy.name}</span>
          </div>
          
          {slaDeadline && (
            <div className={`text-sm ${isPastDeadline ? "text-red-600" : "text-gray-500"}`}>
              {isPastDeadline ? (
                <span>SLA Expired</span>
              ) : (
                <span>Due {formatDistanceToNow(new Date(slaDeadline), { addSuffix: true })}</span>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-gray-50 px-5 py-3">
        <Link
          href={`/submissions/${id}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}