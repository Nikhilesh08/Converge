import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { X, Search, Check } from "lucide-react";

const AddMemberModal = ({ isOpen, onClose, currentMembers, groupId }) => {
  const { users, addMembers } = useChatStore();
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  // Filter out users who are already in the group
  const memberIds = currentMembers.map((m) => m._id);
  const potentialMembers = users.filter(
    (u) =>
      !memberIds.includes(u._id) &&
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const toggleUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleAdd = async () => {
    if (selectedUsers.length === 0) return;
    await addMembers(groupId, selectedUsers);
    setSelectedUsers([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-base-100 w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-base-300 flex items-center justify-between">
          <h2 className="text-lg font-bold">Add New Members</h2>
          <button
            onClick={onClose}
            className="hover:bg-base-200 p-1 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 size-4" />
            <input
              type="text"
              placeholder="Search users..."
              className="input input-bordered w-full pl-10 input-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {potentialMembers.length > 0 ? (
            potentialMembers.map((user) => (
              <div
                key={user._id}
                onClick={() => toggleUser(user._id)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${selectedUsers.includes(user._id) ? "bg-primary/10 border-primary" : "hover:bg-base-200 border-transparent"} border`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={user.profilePic || "/avatar.png"}
                    className="size-10 rounded-full object-cover"
                  />
                  <span className="font-medium">{user.fullName}</span>
                </div>
                {selectedUsers.includes(user._id) && (
                  <Check size={18} className="text-primary" />
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-base-content/50 py-10">
              No users found to add.
            </p>
          )}
        </div>

        <div className="p-4 border-t border-base-300 flex gap-3">
          <button onClick={onClose} className="btn btn-ghost flex-1">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selectedUsers.length === 0}
            className="btn btn-primary flex-1"
          >
            Add ({selectedUsers.length})
          </button>
        </div>
      </div>
    </div>
  );
};
export default AddMemberModal;
