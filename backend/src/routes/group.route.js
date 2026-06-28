import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createGroup, getGroups } from "../controllers/group.controller.js";

const router = express.Router();

// Create a new group
router.post("/create", protectRoute, createGroup);

// Get all groups the logged-in user belongs to
router.get("/all", protectRoute, getGroups);

export default router;
