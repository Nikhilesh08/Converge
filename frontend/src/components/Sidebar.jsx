import { useEffect, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import CreateGroupModal from "./CreateGroupModal";
import UserProfileModal from "./UserProfileModal";
import { Users, Search, Plus, Check, CheckCheck } from "lucide-react";

const Sidebar = () => {
  const {
    getUsers,
    getGroups,
    users,
    groups,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();

  const { authUser, onlineUsers, socket } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [profileToView, setProfileToView] = useState(null);

  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [isResizing, setIsResizing] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    getUsers();
    getGroups();
  }, [getUsers, getGroups]);

  useEffect(() => {
    if (socket) {
      subscribeToMessages();
    }
    return () => unsubscribeFromMessages();
  }, [socket, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback(
    (mouseMoveEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth >= 200 && newWidth <= 500) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing],
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      document.body.style.userSelect = "none";
    } else {
      document.body.style.userSelect = "auto";
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const sortedAndFilteredUsers = (users || [])
    .filter((u) => u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const isAOnline = onlineUsers.includes(a._id);
      const isBOnline = onlineUsers.includes(b._id);

      if (isAOnline && !isBOnline) return -1;
      if (!isAOnline && isBOnline) return 1;

      const timeA = new Date(a.lastMessageTime || 0).getTime();
      const timeB = new Date(b.lastMessageTime || 0).getTime();
      return timeB - timeA;
    });

  const filteredGroups = (groups || []).filter((g) =>
    g.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <>
      <aside
        style={{ width: windowWidth >= 1024 ? sidebarWidth : undefined }}
        className={`relative h-full flex-none lg:flex-shrink-0 border-r border-base-300 flex flex-col bg-base-100 z-10 transition-all duration-300 ${
          selectedUser
            ? "hidden md:flex md:w-72 lg:w-auto"
            : "w-full md:w-72 lg:w-auto"
        }`}
      >
        <div className="border-b border-base-300 w-full p-4 shrink-0">
          <div className="flex items-center w-full mb-4">
            <div className="flex items-center gap-2 overflow-hidden mr-auto">
              <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="size-5 text-primary" />
              </div>
              <span className="font-bold text-lg tracking-tight block truncate">
                Converge
              </span>
            </div>

            <button
              onClick={() => setShowGroupModal(true)}
              className="btn btn-ghost btn-circle btn-sm shrink-0"
              title="Create Group"
            >
              <Plus className="size-5 text-base-content/70 hover:text-primary transition-colors" />
            </button>
          </div>

          <div className="relative block w-full">
            <input
              type="text"
              placeholder="Search users or groups..."
              className="input input-bordered w-full pl-10 input-sm focus:outline-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          </div>
        </div>

        <div className="overflow-y-auto w-full py-3 flex-1 px-3">
          {filteredGroups.length > 0 && (
            <div className="px-2 py-2 text-xs font-semibold text-zinc-500 uppercase block">
              Groups
            </div>
          )}
          <div className="space-y-1">
            {filteredGroups.map((group) => {
              const isActive = selectedUser?._id === group._id;
              const hasUnread = group.unreadCount > 0;

              return (
                <button
                  key={group._id}
                  onClick={() => setSelectedUser(group)}
                  className={`w-full p-2 flex items-center gap-3 transition-colors rounded-xl ${
                    isActive
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-base-200 border border-transparent"
                  }`}
                >
                  <div
                    className="relative shrink-0 mx-auto md:mx-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProfileToView(group);
                    }}
                  >
                    {/* FIX: Strict container for perfect circle */}
                    <div className="size-10 rounded-full overflow-hidden border border-base-300 flex items-center justify-center bg-base-200 shrink-0">
                      {group.groupPic ? (
                        <img
                          src={group.groupPic}
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="size-5 text-base-content/70" />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 text-left min-w-0 overflow-hidden flex-col justify-center">
                    <div className="flex justify-between items-center w-full">
                      <h3
                        className={`font-semibold text-sm truncate ${
                          isActive || hasUnread
                            ? "text-base-content"
                            : "text-base-content/80"
                        }`}
                      >
                        {group.name}
                      </h3>
                      {group.lastMessageTime && (
                        <span
                          className={`text-[10px] shrink-0 ml-2 ${
                            hasUnread && !isActive
                              ? "text-primary font-bold"
                              : "text-base-content/40"
                          }`}
                        >
                          {new Date(group.lastMessageTime).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center w-full mt-0.5">
                      <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                        <p
                          className={`text-xs truncate ${
                            isActive
                              ? "text-primary font-medium"
                              : hasUnread
                                ? "text-base-content font-bold"
                                : "text-base-content/50"
                          }`}
                        >
                          {group.lastMessage || "No messages yet"}
                        </p>
                      </div>

                      {hasUnread && !isActive && (
                        <div className="bg-primary text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center shadow-sm px-1.5 shrink-0 ml-2">
                          {group.unreadCount > 4 ? "4+" : group.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-2 py-2 mt-4 text-xs font-semibold text-zinc-500 uppercase block">
            Direct Messages
          </div>
          <div className="space-y-1">
            {sortedAndFilteredUsers.length === 0 ? (
              <div className="text-center text-zinc-500 py-4 block text-sm">
                No contacts found
              </div>
            ) : (
              sortedAndFilteredUsers.map((user) => {
                const isActive = selectedUser?._id === user._id;
                const isOnline = onlineUsers.includes(user._id);
                const hasValidTime =
                  user.lastMessageTime &&
                  new Date(user.lastMessageTime).getTime() > 0;
                const hasUnread = user.unreadCount > 0;

                return (
                  <button
                    key={user._id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full p-2 flex items-center gap-3 transition-colors rounded-xl ${
                      isActive
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-base-200 border border-transparent"
                    }`}
                  >
                    <div
                      className="relative mx-auto md:mx-0 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfileToView(user);
                      }}
                    >
                      {/* FIX: Strict container for perfect circle */}
                      <div className="size-10 rounded-full overflow-hidden border border-base-300 bg-base-200 shrink-0">
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.fullName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Online indicator sits safely OUTSIDE the hidden overflow */}
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 size-2.5 bg-green-500 rounded-full ring-2 ring-base-100" />
                      )}
                    </div>

                    <div className="flex flex-1 text-left min-w-0 overflow-hidden flex-col justify-center">
                      <div className="flex justify-between items-center w-full">
                        <h3
                          className={`font-semibold text-sm truncate ${
                            isActive || hasUnread
                              ? "text-base-content"
                              : "text-base-content/80"
                          }`}
                        >
                          {user.fullName}
                        </h3>
                        {hasValidTime && (
                          <span
                            className={`text-[10px] shrink-0 ml-2 ${
                              hasUnread && !isActive
                                ? "text-primary font-bold"
                                : "text-base-content/40"
                            }`}
                          >
                            {new Date(user.lastMessageTime).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center w-full mt-0.5">
                        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                          {user.lastMessageSenderId === authUser?._id && (
                            <span className="shrink-0">
                              {user.isLastMessageSeen ? (
                                <CheckCheck className="size-[14px] text-blue-500" />
                              ) : isOnline ? (
                                <CheckCheck className="size-[14px] text-zinc-500" />
                              ) : (
                                <Check className="size-[14px] text-zinc-500" />
                              )}
                            </span>
                          )}
                          <p
                            className={`text-xs truncate ${
                              isActive
                                ? "text-primary font-medium"
                                : hasUnread
                                  ? "text-base-content font-bold"
                                  : "text-base-content/50"
                            }`}
                          >
                            {user.lastMessage || "No messages yet"}
                          </p>
                        </div>

                        {hasUnread && !isActive && (
                          <div className="bg-primary text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center shadow-sm px-1.5 shrink-0 ml-2">
                            {user.unreadCount > 4 ? "4+" : user.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {windowWidth >= 1024 && (
          <div
            onMouseDown={startResizing}
            className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-20 transition-colors hover:bg-primary/50 ${
              isResizing ? "bg-primary/50" : ""
            }`}
            title="Drag to resize"
          />
        )}
      </aside>

      {showGroupModal && (
        <CreateGroupModal onClose={() => setShowGroupModal(false)} />
      )}

      <UserProfileModal
        isOpen={!!profileToView}
        onClose={() => setProfileToView(null)}
        user={profileToView}
      />
    </>
  );
};

export default Sidebar;
