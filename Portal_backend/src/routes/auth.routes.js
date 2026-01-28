import express from "express";
export const authRoutes=express.Router();      

import {studentRegister,scribeRegister,login,logout} from "../controllers/auth.controller.js"
import { getStreamToken } from "../controllers/chat.controller.js";

//Registration
authRoutes.post("/studentRegister",studentRegister)
authRoutes.post("/scribeRegister",scribeRegister)

//login and logout
authRoutes.post("/login",login)
authRoutes.post("/logout",logout)
authRoutes.post("/streamToken",getStreamToken)

//check previous log in instance before login
// authRoutes.post("/check",userMiddleware,async(req,res)=>{
//     res.json({"Name":"Aayush Sharma"})
// })

