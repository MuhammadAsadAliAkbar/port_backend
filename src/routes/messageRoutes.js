import express from "express";

import {
  getMessages,
  sendMessage,
  markMessagesRead,
} from "../controllers/messageController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router =
  express.Router();

/* Conversation */

router.get(
  "/:userId",
  authMiddleware,
  getMessages
);

/* Mark read */

router.patch(
  "/:userId/read",
  authMiddleware,
  markMessagesRead
);

/* Send */

router.post(
  "/",
  authMiddleware,
  sendMessage
);

export default router;