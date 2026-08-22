import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { SidebarProvider } from "@/context/SidebarContext";

/**
 * ROOT LAYOUT - MASTER PROMPT SECTION 5
 * Main application layout with sidebar, topbar, and content area
 */
export default function RootLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-[#F8FBFF] transition-colors font-sans text-[#0A192F]">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden bg-[#F8FBFF]">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-[#F8FBFF]">
            <div className="w-full px-6 py-6 lg:px-10 lg:py-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
