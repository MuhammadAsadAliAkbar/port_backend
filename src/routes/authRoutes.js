import express from "express";

import {
  registerUser,
  loginUser,
  getMe,
  getUsers,
  updateOnlineStatus,
  getUserById,
  logout
} from "../controllers/authController.js";

import authMiddleware  from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

/* =========================================================
   PUBLIC ROUTES
========================================================= */

router.post(
  "/register",
  upload.single("avatar"),
  registerUser
);

router.post(
  "/login",
  loginUser
);

/* =========================================================
   PROTECTED ROUTES
========================================================= */

router.get(
  "/me",
  authMiddleware,
  getMe
);

router.get(
  "/",
  getUsers
);

router.get(
  "/:userId",
  authMiddleware,
  getUserById
);

router.post(
  "/logout",
  logout
);

router.patch(
  "/:userId/online",
  updateOnlineStatus
);

export default router;