import { X, Mail, Calendar, ShieldCheck } from "lucide-react";
import { formatLastSeen } from "../lib/utils";
import { useAuthStore } from "../store/useAuthStore";

const UserProfileModal = ({ isOpen, onClose, user }) => {
  const { onlineUsers, lastSeenMap } = useAuthStore();

  if (!isOpen || !user) return null;

  const isGroup = !!user.members;
  const isOnline = !isGroup && onlineUsers.includes(user._id);
  const realTimeLastSeen = lastSeenMap[user._id] || user.lastSeen;
  const formattedTime = formatLastSeen(realTimeLastSeen);
  const statusText = isOnline
    ? "Online"
    : formattedTime === "offline"
      ? "Offline"
      : `Last seen ${formattedTime}`;

  return (
    // Increased z-index to ensure it floats above everything
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
      {/* FIX: Added max-h-[90vh] and flex-col so it handles small mobile screens gracefully without breaking layout */}
      <div className="bg-base-100 w-full max-w-sm max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border border-base-300 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full z-10 transition-colors"
        >
          <X size={20} />
        </button>

        {/* FIX: Removed 'aspect-square'. Replaced with 'h-56 sm:h-72' to keep it proportionate. */}
        <div className="relative w-full h-56 sm:h-72 bg-base-200 shrink-0">
          <img
            src={
              isGroup
                ? user.groupPic || "/avatar.png"
                : user.profilePic || "/avatar.png"
            }
            alt={isGroup ? user.name : user.fullName}
            className="w-full h-full object-cover"
          />
          {/* Enhanced Gradient Overlay for better text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h2 className="text-2xl font-bold truncate">
              {isGroup ? user.name : user.fullName}
            </h2>
            <p className="text-sm opacity-90 flex items-center gap-2">
              {!isGroup && (
                <span
                  className={`size-2.5 rounded-full ${isOnline ? "bg-green-500" : "bg-zinc-500"}`}
                />
              )}
              {isGroup ? `${user.members.length} members` : statusText}
            </p>
          </div>
        </div>

        {/* Details Section (Now scrolls if the phone screen is too short) */}
        <div className="p-5 sm:p-6 space-y-4 bg-base-100 overflow-y-auto">
          {!isGroup && user.email && (
            <div className="flex items-center gap-4 text-base-content/80">
              <div className="p-3 bg-base-200 rounded-xl text-primary shrink-0">
                <Mail size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-base-content/50 uppercase">
                  Email Address
                </p>
                <p className="font-medium truncate">{user.email}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 text-base-content/80">
            <div className="p-3 bg-base-200 rounded-xl text-primary shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-base-content/50 uppercase">
                Joined Converge
              </p>
              <p className="font-medium">
                {user.createdAt ? user.createdAt.split("T")[0] : "Recently"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
