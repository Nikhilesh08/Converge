import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

// FIX: Safely strip trailing slashes for Socket.IO origin checks as well
const parseAllowedOrigins = () =>
  (process.env.CLIENT_URL || process.env.FRONTEND_URL || "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  const allowedOrigins = parseAllowedOrigins();
  return (
    allowedOrigins.includes(origin) ||
    origin === "http://localhost:5173" ||
    origin === "http://localhost:3000" ||
    origin === "http://127.0.0.1:5173"
  );
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by Socket.IO CORS`));
    },
    credentials: true,
  },
});

io.engine.on("connection_error", (err) => {
  console.error("Socket.IO connection error:", err.message);
});

const userSocketMap = {};
const userActiveChat = {};

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

export function isUserActiveInChat(userId, chatTargetId) {
  return userActiveChat[userId] === chatTargetId;
}

io.on("connection", (socket) => {
  const rawUserId = socket.handshake.query.userId;
  const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

  if (userId && userId !== "undefined") {
    userSocketMap[userId] = socket.id;
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("joinChat", (partnerId) => {
    if (userId) userActiveChat[userId] = partnerId;
  });
  socket.on("leaveChat", () => {
    if (userId) delete userActiveChat[userId];
  });
  socket.on("joinGroup", (groupId) => {
    if (userId) {
      socket.join(groupId);
      userActiveChat[userId] = groupId;
    }
  });
  socket.on("leaveGroup", (groupId) => {
    if (userId) {
      socket.leave(groupId);
      delete userActiveChat[userId];
    }
  });

  // ==========================================
  // --- WEBRTC SIGNALING ---
  // ==========================================
  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    const receiverSocketId = getReceiverSocketId(userToCall);
    if (receiverSocketId)
      io.to(receiverSocketId).emit("callUser", {
        signal: signalData,
        from,
        name,
      });
  });

  socket.on("answerCall", (data) => {
    const callerSocketId = getReceiverSocketId(data.to);
    if (callerSocketId) io.to(callerSocketId).emit("callAccepted", data.signal);
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId)
      io.to(receiverSocketId).emit("iceCandidate", candidate);
  });

  socket.on("endCall", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) io.to(receiverSocketId).emit("callEnded");
  });

  // ==========================================
  // --- TYPING INDICATORS ---
  // ==========================================
  socket.on("typing", ({ receiverId, groupId }) => {
    if (groupId) {
      socket.to(groupId).emit("userTyping", { userId });
    } else if (receiverId) {
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId)
        io.to(receiverSocketId).emit("userTyping", { userId });
    }
  });

  socket.on("stopTyping", ({ receiverId, groupId }) => {
    if (groupId) {
      socket.to(groupId).emit("userStoppedTyping", { userId });
    } else if (receiverId) {
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId)
        io.to(receiverSocketId).emit("userStoppedTyping", { userId });
    }
  });
  // ==========================================

  socket.on("disconnect", async () => {
    if (userId) {
      delete userSocketMap[userId];
      delete userActiveChat[userId];

      try {
        const lastSeenDate = new Date();
        await User.findByIdAndUpdate(userId, { lastSeen: lastSeenDate });
        io.emit("userOffline", { userId, lastSeen: lastSeenDate });
      } catch (error) {
        console.error("Error updating last seen:", error);
      }
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
