import mongoose from "mongoose";

const messageSchema =
  new mongoose.Schema(
    {
      messageId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      conversationId: {
        type: String,
        required: true,
        index: true,
      },

      senderId: {
        type: String,
        required: true,
      },

      senderName: {
        type: String,
        required: true,
      },

      senderType: {
        type: String,
        enum: [
          "visitor",
          "admin",
        ],
        required: true,
      },

      message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000,
      },
    },

    {
      timestamps: true,
    }
  );

const Message =
  mongoose.model(
    "Message",
    messageSchema
  );

export default Message;