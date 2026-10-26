import mongoose from "mongoose";

import Message from "../models/Message.js";
import User from "../models/User.js";

import pusher from "../utilis/pusher.js";

/* =========================================================
   CONVERSATION ID
========================================================= */

const getConversationId = (
  userA,
  userB
) => {
  const ids = [
    String(userA),
    String(userB),
  ].sort();

  return `${ids[0]}-${ids[1]}`;
};

/* =========================================================
   GET CONVERSATION
========================================================= */

export const getMessages = async (req, res) => {
  try {
    console.log("========== GET MESSAGES ==========");

    console.log("req.user:", req.user);
    console.log("req.params:", req.params);

    /* =====================================================
       CHECK AUTH USER
    ===================================================== */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: req.user is missing",
      });
    }

    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    console.log("currentUserId:", currentUserId);
    console.log("otherUserId:", otherUserId);

    /* =====================================================
       VALIDATE CURRENT USER ID
    ===================================================== */

    if (
      !mongoose.Types.ObjectId.isValid(
        currentUserId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid current user ID",
      });
    }

    /* =====================================================
       VALIDATE OTHER USER ID
    ===================================================== */

    if (
      !mongoose.Types.ObjectId.isValid(
        otherUserId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    /* =====================================================
       CHECK OTHER USER
    ===================================================== */

    const otherUser =
      await User.findById(
        otherUserId
      ).select("-password");

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* =====================================================
       GET CONVERSATION MESSAGES
    ===================================================== */

    const messages =
      await Message.find({
        $or: [
          {
            senderId: currentUserId,
            receiverId: otherUserId,
          },
          {
            senderId: otherUserId,
            receiverId: currentUserId,
          },
        ],
      })
        .populate(
          "senderId",
          "name email avatar role"
        )
        .populate(
          "receiverId",
          "name email avatar role"
        )
        .sort({
          createdAt: 1,
        });

    console.log(
      "Messages found:",
      messages.length
    );

    /* =====================================================
       SUCCESS
    ===================================================== */

    return res.status(200).json({
      success: true,
      user: otherUser,
      messages,
    });

  } catch (error) {
    console.error(
      "========== GET MESSAGES ERROR =========="
    );

    console.error(
      "Error name:",
      error.name
    );

    console.error(
      "Error message:",
      error.message
    );

    console.error(
      "Error stack:",
      error.stack
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch messages",
    });
  }
};

/* =========================================================
   SEND MESSAGE
========================================================= */

/* =========================================================
   SEND MESSAGE
========================================================= */

export const sendMessage = async (
  req,
  res
) => {
  try {
    console.log(
      "========================================"
    );

    console.log(
      "📤 SEND MESSAGE REQUEST"
    );

    console.log(
      "req.user:",
      req.user
    );

    console.log(
      "req.body:",
      req.body
    );

    /* =====================================================
       AUTH
    ===================================================== */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorized: req.user is missing",
      });
    }

    const senderId =
      req.user._id;

    const {
      receiverId,
      text,
    } = req.body;

    console.log(
      "senderId:",
      senderId
    );

    console.log(
      "receiverId:",
      receiverId
    );

    console.log(
      "text:",
      text
    );

    /* =====================================================
       VALIDATE RECEIVER
    ===================================================== */

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message:
          "receiverId is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        receiverId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid receiver ID",
      });
    }

    /* =====================================================
       VALIDATE TEXT
    ===================================================== */

    if (
      !text ||
      !text.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Message text is required",
      });
    }

    /* =====================================================
       CHECK RECEIVER
    ===================================================== */

    const receiver =
      await User.findById(
        receiverId
      );

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message:
          "Receiver not found",
      });
    }

    /* =====================================================
       CREATE MESSAGE
    ===================================================== */

    const message =
      await Message.create({
        senderId,
        receiverId,
        text: text.trim(),
        read: false,
      });

    console.log(
      "✅ MongoDB message created:",
      message._id
    );

    /* =====================================================
       POPULATE
    ===================================================== */

    const populatedMessage =
      await Message.findById(
        message._id
      )
        .populate(
          "senderId",
          "name email avatar role"
        )
        .populate(
          "receiverId",
          "name email avatar role"
        );

    if (!populatedMessage) {
      return res.status(500).json({
        success: false,
        message:
          "Message created but failed to populate",
      });
    }

    /* =====================================================
       CONVERSATION ID
    ===================================================== */

    const conversationId =
      getConversationId(
        String(senderId),
        String(receiverId)
      );

    const channelName =
      `private-chat-${conversationId}`;

    console.log(
      "Conversation ID:",
      conversationId
    );

    console.log(
      "Pusher channel:",
      channelName
    );

    /* =====================================================
       PUSHER
    ===================================================== */

    try {
      const payload = {
        message:
          populatedMessage.toObject(),
      };

      console.log(
        "📡 Sending Pusher event..."
      );

      await pusher.trigger(
        channelName,
        "new-message",
        payload
      );

      console.log(
        "✅ Pusher event sent"
      );

    } catch (pusherError) {
      console.error(
        "❌ Pusher error:",
        pusherError
      );
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(201).json({
      success: true,
      message:
        populatedMessage,
    });

  } catch (error) {
    console.error(
      "========================================"
    );

    console.error(
      "❌ SEND MESSAGE ERROR"
    );

    console.error(
      error
    );

    /* =====================================================
       DUPLICATE KEY
    ===================================================== */

    if (
      error.code === 11000
    ) {
      return res.status(500).json({
        success: false,
        message:
          "MongoDB duplicate key error",
        error:
          error.message,
      });
    }

    /* =====================================================
       GENERAL ERROR
    ===================================================== */

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to send message",
    });
  }
};

/* =========================================================
   MARK MESSAGES READ
========================================================= */

export const markMessagesRead =
  async (req, res) => {
    try {
      const currentUserId =
        req.user._id;

      const otherUserId =
        req.params.userId;

      await Message.updateMany(
        {
          senderId:
            otherUserId,

          receiverId:
            currentUserId,

          read: false,
        },

        {
          $set: {
            read: true,
          },
        }
      );

      res.json({
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          "Failed to mark messages read",
      });
    }
  };

  export const pusherAuth = async (
  req,
  res
) => {
  try {
    console.log(
      "========================================"
    );

    console.log(
      "🔐 PUSHER AUTH"
    );

    const socketId =
      req.body.socket_id;

    const channelName =
      req.body.channel_name;

    console.log(
      "socket_id:",
      socketId
    );

    console.log(
      "channel_name:",
      channelName
    );

    if (
      !socketId ||
      !channelName
    ) {
      return res.status(400).json({
        success: false,
        message:
          "socket_id and channel_name are required",
      });
    }

    /* =====================================================
       ONLY ALLOW OUR PRIVATE CHAT CHANNELS
    ===================================================== */

    if (
      !channelName.startsWith(
        "private-chat-"
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Invalid Pusher channel",
      });
    }

    /* =====================================================
       AUTHORIZE
    ===================================================== */

    const authResponse =
      pusher.authorizeChannel(
        socketId,
        channelName
      );

    console.log(
      "✅ Pusher channel authorized"
    );

    return res.json(
      authResponse
    );

  } catch (error) {
    console.error(
      "❌ Pusher AUTH ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Pusher authentication failed",
    });
  }
};