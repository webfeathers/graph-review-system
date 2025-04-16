"use client";

import { useState } from "react";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <div className="flex h-screen bg-gray-50">
            <Sidebar isOpen={sidebarOpen} />
            
            <div className="flex flex-col flex-1 md:ml-64">
              <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
              
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
            
            {/* Overlay for mobile sidebar */}
            {sidebarOpen && (
              <div 
                className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}