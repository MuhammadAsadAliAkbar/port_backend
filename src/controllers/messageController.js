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

export const getMessages =
  async (req, res) => {
    try {
      const currentUserId =
        req.user._id;

      const otherUserId =
        req.params.userId;

      if (
        !mongoose.Types.ObjectId.isValid(
          otherUserId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user ID",
        });
      }

      const otherUser =
        await User.findById(
          otherUserId
        ).select("-password");

      if (!otherUser) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      const messages =
        await Message.find({
          $or: [
            {
              senderId:
                currentUserId,

              receiverId:
                otherUserId,
            },

            {
              senderId:
                otherUserId,

              receiverId:
                currentUserId,
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

      res.json({
        success: true,

        user: otherUser,

        messages,
      });
    } catch (error) {
      console.error(
        "getMessages:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch messages",
      });
    }
  };

/* =========================================================
   SEND MESSAGE
========================================================= */

export const sendMessage =
  async (req, res) => {
    try {
      const senderId =
        req.user._id;

      const {
        receiverId,
        text,
      } = req.body;

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

      const message =
        await Message.create({
          senderId,

          receiverId,

          text: text.trim(),

          read: false,
        });

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

      const conversationId =
        getConversationId(
          senderId,
          receiverId
        );

      /* =====================================================
         PUSHER REAL TIME EVENT
      ===================================================== */

      await pusher.trigger(
        `private-chat-${conversationId}`,
        "new-message",
        {
          message:
            populatedMessage,
        }
      );

      res.status(201).json({
        success: true,

        message:
          populatedMessage,
      });
    } catch (error) {
      console.error(
        "sendMessage:",
        error
      );

      res.status(500).json({
        success: false,
        message:
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