import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, MessageSquare, Settings, User } from "lucide-react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const location = useLocation();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isSettingsPage = location.pathname === "/settings";
  const isProfilePage = location.pathname === "/profile";

  return (
    <>
      <header
        className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 
      backdrop-blur-lg bg-base-100/80"
      >
        {/* FIX: Removed 'container mx-auto' so the Navbar stretches perfectly edge-to-edge with the Sidebar */}
        <div className="w-full px-4 h-16">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-8">
              <Link
                to="/"
                className="flex items-center gap-2.5 hover:opacity-80 transition-all"
              >
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-lg font-bold tracking-tight">Converge</h1>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={isSettingsPage ? "/" : "/settings"}
                className={`btn btn-sm gap-2 transition-colors ${
                  isSettingsPage
                    ? "btn-primary text-primary-content"
                    : "btn-ghost"
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {isSettingsPage ? "Close Settings" : "Settings"}
                </span>
              </Link>

              {authUser && (
                <>
                  <Link
                    to={isProfilePage ? "/" : "/profile"}
                    className={`btn btn-sm gap-2 transition-colors ${
                      isProfilePage
                        ? "btn-primary text-primary-content"
                        : "btn-ghost"
                    }`}
                  >
                    <User className="size-5" />
                    <span className="hidden sm:inline">
                      {isProfilePage ? "Close Profile" : "Profile"}
                    </span>
                  </Link>

                  <button
                    className="btn btn-sm btn-ghost gap-2 flex items-center hover:bg-error/20 hover:text-error transition-colors"
                    onClick={() => setShowLogoutModal(true)}
                  >
                    <LogOut className="size-5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* The Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-base-100 p-6 rounded-2xl shadow-xl border border-base-300 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-2">Confirm Logout</h3>
            <p className="text-base-content/70 mb-6">
              Are you sure you want to log out of Converge? You'll stop
              receiving real-time messages.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="btn btn-ghost"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
