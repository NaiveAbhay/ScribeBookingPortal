import express from "express";
import { adminMiddleware } from "../middleware/admin.middleware.js";
import { loadScribes,verifyScribes,viewRequests,deleteScribe } from "../controllers/admin.controller.js";
export const adminRoutes=express.Router();      

//getting all scribes 10 at a time according to filter weather verified or unverified
adminRoutes.get("/scribes",adminMiddleware,loadScribes);

//verifying scribe
adminRoutes.post("/verify-scribe",adminMiddleware,verifyScribes);

//to view all requests
adminRoutes.get("/requests",adminMiddleware,viewRequests);

adminRoutes.delete('/scribe/:id',adminMiddleware,deleteScribe)



