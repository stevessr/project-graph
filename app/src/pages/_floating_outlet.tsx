import { X } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Popin from "../components/Popin";

export default function FloatingOutlet() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Popin show={location.pathname !== "/"}>
      <div className="bg-settings-page-bg shadow-settings-page-bg fixed top-1/2 left-1/2 z-[70] h-8/9 w-7/8 -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-2xl lg:w-4/5">
        <Outlet />
        <X
          className="text-panel-text absolute top-4 right-4 cursor-pointer hover:rotate-90"
          id="close-popin-btn"
          onClick={() => {
            navigate("/");
          }}
        />
      </div>
    </Popin>
  );
}
