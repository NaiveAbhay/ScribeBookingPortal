import express from "express";
import { login, studentRegister, scribeRegister, logout } from "../controllers/auth.controller.js";
// Import BOTH chat controllers
import { getStreamToken, getChatParticipants } from "../controllers/chat.controller.js";
import { userMiddleware } from "../middleware/user.middleware.js";

export const authRoutes = express.Router();

authRoutes.post("/studentRegister", studentRegister);
authRoutes.post("/scribeRegister", scribeRegister);
authRoutes.post("/login", login);
authRoutes.post("/logout", logout);

authRoutes.post("/streamToken", userMiddleware, getStreamToken);

// --- NEW ROUTE ---
authRoutes.get("/chat/participants/:requestId", userMiddleware, getChatParticipants);