import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore"; // FIX: Need auth store for socket
import { Image, Paperclip, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);

  // FIX: Ref to handle the typing timeout
  const typingTimeoutRef = useRef(null);

  const { sendMessage, selectedUser } = useChatStore();
  const { sendP2PFile } = useCallStore();
  const { socket } = useAuthStore(); // FIX: Extracted socket

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // FIX: Typing Handler
  const handleTyping = (e) => {
    setText(e.target.value);

    if (!socket || !selectedUser) return;

    const isGroup = !!selectedUser.members;
    const targetData = isGroup
      ? { groupId: selectedUser._id }
      : { receiverId: selectedUser._id };

    socket.emit("typing", targetData);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", targetData);
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    // Clear typing timeout and stop typing immediately on send
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (socket && selectedUser) {
      const isGroup = !!selectedUser.members;
      socket.emit(
        "stopTyping",
        isGroup
          ? { groupId: selectedUser._id }
          : { receiverId: selectedUser._id },
      );
    }

    try {
      await sendMessage({ text: text.trim(), image: imagePreview });
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleP2PFileSend = (e) => {
    const file = e.target.files[0];
    if (file) {
      sendP2PFile(file);
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  };

  return (
    <div className="p-4 w-full border-t border-base-300">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="size-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-base-300 flex items-center justify-center hover:bg-error transition-colors"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2 items-center bg-base-200 rounded-lg pr-2">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          <button
            type="button"
            className={`hidden sm:flex btn btn-ghost btn-circle btn-sm ml-2 ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>

          <input
            type="file"
            className="hidden"
            ref={documentInputRef}
            onChange={handleP2PFileSend}
          />
          <button
            type="button"
            className="hidden sm:flex btn btn-ghost btn-circle btn-sm text-zinc-400 hover:text-primary"
            onClick={() => documentInputRef.current?.click()}
            title="Send file directly (Must be in a video call)"
          >
            <Paperclip size={20} />
          </button>

          <input
            type="text"
            className="w-full bg-transparent border-none focus:outline-none px-2 py-3 text-sm"
            placeholder="Type a message..."
            value={text}
            onChange={handleTyping} // FIX: Attached the new handler
          />
        </div>

        <button
          type="submit"
          className="btn btn-sm btn-circle btn-primary"
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
