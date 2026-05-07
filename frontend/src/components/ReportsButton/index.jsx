import useUser from "@/hooks/useUser";
import paths from "@/utils/paths";
import { ChartLine } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export default function ReportsButton() {
  const { user } = useUser();

  // Only show for managers and admins
  if (!user || (user?.role && user?.role === "default")) return null;

  return (
    <div className="flex w-fit">
      <Link
        to={paths.reports.home()}
        className="transition-all duration-300 p-2 rounded-full bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover"
        aria-label="Reports"
        data-tooltip-id="footer-item"
        data-tooltip-content="Open reports"
      >
        <ChartLine
          className="h-5 w-5 text-white light:text-slate-800"
          weight="fill"
        />
      </Link>
    </div>
  );
}
