import { useEffect, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import CreateGroupModal from "./CreateGroupModal";
import { Users, Search, Hash, Plus } from "lucide-react";

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

  // FIX: Real-time window width tracking
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    getUsers();
    getGroups();
  }, []);

  // FIX: Listener to detect window resizing in real-time
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
      {/* FIX: 
          1. Use the state-driven `windowWidth` to check if we are on desktop.
          2. Added `flex-none` so the sidebar never shrinks below its assigned width.
      */}
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

        <div className="overflow-y-auto w-full py-3 flex-1">
          {filteredGroups.length > 0 && (
            <div className="px-5 py-2 text-xs font-semibold text-zinc-500 uppercase hidden lg:block">
              Groups
            </div>
          )}
          {filteredGroups.map((group) => (
            <button
              key={group._id}
              onClick={() => setSelectedUser(group)}
              className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${selectedUser?._id === group._id ? "bg-base-300" : ""}`}
            >
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Hash className="size-6 text-primary" />
              </div>
              <div className="hidden lg:block text-left min-w-0">
                <div className="font-medium truncate">{group.name}</div>
              </div>
            </button>
          ))}

          <div className="px-5 py-2 mt-4 text-xs font-semibold text-zinc-500 uppercase hidden lg:block">
            Direct Messages
          </div>
          {filteredUsers.length === 0 ? (
            <div className="text-center text-zinc-500 py-4 hidden lg:block">
              No contacts found
            </div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user._id}
                onClick={() => setSelectedUser(user)}
                className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${selectedUser?._id === user._id ? "bg-base-300" : ""}`}
              >
                <div className="relative mx-auto lg:mx-0 shrink-0">
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.name}
                    className="size-12 object-cover rounded-full"
                  />
                  {onlineUsers.includes(user._id) && (
                    <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
                  )}
                </div>
                <div className="hidden lg:block text-left min-w-0">
                  <div className="font-medium truncate">{user.fullName}</div>
                  <div className="text-xs text-zinc-400">
                    {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Drag Handle - Only render on large screens */}
        {windowWidth >= 1024 && (
          <div
            onMouseDown={startResizing}
            className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-20 transition-colors hover:bg-primary/50 ${isResizing ? "bg-primary/50" : ""}`}
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
