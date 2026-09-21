import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/* =========================================================
   GENERATE JWT
========================================================= */

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

/* =========================================================
   REGISTER
   POST /api/auth/register
========================================================= */

export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
    } = req.body;

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter your name.",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter your email.",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Please enter your password.",
      });
    }

    if (!confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please confirm your password.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    /* =====================================================
       CONFIRM PASSWORD
    ===================================================== */

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    /* =====================================================
       EMAIL VALIDATION
    ===================================================== */

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    /* =====================================================
       NORMALIZE DATA
    ===================================================== */

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    /* =====================================================
       CHECK EXISTING USER
    ===================================================== */

    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists.",
      });
    }

    /* =====================================================
       HASH PASSWORD
    ===================================================== */

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

      const confirmHashedPassword = await bcrypt.hash(
      confirmPassword,
      12
    );

    /* =====================================================
       CREATE USER
    ===================================================== */

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      confirmPassword: confirmHashedPassword,
      role: "user",
    });

    /* =====================================================
       JWT
    ===================================================== */

    const token = generateToken(user);

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });

  } catch (error) {
    console.error("Register Error:", error);

    /* =====================================================
       MONGO DUPLICATE KEY
    ===================================================== */

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists.",
      });
    }

    /* =====================================================
       SERVER ERROR
    ===================================================== */

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while creating your account.",
    });
  }
};

/* =========================================================
   LOGIN
   POST /api/auth/login
========================================================= */

export const loginUser = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter your email.",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Please enter your password.",
      });
    }

    const cleanEmail =
      email.trim().toLowerCase();

    /* =====================================================
       FIND USER + PASSWORD
    ===================================================== */

    const user = await User.findOne({
      email: cleanEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    /* =====================================================
       CHECK PASSWORD
    ===================================================== */

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    /* =====================================================
       CHECK ACTIVE
    ===================================================== */

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been disabled.",
      });
    }

    /* =====================================================
       GENERATE TOKEN
    ===================================================== */

    const token = generateToken(user);

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(200).json({
      success: true,
      message: "Login successful.",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error(
      "Login Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while logging in.",
    });
  }
};

/* =========================================================
   GET CURRENT USER
   GET /api/auth/me
========================================================= */

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(
      req.user.id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "Get Me Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch user information.",
    });
  }
};