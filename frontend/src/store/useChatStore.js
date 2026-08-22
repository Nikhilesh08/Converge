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

      set((state) => ({
        users: state.users.map((u) =>
          u._id === userId ? { ...u, unreadCount: 0 } : u,
        ),
      }));
    } catch (error) {
      console.error("Failed to mark messages as seen");
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages, users, groups } = get();
    const authUser = useAuthStore.getState().authUser;
    if (!selectedUser) return;
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData,
      );

      const newMsg = res.data;
      set({ messages: [...messages, newMsg] });

      if (selectedUser.members) {
        const updatedGroups = groups
          .map((g) =>
            g._id === selectedUser._id
              ? {
                  ...g,
                  lastMessage: newMsg.image
                    ? "📷 Photo"
                    : newMsg.document
                      ? "📄 Document"
                      : newMsg.text,
                  lastMessageTime: newMsg.createdAt,
                  lastMessageSenderId: authUser._id,
                }
              : g,
          )
          .sort(
            (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime),
          );
        set({ groups: updatedGroups });
      } else {
        const updatedUsers = users
          .map((u) =>
            u._id === selectedUser._id
              ? {
                  ...u,
                  lastMessage: newMsg.image
                    ? "📷 Photo"
                    : newMsg.document
                      ? "📄 Document"
                      : newMsg.text,
                  lastMessageTime: newMsg.createdAt,
                  lastMessageSenderId: authUser._id,
                  isLastMessageSeen: false,
                }
              : u,
          )
          .sort(
            (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime),
          );
        set({ users: updatedUsers });
      }
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

    get().unsubscribeFromMessages();

    socket.on("newMessage", (newMessage) => {
      const { selectedUser, users } = get();

      // FIX: Check if the message belongs in the current chat,
      // whether you sent it (like a call log) OR received it!
      const isMessageForSelected =
        selectedUser?._id === newMessage.senderId._id ||
        selectedUser?._id === newMessage.receiverId;

      if (isMessageForSelected) {
        set({ messages: [...get().messages, newMessage] });
      }

      let userFound = false;
      const updatedUsers = users.map((u) => {
        // Find the user to update the sidebar preview. If we sent it, update the receiver's preview.
        const targetId =
          newMessage.senderId._id === authUser._id
            ? newMessage.receiverId
            : newMessage.senderId._id;

        if (u._id === targetId) {
          userFound = true;
          return {
            ...u,
            lastMessage: newMessage.image
              ? "📷 Photo"
              : newMessage.document
                ? "📄 Document"
                : newMessage.text,
            lastMessageTime: newMessage.createdAt,
            lastMessageSenderId: newMessage.senderId._id,
            unreadCount:
              isMessageForSelected || newMessage.senderId._id === authUser._id
                ? 0
                : (u.unreadCount || 0) + 1,
            isLastMessageSeen: false,
          };
        }
        return u;
      });

      if (!userFound) {
        // Fallback for new contacts
        const targetId =
          newMessage.senderId._id === authUser._id
            ? newMessage.receiverId
            : newMessage.senderId._id;
        const targetInfo =
          newMessage.senderId._id === authUser._id ? null : newMessage.senderId;

        if (targetInfo) {
          updatedUsers.push({
            _id: targetId,
            fullName: targetInfo.fullName,
            profilePic: targetInfo.profilePic,
            lastMessage: newMessage.image
              ? "📷 Photo"
              : newMessage.document
                ? "📄 Document"
                : newMessage.text,
            lastMessageTime: newMessage.createdAt,
            lastMessageSenderId: newMessage.senderId._id,
            unreadCount: isMessageForSelected ? 0 : 1,
            isLastMessageSeen: false,
          });
        }
      }

      set({
        users: updatedUsers.sort(
          (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime),
        ),
      });
    });

    socket.on("newGroupMessage", (newMessage) => {
      const { selectedUser, groups, getGroups } = get();
      if (newMessage.senderId._id === authUser._id) return;

      const isMessageForSelected = selectedUser?._id === newMessage.groupId;
      if (isMessageForSelected) {
        set({ messages: [...get().messages, newMessage] });
      }

      let groupFound = false;
      const updatedGroups = groups.map((g) => {
        if (g._id === newMessage.groupId) {
          groupFound = true;
          return {
            ...g,
            lastMessage: newMessage.image
              ? "📷 Photo"
              : newMessage.document
                ? "📄 Document"
                : newMessage.text,
            lastMessageTime: newMessage.createdAt,
            lastMessageSenderId: newMessage.senderId._id,
            unreadCount: isMessageForSelected ? 0 : (g.unreadCount || 0) + 1,
          };
        }
        return g;
      });

      if (!groupFound) getGroups();
      else
        set({
          groups: updatedGroups.sort(
            (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime),
          ),
        });
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
      const { selectedUser, messages, users } = get();

      if (selectedUser?._id === readerId) {
        set({
          messages: messages.map((msg) =>
            String(msg.senderId._id || msg.senderId) === String(authUser._id)
              ? { ...msg, isSeen: true }
              : msg,
          ),
        });
      }

      set({
        users: users.map((u) =>
          u._id === readerId ? { ...u, isLastMessageSeen: true } : u,
        ),
      });
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

    socket.on("userProfileUpdated", ({ userId, profilePic }) => {
      set((state) => ({
        users: state.users.map((u) =>
          u._id === userId ? { ...u, profilePic } : u,
        ),
        selectedUser:
          state.selectedUser?._id === userId
            ? { ...state.selectedUser, profilePic }
            : state.selectedUser,
      }));
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
      socket.off("userProfileUpdated");
    }
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser });
    if (selectedUser) {
      get().getMessages(selectedUser._id);

      if (selectedUser.members) {
        set((state) => ({
          groups: state.groups.map((g) =>
            g._id === selectedUser._id ? { ...g, unreadCount: 0 } : g,
          ),
        }));
      } else {
        set((state) => ({
          users: state.users.map((u) =>
            u._id === selectedUser._id ? { ...u, unreadCount: 0 } : u,
          ),
        }));
        get().markAsSeen(selectedUser._id);
      }
    }
  },
}));
