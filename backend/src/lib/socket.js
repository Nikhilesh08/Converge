import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: ["http://localhost:5173"] },
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
  const userId = socket.handshake.query.userId;
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
  // --- WEBRTC SIGNALING (PHASE 1 ADDITIONS) ---
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
  // --- TYPING INDICATORS (NEW) ---
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
