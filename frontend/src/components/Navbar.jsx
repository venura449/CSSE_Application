import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import ProfileOverlay from "./ProfileOverlay";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef();

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      setUser(u);
    } catch (e) {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    function onDoc(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  }

  return (
    <>
      <nav className="bg-white shadow-md px-8 py-4 flex justify-between items-center ">
        {/* 🌿 Logo */}
        <h1 className="text-2xl font-bold text-green-700 flex items-center gap-2">
          ♻️ WasteTrack Pro
        </h1>

        {/* 🔗 Navigation Links */}
        <div className="flex gap-6">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              isActive
                ? "text-green-700 font-medium border-b-2 border-green-600 pb-1"
                : "text-gray-700 hover:text-green-600 font-medium"
            }
          >
            Dashboard
          </NavLink>
          {/* Role-aware link: show Collector Dashboard for collectors */}
          {user && (user.role === "Collector" || user.role === "Authority") && (
            <NavLink
              to="/collector"
              className={({ isActive }) =>
                isActive
                  ? "text-green-700 font-medium border-b-2 border-green-600 pb-1"
                  : "text-gray-700 hover:text-green-600 font-medium"
              }
            >
              Collector
            </NavLink>
          )}
          <NavLink
            to="/waste-history"
            className={({ isActive }) =>
              isActive
                ? "text-green-700 font-medium border-b-2 border-green-600 pb-1"
                : "text-gray-700 hover:text-green-600 font-medium"
            }
          >
            Waste History
          </NavLink>
          <NavLink
            to="/collections"
            className={({ isActive }) =>
              isActive
                ? "text-green-700 font-medium border-b-2 border-green-600 pb-1"
                : "text-gray-700 hover:text-green-600 font-medium"
            }
          >
            Collections
          </NavLink>
          <NavLink
            to="/payments"
            className={({ isActive }) =>
              isActive
                ? "text-green-700 font-medium border-b-2 border-green-600 pb-1"
                : "text-gray-700 hover:text-green-600 font-medium"
            }
          >
            Payments
          </NavLink>
          <NavLink
            to="/sensors"
            className={({ isActive }) =>
              isActive
                ? "text-green-700 font-medium border-b-2 border-green-600 pb-1"
                : "text-gray-700 hover:text-green-600 font-medium"
            }
          >
            Sensors
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive
                ? "text-green-700 font-medium border-b-2 border-green-600 pb-1"
                : "text-gray-700 hover:text-green-600 font-medium"
            }
          >
            Settings
          </NavLink>
        </div>

        {/* 👤 User Info */}
        <div className="flex items-center gap-3 relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-3 focus:outline-none"
          >
            <span className="text-gray-500 text-sm">
              Hi,{" "}
              {user?.name ? user.name.split(" ")[0] : user?.email || "Guest"}
            </span>
            <img
              src={
                user?.email
                  ? `https://i.pravatar.cc/40?u=${user.email}`
                  : "https://i.pravatar.cc/40"
              }
              alt="user"
              className="rounded-full w-10 h-10 border border-gray-300"
            />
          </button>

          {open && (
            <div className="absolute right-0 mt-12 w-44 bg-white rounded shadow-lg py-2 z-40">
              <button
                onClick={() => {
                  setShowProfile(true);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {showProfile && (
        <ProfileOverlay user={user} onClose={() => setShowProfile(false)} />
      )}
    </>
  );
}
