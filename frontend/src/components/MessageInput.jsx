import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";
import EmojiPicker from "emoji-picker-react";
import {
  Image,
  Paperclip,
  Send,
  X,
  Smile,
  Plus,
  Mic,
  Square,
  FileText,
  Camera as CameraIcon,
  Headphones,
} from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentName, setDocumentName] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);

  // UI States
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Refs
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const { sendMessage, selectedUser } = useChatStore();
  const { sendP2PFile } = useCallStore();
  const { socket } = useAuthStore();

  // Handle outside clicks for menus
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".menu-container")) {
        setShowAttachMenu(false);
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Timer for voice recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
    setShowAttachMenu(false);
  };

  const handleDocumentChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDocumentName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => setDocumentFile(reader.result);
    reader.readAsDataURL(file);
    setShowAttachMenu(false);
  };

  const removeAttachment = () => {
    setImagePreview(null);
    setDocumentFile(null);
    setDocumentName("");
    setAudioBlob(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (documentInputRef.current) documentInputRef.current.value = "";
  };

  const onEmojiClick = (emojiObject) => {
    setText((prev) => prev + emojiObject.emoji);
  };

  // --- AUDIO RECORDING LOGIC ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audio = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audio);
        reader.onloadend = () => setAudioBlob(reader.result);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      toast.error("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    audioChunksRef.current = [];
  };
  // -----------------------------

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
    if (!text.trim() && !imagePreview && !documentFile && !audioBlob) return;

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
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        document: documentFile,
        fileName: documentName,
        audio: audioBlob,
      });
      setText("");
      removeAttachment();
      setShowEmojiPicker(false);
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const isReadyToSend =
    text.trim() || imagePreview || documentFile || audioBlob;

  return (
    <div className="p-3 w-full border-t border-base-300 bg-base-100 menu-container relative">
      {/* ATTACHMENT PREVIEW TRAY */}
      {(imagePreview || documentFile || audioBlob) && (
        <div className="mb-3 p-3 bg-base-200 rounded-xl relative flex items-center gap-3">
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              className="size-16 object-cover rounded-lg border border-base-300"
            />
          )}
          {documentFile && (
            <div className="flex items-center gap-2 bg-base-300 p-2 rounded-lg">
              <FileText className="text-blue-500" />
              <span className="text-sm font-medium truncate max-w-[200px]">
                {documentName}
              </span>
            </div>
          )}
          {audioBlob && (
            <div className="flex items-center gap-2 bg-base-300 p-2 rounded-lg">
              <Headphones className="text-primary" />
              <span className="text-sm font-medium">Voice Note Ready</span>
            </div>
          )}
          <button
            onClick={removeAttachment}
            className="absolute -top-2 -right-2 size-6 rounded-full bg-error text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* WHATSAPP-STYLE MENU DROPDOWN */}
      {showAttachMenu && (
        <div className="absolute bottom-20 left-4 bg-base-200 border border-base-300 rounded-2xl p-2 w-56 shadow-2xl flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-bottom-4">
          <button
            onClick={() => documentInputRef.current?.click()}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-base-300 transition-colors text-left"
          >
            <div className="bg-indigo-500 p-2 rounded-full text-white">
              <FileText size={18} />
            </div>
            <span className="font-medium text-sm">Document</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-base-300 transition-colors text-left"
          >
            <div className="bg-blue-500 p-2 rounded-full text-white">
              <Image size={18} />
            </div>
            <span className="font-medium text-sm">Photos & videos</span>
          </button>

          <button className="flex items-center gap-3 p-3 rounded-xl hover:bg-base-300 transition-colors text-left">
            <div className="bg-pink-500 p-2 rounded-full text-white">
              <CameraIcon size={18} />
            </div>
            <span className="font-medium text-sm">Camera</span>
          </button>
        </div>
      )}

      {/* EMOJI PICKER */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 z-50 shadow-2xl rounded-2xl overflow-hidden">
          <EmojiPicker onEmojiClick={onEmojiClick} theme="auto" />
        </div>
      )}

      {/* HIDDEN INPUTS */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImageChange}
      />
      <input
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        className="hidden"
        ref={documentInputRef}
        onChange={handleDocumentChange}
      />

      <div className="flex items-end gap-2">
        {/* MAIN INPUT BUBBLE */}
        <div className="flex-1 flex items-end gap-2 bg-base-200 rounded-3xl p-1.5 px-2 relative min-h-[50px]">
          {!isRecording ? (
            <>
              {/* Left Icons */}
              <div className="flex items-center gap-1 pb-1 px-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    setShowAttachMenu(false);
                  }}
                  className="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-base-content"
                >
                  <Smile size={24} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(!showAttachMenu);
                    setShowEmojiPicker(false);
                  }}
                  className="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-base-content transition-transform duration-300"
                  style={{
                    transform: showAttachMenu
                      ? "rotate(45deg)"
                      : "rotate(0deg)",
                  }}
                >
                  <Plus size={26} strokeWidth={2} />
                </button>
              </div>

              {/* Text Input */}
              <textarea
                className="w-full bg-transparent border-none focus:outline-none py-3 text-[15px] resize-none max-h-32 placeholder-base-content/50"
                placeholder="Type a message"
                value={text}
                onChange={handleTyping}
                rows={1}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
              />
            </>
          ) : (
            /* RECORDING STATE UI */
            <div className="flex-1 flex items-center justify-between px-4 py-2 w-full animate-pulse">
              <div className="flex items-center gap-3 text-error">
                <div className="size-3 rounded-full bg-error animate-ping" />
                <span className="font-medium text-[15px]">
                  {formatTime(recordingTime)}
                </span>
              </div>
              <button
                type="button"
                onClick={cancelRecording}
                className="text-base-content/60 hover:text-error transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* SEND / MIC BUTTON */}
        <div className="shrink-0 flex items-end pb-1">
          {isReadyToSend ? (
            <button
              onClick={handleSendMessage}
              className="btn btn-circle bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-md h-12 w-12"
            >
              <Send size={20} className="ml-1" />
            </button>
          ) : isRecording ? (
            <button
              onClick={stopRecording}
              className="btn btn-circle bg-error hover:bg-error text-white border-none shadow-md h-12 w-12 animate-bounce"
            >
              <Square size={18} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="btn btn-circle bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-md h-12 w-12"
            >
              <Mic size={22} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
