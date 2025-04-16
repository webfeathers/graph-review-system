"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Menu, Bell, Settings, LogOut, User, ChevronDown } from "lucide-react";

export default function Header({ toggleSidebar }) {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
              type="button"
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={toggleSidebar}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-shrink-0">
              <Link href="/dashboard" className="flex items-center">
                <span className="text-lg font-bold text-blue-600">Graph Review System</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center">
            {/* Notifications */}
            <div className="relative ml-3">
              <button
                type="button"
                className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <span className="sr-only">View notifications</span>
                <Bell className="h-6 w-6" />
              </button>

              {notificationsOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                  <div className="py-1 px-2" role="menu" aria-orientation="vertical">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                      <p className="font-semibold">Notifications</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <p className="font-medium">New comment on your submission</p>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                      <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <p className="font-medium">Your submission was approved</p>
                        <p className="text-xs text-gray-500">Yesterday</p>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 px-4 py-2">