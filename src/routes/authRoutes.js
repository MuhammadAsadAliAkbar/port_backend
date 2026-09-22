import express from "express";

import {
  registerUser,
  loginUser,
  getMe,
} from "../controllers/authController.js";

import protect from "../middleware/authMiddleware.js";
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
  protect,
  getMe
);

export default router;