import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getUsersForSidebar,
  getGroups,
  getMessages,
  sendMessage,
  createGroup,
  leaveGroup,
  removeMember,
  addMembers,
  deleteGroup,
  reactToMessage,
  deleteMessage,
  markMessagesAsSeen, // FIX: Imported the new controller
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/groups", protectRoute, getGroups);
router.get("/:id", protectRoute, getMessages);
router.post("/send/:id", protectRoute, sendMessage);

router.post("/:id/react", protectRoute, reactToMessage);
router.delete("/:id", protectRoute, deleteMessage);

// FIX: Added the read receipt route
router.put("/mark-seen/:id", protectRoute, markMessagesAsSeen);

router.post("/groups/create", protectRoute, createGroup);
router.post("/groups/:id/leave", protectRoute, leaveGroup);
router.post("/groups/:id/remove", protectRoute, removeMember);
router.post("/groups/:id/add", protectRoute, addMembers);
router.delete("/groups/:id", protectRoute, deleteGroup);

export default router;
