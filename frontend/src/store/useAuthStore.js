import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { io } from "socket.io-client";
import { useCallStore } from "./useCallStore";
import toast from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_SOCKET_URL;

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isCheckingAuth: true,
  onlineUsers: [],
  lastSeenMap: {},
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Auth error:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      get().disconnectSocket();

      // FIX: Aggressively wipe global WebRTC variables on logout
      useCallStore.getState().endCall(false);

      toast.success("Logged out");
    } catch (error) {
      toast.error("Logout failed");
    }
  },
  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
      withCredentials: true,
      secure: true,
    });

    socket.connect();
    set({ socket: socket });

    useCallStore.getState().initWebRTCListeners();

    socket.on("getOnlineUsers", (users) => set({ onlineUsers: users }));

    socket.on("userOffline", ({ userId, lastSeen }) => {
      set((state) => ({
        lastSeenMap: { ...state.lastSeenMap, [userId]: lastSeen },
      }));
    });
  },

  disconnectSocket: () => {
    if (get().socket) {
      get().socket.disconnect();
      set({ socket: null });
    }
  },
}));
