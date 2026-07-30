import { useEffect, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import CreateGroupModal from "./CreateGroupModal";
import { Users, Search, Plus } from "lucide-react";

const Sidebar = () => {
  const {
    getUsers,
    getGroups,
    users,
    groups,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
  } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Default to 288px (w-72)
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [isResizing, setIsResizing] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    getUsers();
    getGroups();
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const filteredUsers = (users || []).filter((u) =>
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const filteredGroups = (groups || []).filter((g) =>
    g.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

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

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <>
      <aside
        style={{ width: windowWidth >= 1024 ? sidebarWidth : undefined }}
        className="relative h-full w-20 flex-none lg:flex-shrink-0 border-r border-base-300 flex flex-col bg-base-100 z-10"
      >
        <div className="border-b border-base-300 w-full p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 overflow-hidden">
              <Users className="size-6 shrink-0" />
              <span className="font-medium hidden lg:block truncate">
                Converge
              </span>
            </div>

            <Plus
              onClick={() => setShowGroupModal(true)}
              className="size-5 shrink-0 cursor-pointer hover:text-primary transition-colors"
            />
          </div>

          <div className="relative hidden lg:block">
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
          {/* GROUPS SECTION */}
          {filteredGroups.length > 0 && (
            <div className="px-2 py-2 text-xs font-semibold text-zinc-500 uppercase hidden lg:block">
              Groups
            </div>
          )}
          <div className="space-y-1">
            {filteredGroups.map((group) => {
              const isActive = selectedUser?._id === group._id;
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
                  {/* WhatsApp Style Circular Group Avatar */}
                  <div className="relative shrink-0 mx-auto lg:mx-0">
                    {group.groupPic ? (
                      <img
                        src={group.groupPic}
                        alt={group.name}
                        className="size-10 object-cover rounded-full ring-1 ring-base-300"
                      />
                    ) : (
                      <div
                        className={`size-10 rounded-full flex items-center justify-center transition-colors ${
                          isActive
                            ? "bg-primary/20 text-primary"
                            : "bg-base-300 text-base-content/70 group-hover:bg-base-content/10"
                        }`}
                      >
                        <Users className="size-5" />
                      </div>
                    )}
                  </div>

                  <div className="hidden lg:flex flex-1 text-left min-w-0 overflow-hidden flex-col justify-center">
                    <div className="flex justify-between items-center w-full">
                      <h3
                        className={`font-semibold text-sm truncate ${
                          isActive
                            ? "text-base-content"
                            : "text-base-content/80"
                        }`}
                      >
                        {group.name}
                      </h3>
                      {group.lastMessageTime && (
                        <span className="text-[10px] text-base-content/40 pl-2 shrink-0">
                          {new Date(group.lastMessageTime).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs truncate mt-0.5 ${
                        isActive
                          ? "text-primary font-medium"
                          : "text-base-content/50"
                      }`}
                    >
                      {group.lastMessage || "No messages yet"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* DIRECT MESSAGES SECTION */}
          <div className="px-2 py-2 mt-4 text-xs font-semibold text-zinc-500 uppercase hidden lg:block">
            Direct Messages
          </div>
          <div className="space-y-1">
            {filteredUsers.length === 0 ? (
              <div className="text-center text-zinc-500 py-4 hidden lg:block text-sm">
                No contacts found
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isActive = selectedUser?._id === user._id;
                const isOnline = onlineUsers.includes(user._id);
                // Check if the date is valid (not 1970 fallback)
                const hasValidTime =
                  user.lastMessageTime &&
                  new Date(user.lastMessageTime).getTime() > 0;

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
                    <div className="relative mx-auto lg:mx-0 shrink-0">
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.name}
                        className="size-10 object-cover rounded-full"
                      />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 size-2.5 bg-green-500 rounded-full ring-2 ring-base-100" />
                      )}
                    </div>
                    <div className="hidden lg:flex flex-1 text-left min-w-0 overflow-hidden flex-col justify-center">
                      <div className="flex justify-between items-center w-full">
                        <h3
                          className={`font-semibold text-sm truncate ${
                            isActive
                              ? "text-base-content"
                              : "text-base-content/80"
                          }`}
                        >
                          {user.fullName}
                        </h3>
                        {hasValidTime && (
                          <span className="text-[10px] text-base-content/40 pl-2 shrink-0">
                            {new Date(user.lastMessageTime).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs truncate mt-0.5 ${
                          isActive
                            ? "text-primary font-medium"
                            : "text-base-content/50"
                        }`}
                      >
                        {user.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Drag Handle - Only render on large screens */}
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
    </>
  );
};

export default Sidebar;
