import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import mongoose from "mongoose";

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
    console.log("========================================");
    console.log("REGISTER REQUEST");
    console.log("========================================");

    console.log("BODY:", req.body);
    console.log(
      "FILE:",
      req.file
        ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          }
        : "No avatar"
    );

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
        message:
          "Password must be at least 6 characters.",
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
        message:
          "Please enter a valid email address.",
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
       CLOUDINARY AVATAR
    ===================================================== */

   let avatarUrl = "";

if (req.file) {
  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "message-chat/avatars",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    stream.end(req.file.buffer);
  });

  avatarUrl = uploadResult.secure_url;
}

    /* =====================================================
       HASH PASSWORD
    ===================================================== */

    const hashedPassword =
      await bcrypt.hash(password, 12);

    /*
      NOTE:
      confirmPassword ko normally DB mein store
      nahi karna chahiye.

      Lekin aapke current schema mein required hai,
      isliye existing structure ko maintain kar raha hoon.
    */

    const confirmHashedPassword =
      await bcrypt.hash(
        confirmPassword,
        12
      );

    /* =====================================================
       CREATE USER
    ===================================================== */

    const user = await User.create({
      name: cleanName,

      email: cleanEmail,

      avatar: avatarUrl,

      password: hashedPassword,

      confirmPassword: confirmHashedPassword,

      role: "user",

      online: true,

      lastSeen: null,

      isActive: true,
    });

    console.log(
      "User created:",
      user._id
    );

    /* =====================================================
       JWT
    ===================================================== */

    const token = generateToken(user);

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(201).json({
      success: true,

      message:
        "Account created successfully.",

      token,

      user: {
        id: user._id,

        name: user.name,

        email: user.email,

        avatar: user.avatar,

        role: user.role,

        online: user.online,

        lastSeen: user.lastSeen,

        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error(
      "========================================"
    );

    console.error(
      "REGISTER ERROR:"
    );

    console.error(error);

    console.error(
      "ERROR MESSAGE:",
      error.message
    );

    console.error(
      "========================================"
    );

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
       VALIDATION ERROR
    ===================================================== */

    if (error.name === "ValidationError") {
      const messages = Object.values(
        error.errors
      ).map(
        (item) => item.message
      );

      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    /* =====================================================
       SERVER ERROR
    ===================================================== */

    return res.status(500).json({
      success: false,

      message:
        "Something went wrong while creating your account.",

      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
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

    // =====================================================
    // VALIDATE EMAIL
    // =====================================================

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter your email.",
      });
    }

    // =====================================================
    // VALIDATE PASSWORD
    // =====================================================

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Please enter your password.",
      });
    }

    const cleanEmail =
      email.trim().toLowerCase();

    // =====================================================
    // FIND USER
    // =====================================================

    const user = await User.findOne({
      email: cleanEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // =====================================================
    // CHECK PASSWORD
    // =====================================================

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // =====================================================
    // CHECK ACTIVE
    // =====================================================

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been disabled.",
      });
    }

    // =====================================================
    // SET USER ONLINE
    // =====================================================

    user.online = true;

    // Optional: lastSeen ko login par update kar sakte ho
    user.lastSeen = new Date();

    await user.save();

    console.log(
      `User ${user._id} is now ONLINE`
    );

    // =====================================================
    // GENERATE TOKEN
    // =====================================================

    const token = generateToken(user);

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json({
      success: true,
      message: "Login successful.",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || "",

        // IMPORTANT
        online: user.online,

        lastSeen: user.lastSeen,
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
      error: error.message,
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

/* =========================================================
   GET ALL USERS
   GET /api/users
========================================================= */

export const getUsers = async (req, res) => {
  try {
    const currentUserId = req.user?._id;

    /*
      Query parameters:

      ?search=ahmed
      ?page=1
      ?limit=20
    */

    const {
      search = "",
      page = 1,
      limit = 50,
    } = req.query;

    const pageNumber =
      Math.max(Number(page) || 1, 1);

    const limitNumber =
      Math.min(
        Math.max(Number(limit) || 50, 1),
        100
      );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    /* =====================================================
       SEARCH FILTER
    ===================================================== */

    const filter = {};

    /*
      Don't show currently logged-in user
    */

    if (currentUserId) {
      filter._id = {
        $ne: currentUserId,
      };
    }

    /*
      Search by name/email
    */

    if (search.trim()) {
      filter.$or = [
        {
          name: {
            $regex: search.trim(),
            $options: "i",
          },
        },

        {
          email: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    /* =====================================================
       TOTAL USERS
    ===================================================== */

    const totalUsers =
      await User.countDocuments(
        filter
      );

    /* =====================================================
       USERS
    ===================================================== */

    const users =
      await User.find(filter)
        .select("-password")
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean();

    /* =====================================================
       CHAT DATA
    ===================================================== */

    const usersWithChatData =
      await Promise.all(
        users.map(async (user) => {
          let latestMessage = null;
          let unread = 0;

          /*
            If logged-in user exists,
            find conversation information.
          */

          if (currentUserId) {
            latestMessage =
              await Message.findOne({
                $or: [
                  {
                    senderId:
                      currentUserId,

                    receiverId:
                      user._id,
                  },

                  {
                    senderId:
                      user._id,

                    receiverId:
                      currentUserId,
                  },
                ],
              })
                .sort({
                  createdAt: -1,
                })
                .lean();

            /*
              Incoming unread messages
            */

            unread =
              await Message.countDocuments(
                {
                  senderId:
                    user._id,

                  receiverId:
                    currentUserId,

                  read: false,
                }
              );
          }

          /* =================================================
             AVATAR
          ================================================= */

          const avatar =
            user.avatar ||
            user.name
              ?.split(" ")
              .filter(Boolean)
              .map(
                (item) =>
                  item[0]
              )
              .join("")
              .slice(0, 2)
              .toUpperCase() ||
            "U";

          /* =================================================
             RETURN USER
          ================================================= */

          return {
            ...user,

            id: user._id,

            avatar,

            online:
              Boolean(
                user.isOnline ??
                user.online ??
                false
              ),

            lastMessage:
              latestMessage?.text ||
              "",

            lastMessageAt:
              latestMessage?.createdAt ||
              null,

            unread,
          };
        })
      );

    /* =====================================================
       SORT
       Users with latest messages first
    ===================================================== */

    usersWithChatData.sort(
      (a, b) => {
        if (
          !a.lastMessageAt &&
          !b.lastMessageAt
        ) {
          return 0;
        }

        if (!a.lastMessageAt) {
          return 1;
        }

        if (!b.lastMessageAt) {
          return -1;
        }

        return (
          new Date(
            b.lastMessageAt
          ) -
          new Date(
            a.lastMessageAt
          )
        );
      }
    );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(200).json({
      success: true,

      users: usersWithChatData,

      pagination: {
        page: pageNumber,

        limit: limitNumber,

        total: totalUsers,

        totalPages:
          Math.ceil(
            totalUsers /
              limitNumber
          ),

        hasNextPage:
          pageNumber <
          Math.ceil(
            totalUsers /
              limitNumber
          ),

        hasPreviousPage:
          pageNumber > 1,
      },
    });
  } catch (error) {
    console.error(
      "getUsers:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch users",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};



export const getUserById = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.params.userId
      ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to fetch user",
    });
  }
};

export const logout = async (req, res) => {
  try {
    // ============================================
    // GET USER ID
    // ============================================

    const userId =
      req.body?.userId ||
      req.user?._id;

    console.log("Logout Request User ID:", userId);

    // ============================================
    // CHECK USER ID
    // ============================================

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // ============================================
    // CHECK VALID MONGODB OBJECT ID
    // ============================================

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID",
      });
    }

    // ============================================
    // FIND USER
    // ============================================

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ============================================
    // UPDATE ONLINE STATUS
    // ============================================

    user.online = false;

    await user.save();

    console.log(
      `User ${user._id} is now offline`
    );

    // ============================================
    // RESPONSE
    // ============================================

    return res.status(200).json({
      success: true,
      message: "Logout successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        online: user.online,
      },
    });
  } catch (error) {
    console.error(
      "Logout Controller Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
};

export const updateOnlineStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { online } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        online: Boolean(online),
        lastSeen: online ? null : new Date(),
      },
      {
        new: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to update online status",
    });
  }
};