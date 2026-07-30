import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    messageType: {
      type: String,
      // FIX: Expanded to accept audio and document types
      enum: ["text", "image", "audio", "document", "system"],
      default: "text",
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    audio: {
      type: String, // URL for voice notes
    },
    document: {
      type: String, // URL for PDFs/Docs
    },
    fileName: {
      type: String, // To display the original document name (e.g., "resume.pdf")
    },
    isSeen: {
      type: Boolean,
      default: false,
    },
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      },
    ],
  },
  { timestamps: true },
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
