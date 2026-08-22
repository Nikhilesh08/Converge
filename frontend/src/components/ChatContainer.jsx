import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import {
  Check,
  CheckCheck,
  SmilePlus,
  Trash2,
  Video,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    reactToMessage,
    deleteMessage,
    users,
    hasMore,
    isLoadingMore,
    loadMoreMessages,
    markAsSeen,
  } = useChatStore();

  const { authUser, onlineUsers } = useAuthStore();
  const messageEndRef = useRef(null);
  const observerTarget = useRef(null);
  const [activePickerId, setActivePickerId] = useState(null);
  const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  useEffect(() => {
    getMessages(selectedUser._id);
  }, [selectedUser._id, getMessages]);

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const unreadMessages = messages.filter(
      (m) =>
        !m.isSeen &&
        String(m.senderId._id || m.senderId) !== String(authUser._id),
    );

    if (unreadMessages.length > 0 && !selectedUser.members) {
      markAsSeen(selectedUser._id);
    }
  }, [
    messages,
    selectedUser._id,
    markAsSeen,
    authUser._id,
    selectedUser.members,
  ]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          !isMessagesLoading
        ) {
          loadMoreMessages(selectedUser._id);
        }
      },
      { threshold: 1.0 },
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [
    hasMore,
    isLoadingMore,
    isMessagesLoading,
    loadMoreMessages,
    selectedUser._id,
  ]);

  useEffect(() => {
    if (messageEndRef.current && messages && !isLoadingMore) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoadingMore]);

  const renderReactions = (message, isMyMessage) => {
    const reactions = message.reactions;
    if (!reactions || reactions.length === 0) return null;

    const grouped = {};
    reactions.forEach((r) => {
      if (!grouped[r.emoji]) grouped[r.emoji] = [];
      grouped[r.emoji].push(r.userId);
    });

    const getUserName = (id) => {
      if (String(id) === String(authUser._id)) return "You";
      const contact = users.find((u) => String(u._id) === String(id));
      return contact ? contact.fullName : "Someone";
    };

    return (
      <div
        className={`absolute -bottom-3 ${isMyMessage ? "right-2" : "left-2"} z-10 flex gap-1`}
      >
        {Object.entries(grouped).map(([emoji, userIds]) => {
          const hasMyReaction = userIds.includes(authUser._id);
          const tooltipText = userIds.map(getUserName).join(", ");
          return (
            <button
              key={emoji}
              title={tooltipText}
              onClick={(e) => {
                e.stopPropagation();
                reactToMessage(message._id, emoji);
              }}
              className={`text-[11px] px-1.5 py-0.5 rounded-full shadow-md flex items-center gap-1 border transition-colors ${
                hasMyReaction
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-base-200 border-base-300 hover:bg-base-300"
              }`}
            >
              <span>{emoji}</span>
              {userIds.length > 1 && (
                <span className="font-semibold text-[10px] opacity-70">
                  {userIds.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  const isGroupChat = !!selectedUser.members;
  const isOnline = onlineUsers.includes(selectedUser._id);

  return (
    <div
      className="flex-1 flex flex-col overflow-auto"
      onClick={() => setActivePickerId(null)}
    >
      <ChatHeader />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        <div ref={observerTarget} className="h-1 w-full absolute top-0"></div>
        {isLoadingMore && (
          <div className="flex justify-center my-2">
            <span className="loading loading-spinner loading-sm text-primary"></span>
          </div>
        )}
        {messages.map((message) => {
          if (message.messageType === "system") {
            return (
              <div key={message._id} className="flex justify-center my-2">
                <span className="bg-base-300/50 text-base-content/60 px-4 py-1 rounded-full text-xs italic">
                  {message.text}
                </span>
              </div>
            );
          }

          const isMyMessage =
            String(message.senderId._id || message.senderId) ===
            String(authUser._id);

          // FIX: WhatsApp Style Call Log UI Interception
          if (message.text && message.text.startsWith("📞")) {
            const isCompleted = message.text.includes("•");
            const isMissed = message.text.includes("Missed");
            const isCanceled = message.text.includes("Canceled");

            let subText = "";
            let isRed = false;

            if (isCompleted) {
              subText = message.text.split("•")[1].trim(); // Gets the specific duration timer
            } else if (isCanceled && isMyMessage) {
              subText = "No answer";
            } else if (isCanceled && !isMyMessage) {
              subText = "Missed";
              isRed = true;
            } else if (isMissed) {
              subText = "Missed";
              isRed = true;
            } else {
              subText = "No answer";
            }

            return (
              <div
                key={message._id}
                className={`chat ${isMyMessage ? "chat-end" : "chat-start"} mb-2`}
              >
                <div
                  className={`relative flex flex-col ${isMyMessage ? "bg-[#005c4b]" : "bg-[#202c33]"} text-white rounded-xl p-2 w-56 shadow-sm`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center shrink-0">
                      <Video size={20} className="text-white/90" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="font-medium text-[15px]">
                        Video call
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isMyMessage ? (
                          <ArrowUpRight
                            size={14}
                            className={
                              isRed ? "text-red-400" : "text-green-400"
                            }
                          />
                        ) : (
                          <ArrowDownLeft
                            size={14}
                            className={isRed ? "text-red-400" : "text-zinc-400"}
                          />
                        )}
                        <span
                          className={`text-[13px] ${isRed ? "text-red-400" : "text-white/60"}`}
                        >
                          {subText}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* WhatsApp style embedded bottom-right timestamp */}
                  <div className="flex justify-end items-center gap-1 mt-1 opacity-60">
                    <span className="text-[10px]">
                      {formatMessageTime(message.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          const senderInfo = message.senderId;

          return (
            <div
              key={message._id}
              className={`chat ${isMyMessage ? "chat-end" : "chat-start"} group relative mb-2`}
            >
              <div className="chat-header mb-1 flex flex-col">
                {isGroupChat && !isMyMessage && (
                  <span className="text-xs font-bold text-primary mb-1">
                    {senderInfo.fullName}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <time className="text-xs opacity-50">
                    {formatMessageTime(message.createdAt)}
                  </time>
                  {isMyMessage && (
                    <span className="ml-1">
                      {message.isSeen ? (
                        <CheckCheck
                          size={14}
                          className="text-blue-500"
                          title="Read"
                        />
                      ) : !isGroupChat && isOnline ? (
                        <CheckCheck
                          size={14}
                          className="text-zinc-500"
                          title="Delivered"
                        />
                      ) : (
                        <Check
                          size={14}
                          className="text-zinc-500"
                          title="Sent"
                        />
                      )}
                    </span>
                  )}
                </div>
              </div>

              <div className="relative flex items-center group">
                <div className="relative">
                  <div
                    className={`chat-bubble flex flex-col ${isMyMessage ? "bg-primary text-primary-content" : "bg-[#2C2C2E] text-white"}`}
                  >
                    {message.image && (
                      <img
                        src={message.image}
                        alt="Attachment"
                        className="sm:max-w-[200px] rounded-md mb-2"
                      />
                    )}
                    {message.text && <p>{message.text}</p>}
                  </div>
                  {renderReactions(message, isMyMessage)}
                </div>

                <div
                  className={`hidden group-hover:flex absolute top-1/2 -translate-y-1/2 z-20 gap-2 ${isMyMessage ? "-left-[80px]" : "-right-10"}`}
                >
                  {isMyMessage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMessage(message._id);
                      }}
                      className="p-1.5 rounded-full bg-base-200 hover:bg-error hover:text-white text-base-content transition-all shadow-md"
                      title="Delete for everyone"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePickerId(
                        activePickerId === message._id ? null : message._id,
                      );
                    }}
                    className="p-1.5 rounded-full bg-base-200 hover:bg-base-300 text-base-content transition-all shadow-md"
                    title="React"
                  >
                    <SmilePlus size={16} />
                  </button>
                </div>

                {activePickerId === message._id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute top-full mt-2 bg-base-200 border border-base-300 p-2 rounded-2xl shadow-xl flex gap-2 z-30 ${isMyMessage ? "right-0" : "left-0"}`}
                  >
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          reactToMessage(message._id, emoji);
                          setActivePickerId(null);
                        }}
                        className="text-xl hover:scale-125 transition-transform hover:bg-base-300 p-1 rounded-full"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messageEndRef} />
      </div>
      <MessageInput />
    </div>
  );
};

export default ChatContainer;
