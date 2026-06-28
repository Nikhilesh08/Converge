import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { X } from "lucide-react";
import toast from "react-hot-toast";

const CreateGroupModal = ({ onClose }) => {
  const { users, createGroup } = useChatStore();
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleMember = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      return toast.error("Group name is required");
    }
    if (selectedMembers.length === 0) {
      return toast.error("Please select at least one member");
    }

    setIsLoading(true);
    await createGroup({ name: groupName, members: selectedMembers });
    setIsLoading(false);
    onClose(); // Close modal after successful creation
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-base-100 p-6 rounded-lg w-96 shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create New Group</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-base-300 rounded-full transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 overflow-hidden"
        >
          {/* Group Name Input */}
          <div>
            <label className="label text-sm font-medium">Group Name</label>
            <input
              type="text"
              placeholder="E.g., Placement Prep 2026"
              className="input input-bordered w-full"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          {/* Member Selection List */}
          <div className="flex-1 overflow-y-auto min-h-[200px] border border-base-300 rounded-lg p-2">
            <label className="label text-sm font-medium pt-0">
              Select Members
            </label>
            {users.length === 0 ? (
              <p className="text-center text-sm text-zinc-500 py-4">
                No contacts available
              </p>
            ) : (
              users.map((user) => (
                <label
                  key={user._id}
                  className="flex items-center gap-3 p-2 hover:bg-base-200 rounded-md cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={selectedMembers.includes(user._id)}
                    onChange={() => handleToggleMember(user._id)}
                  />
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.fullName}
                    className="size-8 rounded-full object-cover"
                  />
                  <span className="text-sm font-medium truncate">
                    {user.fullName}
                  </span>
                </label>
              ))
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary w-full mt-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading loading-spinner"></span>
            ) : (
              "Create Group"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
