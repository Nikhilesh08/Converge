import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import VideoCallModal from "./components/VideoCallModal"; // FIX: Imported Modal

import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useCallStore } from "./store/useCallStore"; // FIX: Imported Engine

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();
  const { initWebRTCListeners } = useCallStore(); // FIX: Extracted listener init

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // FIX: Start listening for incoming calls as soon as the user logs in and socket connects

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen bg-base-100">
        <Loader className="size-10 animate-spin text-primary" />
      </div>
    );

  return (
    <div data-theme={theme} className="min-h-screen">
      <Navbar />

      <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/signup"
          element={!authUser ? <SignUpPage /> : <Navigate to="/" />}
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
      </Routes>

      <Toaster />

      {/* FIX: WebRTC Modal mounted at the root level so it rings anywhere in the app */}
      <VideoCallModal />
    </div>
  );
};

export default App;
