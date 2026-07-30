import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// FIX: Updated to fetch lastMessage metadata for the Sidebar UI
export const getGroups = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const groups = await Group.find({ members: loggedInUserId }).populate(
      "members",
      "fullName profilePic",
    );

    const groupsWithMetadata = await Promise.all(
      groups.map(async (group) => {
        const lastMessage = await Message.findOne({ groupId: group._id }).sort({
          createdAt: -1,
        });

        return {
          ...group.toObject(),
          lastMessage: lastMessage
            ? lastMessage.image
              ? "📷 Photo"
              : lastMessage.text
            : "No messages yet",
          lastMessageTime: lastMessage
            ? lastMessage.createdAt
            : group.createdAt,
        };
      }),
    );

    res
      .status(200)
      .json(
        groupsWithMetadata.sort(
          (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime),
        ),
      );
  } catch (error) {
    console.error("Error in getGroups:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createGroup = async (req, res) => {
  try {
    const { name, members, groupPic } = req.body;
    const adminId = req.user._id;

    if (!name || !members || !Array.isArray(members)) {
      return res.status(400).json({ error: "Invalid group data" });
    }

    const allMemberIds = [...new Set([...members, adminId.toString()])];

    const newGroup = new Group({
      name,
      admin: adminId,
      members: allMemberIds,
      groupPic: groupPic || "",
    });

    await newGroup.save();

    const populatedGroup = await Group.findById(newGroup._id).populate(
      "members",
      "fullName profilePic",
    );

    if (typeof io !== "undefined" && io !== null) {
      allMemberIds.forEach((id) => {
        const socketId = getReceiverSocketId(id);
        if (socketId) io.to(socketId).emit("newGroupCreated", populatedGroup);
      });
    }

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error("Error in createGroup:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user._id;
    const group = await Group.findById(groupId);

    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.admin.toString() === userId.toString())
      return res
        .status(400)
        .json({ error: "Admin cannot leave. Delete the group instead." });

    group.members = group.members.filter((id) => String(id) !== String(userId));
    await group.save();

    const systemMsg = new Message({
      senderId: userId,
      groupId,
      text: `${req.user.fullName} left the group`,
      messageType: "system",
    });

    await systemMsg.save();

    const populated = await systemMsg.populate(
      "senderId",
      "fullName profilePic",
    );

    const allMembersToNotify = [...group.members, userId];
    allMembersToNotify.forEach((memberId) => {
      const socketId = getReceiverSocketId(memberId);
      if (socketId) {
        io.to(socketId).emit("newGroupMessage", populated);
        io.to(socketId).emit("memberLeft", { groupId, userId });
      }
    });

    res.status(200).json({ message: "Left group successfully" });
  } catch (error) {
    console.error("Error in leaveGroup:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { userIdToRemove } = req.body;
    const adminId = req.user._id;

    const group = await Group.findById(groupId);
    const userToBeRemoved = await User.findById(userIdToRemove);

    if (group.admin.toString() !== adminId.toString())
      return res.status(403).json({ error: "Only admin can remove members" });

    group.members = group.members.filter(
      (id) => String(id) !== String(userIdToRemove),
    );
    await group.save();

    const systemMsg = new Message({
      senderId: adminId,
      groupId,
      text: `${req.user.fullName} removed ${userToBeRemoved.fullName}`,
      messageType: "system",
    });

    await systemMsg.save();

    const populated = await systemMsg.populate(
      "senderId",
      "fullName profilePic",
    );

    const allMembersToNotify = [...group.members, userIdToRemove];
    allMembersToNotify.forEach((memberId) => {
      const socketId = getReceiverSocketId(memberId);
      if (socketId) {
        io.to(socketId).emit("newGroupMessage", populated);
        io.to(socketId).emit("memberRemoved", {
          groupId,
          userId: userIdToRemove,
        });
      }
    });

    res.status(200).json({ message: "Member removed" });
  } catch (error) {
    console.error("Error in removeMember:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addMembers = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { userIdsToAdd } = req.body;
    const adminId = req.user._id;

    const group = await Group.findById(groupId);
    if (group.admin.toString() !== adminId.toString())
      return res.status(403).json({ error: "Only admin can add members" });

    const currentMembers = group.members.map((id) => String(id));
    userIdsToAdd.forEach((id) => {
      if (!currentMembers.includes(String(id))) {
        group.members.push(id);
      }
    });

    await group.save();
    const addedUsers = await User.find({ _id: { $in: userIdsToAdd } });
    const addedNames = addedUsers.map((u) => u.fullName).join(", ");

    const systemMsg = new Message({
      senderId: adminId,
      groupId,
      text: `${req.user.fullName} added ${addedNames}`,
      messageType: "system",
    });

    await systemMsg.save();

    const populated = await systemMsg.populate(
      "senderId",
      "fullName profilePic",
    );

    group.members.forEach((memberId) => {
      const socketId = getReceiverSocketId(memberId);
      if (socketId) io.to(socketId).emit("newGroupMessage", populated);
    });

    const updatedGroup = await Group.findById(groupId).populate(
      "members",
      "fullName profilePic",
    );

    userIdsToAdd.forEach((id) => {
      const socketId = getReceiverSocketId(id);
      if (socketId) io.to(socketId).emit("newGroupCreated", updatedGroup);
    });

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error("Error in addMembers:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const adminId = req.user._id;
    const group = await Group.findById(groupId);

    if (group.admin.toString() !== adminId.toString())
      return res.status(403).json({ error: "Only admin can delete group" });

    await Message.deleteMany({ groupId });
    await Group.findByIdAndDelete(groupId);

    group.members.forEach((memberId) => {
      const socketId = getReceiverSocketId(memberId);
      if (socketId) io.to(socketId).emit("groupDeleted", groupId);
    });

    res.status(200).json({ message: "Group deleted" });
  } catch (error) {
    console.error("Error in deleteGroup:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
