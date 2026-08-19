import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  groups: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  typingUsers: [],

  hasMore: true,
  isLoadingMore: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data || [] });
    } catch (error) {
      console.error("Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getGroups: async () => {
    try {
      const res = await axiosInstance.get("/messages/groups");
      set({ groups: res.data || [] });
    } catch (error) {
      console.error("Groups fetch failed");
    }
  },

  getMessages: async (chatId) => {
    set({ isMessagesLoading: true, messages: [], hasMore: true });
    try {
      const res = await axiosInstance.get(`/messages/${chatId}`);
      set({
        messages: res.data || [],
        hasMore: res.data.length === 30,
      });
    } catch (error) {
      toast.error("Error loading messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  loadMoreMessages: async (chatId) => {
    const { messages, hasMore, isLoadingMore } = get();

    if (!hasMore || isLoadingMore || messages.length === 0) return;

    set({ isLoadingMore: true });
    try {
      const cursor = messages[0]._id;
      const res = await axiosInstance.get(
        `/messages/${chatId}?cursor=${cursor}`,
      );

      set({
        messages: [...res.data, ...messages],
        hasMore: res.data.length === 30,
      });
    } catch (error) {
      toast.error("Error loading older messages");
    } finally {
      set({ isLoadingMore: false });
    }
  },

  markAsSeen: async (userId) => {
    try {
      await axiosInstance.put(`/messages/mark-seen/${userId}`);
      set({
        messages: get().messages.map((msg) =>
          !msg.isSeen &&
          String(msg.senderId._id || msg.senderId) === String(userId)
            ? { ...msg, isSeen: true }
            : msg,
        ),
      });
    } catch (error) {
      console.error("Failed to mark messages as seen");
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    if (!selectedUser) return;
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData,
      );
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error("Message failed to send");
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.post(`/messages/${messageId}/react`, {
        emoji,
      });
      const { messages } = get();
      set({
        messages: messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions: res.data } : msg,
        ),
      });
    } catch (error) {
      toast.error("Failed to react");
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      set({ messages: get().messages.filter((msg) => msg._id !== messageId) });
      toast.success("Message deleted");
    } catch (error) {
      toast.error("Failed to delete message");
    }
  },

  createGroup: async (groupData) => {
    try {
      const res = await axiosInstance.post(
        "/messages/groups/create",
        groupData,
      );
      set({ groups: [res.data, ...get().groups] });
      toast.success("Group created!");
      return res.data;
    } catch (error) {
      toast.error("Failed to create group");
    }
  },

  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.post(`/messages/groups/${groupId}/leave`);
      set({
        groups: get().groups.filter((g) => g._id !== groupId),
        selectedUser: null,
      });
      toast.success("Left group successfully");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to leave group");
    }
  },

  removeMember: async (groupId, userIdToRemove) => {
    try {
      await axiosInstance.post(`/messages/groups/${groupId}/remove`, {
        userIdToRemove,
      });
      const { selectedUser, groups } = get();
      const updateMembers = (membersArray) =>
        membersArray.filter((m) => (m._id || m) !== userIdToRemove);
      if (selectedUser?._id === groupId) {
        set({
          selectedUser: {
            ...selectedUser,
            members: updateMembers(selectedUser.members),
          },
        });
      }
      set({
        groups: groups.map((g) =>
          g._id === groupId ? { ...g, members: updateMembers(g.members) } : g,
        ),
      });
      toast.success("Member removed");
    } catch (error) {
      toast.error("Failed to remove member");
    }
  },

  addMembers: async (groupId, userIdsToAdd) => {
    try {
      const res = await axiosInstance.post(`/messages/groups/${groupId}/add`, {
        userIdsToAdd,
      });
      set({ selectedUser: res.data });
      set({
        groups: get().groups.map((g) => (g._id === groupId ? res.data : g)),
      });
      toast.success("Members added!");
    } catch (error) {
      toast.error("Failed to add members");
    }
  },

  deleteGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/messages/groups/${groupId}`);
      set({
        groups: get().groups.filter((g) => g._id !== groupId),
        selectedUser: null,
      });
      toast.success("Group deleted");
    } catch (error) {
      toast.error("Failed to delete group");
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;
    if (!socket) return;

    // FIX: Nuke existing listeners to prevent duplicate message rendering
    get().unsubscribeFromMessages();

    socket.on("newMessage", (newMessage) => {
      const { selectedUser } = get();
      if (selectedUser?._id === newMessage.senderId._id) {
        set({ messages: [...get().messages, newMessage] });
      }
    });

    socket.on("newGroupMessage", (newMessage) => {
      const { selectedUser } = get();
      if (selectedUser?._id === newMessage.groupId) {
        set({ messages: [...get().messages, newMessage] });
      }
    });

    socket.on("messageReaction", ({ messageId, reactions }) => {
      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg,
        ),
      });
    });

    socket.on("messageDeleted", (messageId) => {
      set({ messages: get().messages.filter((msg) => msg._id !== messageId) });
    });

    socket.on("messagesSeen", ({ readerId }) => {
      const { selectedUser, messages } = get();
      if (selectedUser?._id === readerId) {
        set({
          messages: messages.map((msg) =>
            String(msg.senderId._id || msg.senderId) === String(authUser._id)
              ? { ...msg, isSeen: true }
              : msg,
          ),
        });
      }
    });

    socket.on("userTyping", ({ userId }) => {
      set((state) => ({
        typingUsers: [...new Set([...state.typingUsers, userId])],
      }));
    });

    socket.on("userStoppedTyping", ({ userId }) => {
      set((state) => ({
        typingUsers: state.typingUsers.filter((id) => id !== userId),
      }));
    });

    socket.on("newGroupCreated", (newGroup) => {
      set({ groups: [newGroup, ...get().groups] });
    });

    socket.on("memberLeft", ({ groupId, userId }) => {
      const { selectedUser, groups } = get();
      const updateMembers = (membersArray) =>
        membersArray.filter((m) => (m._id || m) !== userId);
      if (selectedUser?._id === groupId)
        set({
          selectedUser: {
            ...selectedUser,
            members: updateMembers(selectedUser.members),
          },
        });
      set({
        groups: groups.map((g) =>
          g._id === groupId ? { ...g, members: updateMembers(g.members) } : g,
        ),
      });
    });

    socket.on("memberRemoved", ({ groupId, userId }) => {
      const { selectedUser, groups } = get();
      if (authUser._id === userId) {
        set({ groups: groups.filter((g) => g._id !== groupId) });
        if (selectedUser?._id === groupId) {
          set({ selectedUser: null });
          toast.error("You were removed from the group");
        }
      } else {
        const updateMembers = (membersArray) =>
          membersArray.filter((m) => (m._id || m) !== userId);
        if (selectedUser?._id === groupId)
          set({
            selectedUser: {
              ...selectedUser,
              members: updateMembers(selectedUser.members),
            },
          });
        set({
          groups: groups.map((g) =>
            g._id === groupId ? { ...g, members: updateMembers(g.members) } : g,
          ),
        });
      }
    });

    socket.on("groupDeleted", (groupId) => {
      set({ groups: get().groups.filter((g) => g._id !== groupId) });
      if (get().selectedUser?._id === groupId) {
        set({ selectedUser: null });
        toast.error("The admin deleted this group");
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("newGroupMessage");
      socket.off("messageReaction");
      socket.off("messageDeleted");
      socket.off("messagesSeen");
      socket.off("userTyping");
      socket.off("userStoppedTyping");
      socket.off("newGroupCreated");
      socket.off("memberLeft");
      socket.off("memberRemoved");
      socket.off("groupDeleted");
    }
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser });
    if (selectedUser) get().getMessages(selectedUser._id);
  },
}));
