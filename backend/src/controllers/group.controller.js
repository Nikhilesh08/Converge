import Group from "../models/group.model.js";
import Message from "../models/message.model.js";

export const createGroup = async (req, res) => {
  try {
    const { name, members, groupPic } = req.body;
    const adminId = req.user._id;

    // Ensure the admin is also a member
    const allMembers = [...new Set([...members, adminId.toString()])];

    const newGroup = new Group({
      name,
      admin: adminId,
      members: allMembers,
      groupPic: groupPic || "",
    });

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroups = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    // Find groups where the user is a member
    const groups = await Group.find({ members: { $in: [loggedInUserId] } });
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
