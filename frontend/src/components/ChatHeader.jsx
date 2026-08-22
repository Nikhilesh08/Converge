import {
  X,
  Users,
  Trash2,
  LogOut,
  Crown,
  UserMinus,
  UserPlus,
  Video,
  ChevronLeft, // FIX: Imported ChevronLeft for the back button
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useCallStore } from "../store/useCallStore";
import AddMemberModal from "./AddMemberModal";
import UserProfileModal from "./UserProfileModal";
import { formatLastSeen } from "../lib/utils";

const ChatHeader = () => {
  const {
    selectedUser,
    setSelectedUser,
    deleteGroup,
    leaveGroup,
    removeMember,
    typingUsers,
  } = useChatStore();
  const { onlineUsers, authUser, lastSeenMap } = useAuthStore();
  const { startCall } = useCallStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isGroup = !!selectedUser.members;
  const isAdmin = isGroup && selectedUser.admin === authUser._id;

  let statusDisplay;

  if (isGroup) {
    const typingMembers = selectedUser.members.filter(
      (m) => typingUsers.includes(m._id) && m._id !== authUser._id,
    );
    if (typingMembers.length > 0) {
      const names = typingMembers
        .map((m) => m.fullName.split(" ")[0])
        .join(", ");
      statusDisplay = (
        <span className="text-primary font-medium italic">
          {names} {typingMembers.length > 1 ? "are" : "is"} typing...
        </span>
      );
    } else {
      statusDisplay = `${selectedUser.members.length} members`;
    }
  } else {
    const isTyping = typingUsers.includes(selectedUser._id);
    const isOnline = onlineUsers.includes(selectedUser._id);
    const realTimeLastSeen =
      lastSeenMap[selectedUser._id] || selectedUser.lastSeen;
    const formattedTime = formatLastSeen(realTimeLastSeen);
    const offlineStatusText =
      formattedTime === "offline" ? "Offline" : `Last seen ${formattedTime}`;

    if (isTyping) {
      statusDisplay = (
        <span className="text-primary font-medium italic">typing...</span>
      );
    } else {
      statusDisplay = isOnline ? "Online" : offlineStatusText;
    }
  }

  return (
    <>
      <div className="p-2.5 border-b border-base-300">
        <div className="flex items-center justify-between">
          {/* FIX: Container for Back button and User Info */}
          <div className="flex items-center gap-1 sm:gap-3">
            {/* FIX: The Mobile Back Button */}
            <button
              onClick={() => setSelectedUser(null)}
              className="md:hidden p-1.5 hover:bg-base-200 rounded-full transition-colors text-base-content/70 cursor-pointer"
            >
              <ChevronLeft size={24} />
            </button>

            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-base-200 p-1.5 -ml-1.5 rounded-xl transition-colors"
              onClick={() => setShowProfileModal(true)}
            >
              <div className="avatar">
                <div className="size-10 rounded-full relative bg-base-200 flex items-center justify-center border border-base-300 overflow-hidden">
                  {isGroup ? (
                    selectedUser.groupPic ? (
                      <img
                        src={selectedUser.groupPic}
                        alt={selectedUser.name}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <Users className="size-6 text-primary" />
                    )
                  ) : (
                    <img
                      src={selectedUser.profilePic || "/avatar.png"}
                      alt={selectedUser.fullName}
                      className="object-cover w-full h-full"
                    />
                  )}
                </div>
              </div>

              {/* FIX: Aligned headings for smaller screens */}
              <div>
                <h3 className="font-medium flex items-center gap-2 text-sm sm:text-base">
                  {isGroup ? selectedUser.name : selectedUser.fullName}
                  {isAdmin && (
                    <Crown
                      className="size-4 text-yellow-500 shrink-0"
                      title="You are Admin"
                    />
                  )}
                </h3>
                <p className="text-xs sm:text-sm text-base-content/70 truncate max-w-[120px] sm:max-w-none">
                  {statusDisplay}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {!isGroup && (
              <button
                onClick={() => startCall(selectedUser)}
                className="btn btn-ghost btn-circle text-zinc-400 hover:text-primary transition-colors"
                title="Start Video Call"
              >
                <Video size={20} />
              </button>
            )}

            {isGroup && (
              <div className="flex items-center gap-1 sm:gap-2">
                {isAdmin && (
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn btn-ghost btn-sm text-primary flex items-center gap-1"
                  >
                    <UserPlus size={18} />
                    <span className="hidden sm:inline">Add</span>
                  </button>
                )}

                <div className="dropdown dropdown-end">
                  <label
                    tabIndex={0}
                    className="btn btn-ghost btn-xs text-zinc-400"
                  >
                    Options
                  </label>
                  <ul
                    tabIndex={0}
                    className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box w-52 border border-base-300"
                  >
                    <li className="menu-title text-xs uppercase">Members</li>
                    {selectedUser.members.map((member) => (
                      <li
                        key={member._id}
                        className="flex flex-row items-center justify-between group"
                      >
                        <span className="flex-1 truncate text-xs">
                          {member.fullName}{" "}
                          {member._id === selectedUser.admin && "👑"}
                        </span>
                        {isAdmin && member._id !== authUser._id && (
                          <button
                            onClick={() =>
                              removeMember(selectedUser._id, member._id)
                            }
                            className="text-error opacity-0 group-hover:opacity-100 p-1"
                          >
                            <UserMinus size={14} />
                          </button>
                        )}
                      </li>
                    ))}
                    <div className="divider my-1"></div>
                    {isAdmin ? (
                      <li>
                        <button
                          onClick={() => deleteGroup(selectedUser._id)}
                          className="text-error flex items-center gap-2"
                        >
                          <Trash2 size={16} /> Delete Group
                        </button>
                      </li>
                    ) : (
                      <li>
                        <button
                          onClick={() => leaveGroup(selectedUser._id)}
                          className="text-error flex items-center gap-2"
                        >
                          <LogOut size={16} /> Leave Group
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Hide the massive X close button on mobile since we have the native back arrow now */}
            <button
              className="hidden sm:block"
              onClick={() => setSelectedUser(null)}
            >
              <X className="hover:text-error transition-colors" />
            </button>
          </div>
        </div>

        {isGroup && (
          <AddMemberModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            currentMembers={selectedUser.members}
            groupId={selectedUser._id}
          />
        )}
      </div>

      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={selectedUser}
      />
    </>
  );
};

export default ChatHeader;
