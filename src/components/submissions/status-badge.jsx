export default function StatusBadge({ status }) {
  const statusConfig = {
    SUBMITTED: {
      label: "Submitted",
      className: "bg-gray-100 text-gray-800",
    },
    UNDER_REVIEW: {
      label: "Under Review",
      className: "bg-yellow-100 text-yellow-800",
    },
    PARTIALLY_APPROVED: {
      label: "Partially Approved",
      className: "bg-blue-100 text-blue-800",
    },
    APPROVED: {
      label: "Approved",
      className: "bg-green-100 text-green-800",
    },
  };

  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}