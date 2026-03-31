import express from "express";
import { requestMeeting, getMeetings, acceptMeeting, rejectMeeting } from "../controllers/meeting.controllers.js";
import { verifyJWT_username } from "../middlewares/verifyJWT.middleware.js";

const router = express.Router();

router.post("/request", verifyJWT_username, requestMeeting);
router.get("/", verifyJWT_username, getMeetings);
router.post("/accept", verifyJWT_username, acceptMeeting);
router.post("/reject", verifyJWT_username, rejectMeeting);

export default router;
