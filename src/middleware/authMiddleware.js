import jwt from "jsonwebtoken";

const protect = async (
  req,
  res,
  next
) => {
  try {
    let token;

    /* =====================================================
       AUTHORIZATION HEADER
    ===================================================== */

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith(
        "Bearer "
      )
    ) {
      token =
        req.headers.authorization.split(
          " "
        )[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Not authorized. Please login.",
      });
    }

    /* =====================================================
       VERIFY TOKEN
    ===================================================== */

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error(
      "Auth Middleware Error:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired authentication token.",
    });
  }
};

export default protect;