import express from "express";
import { requestMeeting, getMeetings, acceptMeeting, rejectMeeting, cancelMeeting, getZegoConfig } from "../controllers/meeting.controllers.js";
import { verifyJWT_username } from "../middlewares/verifyJWT.middleware.js";

const router = express.Router();

router.post("/request", verifyJWT_username, requestMeeting);
router.get("/", verifyJWT_username, getMeetings);
router.post("/accept", verifyJWT_username, acceptMeeting);
router.post("/reject", verifyJWT_username, rejectMeeting);
router.post("/cancel", verifyJWT_username, cancelMeeting);
router.get("/zego-config", verifyJWT_username, getZegoConfig);

export default router;
