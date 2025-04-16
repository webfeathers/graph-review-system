"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  FileText, 
  BarChart2, 
  Users, 
  Settings,
  Clock,
  PlusCircle
} from "lucide-react";

export default function Sidebar({ isOpen }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isActive = (path) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const linkClasses = (path) => {
    return `flex items-center px-4 py-2 text-sm rounded-md ${
      isActive(path)
        ? "bg-blue-100 text-blue-700 font-medium"
        : "text-gray-700 hover:bg-gray-100"
    }`;
  };

  return (
    <div
      className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="h-full flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-blue-600">Graph Review</h2>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <Link href="/dashboard" className={linkClasses("/dashboard")}>
            <Home className="mr-3 h-5 w-5" />
            Dashboard
          </Link>

          <Link href="/submissions" className={linkClasses("/submissions")}>
            <FileText className="mr-3 h-5 w-5" />
            Submissions
          </Link>

          <Link href="/submissions/create" className={linkClasses("/submissions/create")}>
            <PlusCircle className="mr-3 h-5 w-5" />
            New Submission
          </Link>

          <Link href="/reports" className={linkClasses("/reports")}>
            <BarChart2 className="mr-3 h-5 w-5" />
            Reports
          </Link>
          
          <Link href="/sla" className={linkClasses("/sla")}>
            <Clock className="mr-3 h-5 w-5" />
            SLA Tracking
          </Link>

          {session?.user?.role === "ADMIN" && (
            <>
              <div className="px-3 py-2 mt-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Admin
                </h3>
              </div>

              <Link href="/admin/users" className={linkClasses("/admin/users")}>
                <Users className="mr-3 h-5 w-5" />
                User Management
              </Link>

              <Link href="/admin/settings" className={linkClasses("/admin/settings")}>
                <Settings className="mr-3 h-5 w-5" />
                System Settings
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <p>Graph Review System</p>
            <p>Version 1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}