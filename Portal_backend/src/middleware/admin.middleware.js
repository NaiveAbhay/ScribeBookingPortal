import jwt from "jsonwebtoken";

export const adminMiddleware = (req, res, next) => {
  try {
    // get token from cookie
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // role check
    if (decoded.role !== "ADMIN") {
      return res.status(403).json({
        message: "Admin access only"
      });
    }

    // attach user info
    req.user = decoded;

    next();

  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};
