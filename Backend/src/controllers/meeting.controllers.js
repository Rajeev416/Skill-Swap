import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Meeting } from "../models/meeting.model.js";
import crypto from "crypto";

export const requestMeeting = asyncHandler(async (req, res, next) => {
  console.log("\n******** Inside requestMeeting Controller function ********");

  const { receiverId, scheduledTime, topic } = req.body;
  const requesterId = req.user._id;

  if (!receiverId || !scheduledTime) {
    throw new ApiError(400, "Receiver ID and Scheduled Time are required");
  }

  // Ensure scheduled time is in the future
  if (new Date(scheduledTime) < new Date()) {
    throw new ApiError(400, "Scheduled time must be in the future");
  }

  const existingRequest = await Meeting.findOne({
    requester: requesterId,
    receiver: receiverId,
    status: "Pending",
  });

  if (existingRequest) {
    throw new ApiError(400, "A pending meeting request already exists with this user");
  }

  const meeting = await Meeting.create({
    requester: requesterId,
    receiver: receiverId,
    scheduledTime,
    topic: topic || "Skill Swap Consultation",
  });

  if (!meeting) return next(new ApiError(500, "Meeting request not created"));

  res.status(201).json(new ApiResponse(201, meeting, "Meeting requested successfully"));
});

export const getMeetings = asyncHandler(async (req, res, next) => {
  console.log("\n******** Inside getMeetings Controller function ********");

  const userId = req.user._id;

  // Get all meetings where the user is either the requester or the receiver
  const meetings = await Meeting.find({
    $or: [{ requester: userId }, { receiver: userId }],
  })
    .populate("requester", "username firstname lastname profilePic")
    .populate("receiver", "username firstname lastname profilePic")
    .sort({ scheduledTime: 1 });

  return res.status(200).json(new ApiResponse(200, meetings, "Meetings fetched successfully"));
});

export const acceptMeeting = asyncHandler(async (req, res, next) => {
  console.log("\n******** Inside acceptMeeting Controller function ********");

  const { meetingId } = req.body;
  const receiverId = req.user._id;

  const meeting = await Meeting.findOne({ _id: meetingId, receiver: receiverId, status: "Pending" });

  if (!meeting) {
    throw new ApiError(404, "Pending meeting not found or you are not authorized to accept it");
  }

  const roomId = crypto.randomUUID();

  meeting.status = "Accepted";
  meeting.roomId = roomId;
  await meeting.save();

  res.status(200).json(new ApiResponse(200, meeting, "Meeting accepted successfully"));
});

export const rejectMeeting = asyncHandler(async (req, res, next) => {
  console.log("\n******** Inside rejectMeeting Controller function ********");

  const { meetingId } = req.body;
  const receiverId = req.user._id;

  const meeting = await Meeting.findOne({ _id: meetingId, receiver: receiverId, status: "Pending" });

  if (!meeting) {
    throw new ApiError(404, "Pending meeting not found or you are not authorized to reject it");
  }

  meeting.status = "Rejected";
  await meeting.save();

  res.status(200).json(new ApiResponse(200, null, "Meeting rejected successfully"));
});
