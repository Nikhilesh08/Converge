import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import cloudinary from "../lib/cloudinary.js";
import mongoose from "mongoose";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    const usersWithMetadata = await Promise.all(
      filteredUsers.map(async (user) => {
        const lastMessage = await Message.findOne({
          groupId: null,
          $or: [
            { senderId: loggedInUserId, receiverId: user._id },
            { senderId: user._id, receiverId: loggedInUserId },
          ],
        }).sort({ createdAt: -1 });

        return {
          ...user.toObject(),
          lastMessage: lastMessage
            ? lastMessage.image
              ? "📷 Photo"
              : lastMessage.text
            : "No messages yet",
          lastMessageTime: lastMessage ? lastMessage.createdAt : new Date(0),
        };
      }),
    );

    res
      .status(200)
      .json(
        usersWithMetadata.sort(
          (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime),
        ),
      );
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id }).populate(
      "members",
      "fullName profilePic",
    );
    res.status(200).json(groups);
  } catch (error) {
    console.error("Error in getGroups:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: chatId } = req.params;
    const { cursor } = req.query;
    const myId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const group = await Group.findById(chatId);

    const limit = 30;
    let queryCondition = {};

    if (group) {
      queryCondition = { groupId: chatId };
    } else {
      queryCondition = {
        groupId: null,
        $or: [
          { senderId: myId, receiverId: chatId },
          { senderId: chatId, receiverId: myId },
        ],
      };
    }

    if (cursor) {
      queryCondition._id = { $lt: cursor };
    }

    const messages = await Message.find(queryCondition)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("senderId", "fullName profilePic");

    return res.status(200).json(messages.reverse());
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: targetId } = req.params;
    const senderId = req.user._id;

    let imageUrl = image
      ? (await cloudinary.uploader.upload(image)).secure_url
      : null;

    const targetGroup = await Group.findById(targetId);

    const newMessage = new Message({
      senderId,
      text,
      image: imageUrl,
      groupId: targetGroup ? targetId : null,
      receiverId: targetGroup ? null : targetId,
      messageType: "text",
    });

    await newMessage.save();
    const populatedMessage = await newMessage.populate(
      "senderId",
      "fullName profilePic",
    );

    if (targetGroup) {
      targetGroup.members.forEach((memberId) => {
        const socketId = getReceiverSocketId(memberId);
        if (socketId) io.to(socketId).emit("newGroupMessage", populatedMessage);
      });
    } else {
      const receiverSocketId = getReceiverSocketId(targetId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", populatedMessage);
      }
    }
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
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

export const reactToMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    const existingReactionIndex = message.reactions.findIndex(
      (r) => String(r.userId) === String(userId),
    );

    if (existingReactionIndex !== -1) {
      if (message.reactions[existingReactionIndex].emoji === emoji) {
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        message.reactions[existingReactionIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    if (message.groupId) {
      const group = await Group.findById(message.groupId);
      group.members.forEach((memberId) => {
        const socketId = getReceiverSocketId(memberId);
        if (socketId)
          io.to(socketId).emit("messageReaction", {
            messageId,
            reactions: message.reactions,
          });
      });
    } else {
      const receiverSocketId = getReceiverSocketId(message.receiverId);
      const senderSocketId = getReceiverSocketId(message.senderId);
      if (receiverSocketId)
        io.to(receiverSocketId).emit("messageReaction", {
          messageId,
          reactions: message.reactions,
        });
      if (senderSocketId)
        io.to(senderSocketId).emit("messageReaction", {
          messageId,
          reactions: message.reactions,
        });
    }

    res.status(200).json(message.reactions);
  } catch (error) {
    console.error("Error in reactToMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    if (message.senderId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "Unauthorized to delete this message" });
    }

    await Message.findByIdAndDelete(messageId);

    if (message.groupId) {
      const group = await Group.findById(message.groupId);
      group.members.forEach((memberId) => {
        const socketId = getReceiverSocketId(memberId);
        if (socketId) io.to(socketId).emit("messageDeleted", messageId);
      });
    } else {
      const receiverSocketId = getReceiverSocketId(message.receiverId);
      const senderSocketId = getReceiverSocketId(message.senderId);
      if (receiverSocketId)
        io.to(receiverSocketId).emit("messageDeleted", messageId);
      if (senderSocketId)
        io.to(senderSocketId).emit("messageDeleted", messageId);
    }

    res
      .status(200)
      .json({ message: "Message deleted successfully", id: messageId });
  } catch (error) {
    console.error("Error in deleteMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// FIX: New controller to handle the Blue Tick (Read Receipt) logic
export const markMessagesAsSeen = async (req, res) => {
  try {
    const { id: otherUserId } = req.params;
    const myId = req.user._id;

    // 1. Find all unread messages sent BY the other person TO you, and update them
    await Message.updateMany(
      { senderId: otherUserId, receiverId: myId, isSeen: false },
      { $set: { isSeen: true } },
    );

    // 2. Blast a socket event to the other person's phone so their UI instantly turns blue
    const senderSocketId = getReceiverSocketId(otherUserId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesSeen", { readerId: myId });
    }

    res.status(200).json({ message: "Messages marked as seen successfully" });
  } catch (error) {
    console.error("Error in markMessagesAsSeen:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
