import { isMobile } from "react-device-detect";
import ReportsSidebar from "@/components/ReportsSidebar";
import { Outlet } from "react-router-dom";

export default function Reports() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <ReportsSidebar />
      <div
        style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
        className="relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full h-full overflow-y-scroll p-4 md:p-0"
      >
        <Outlet />
      </div>
    </div>
  );
}
