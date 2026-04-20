import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Meeting } from "../models/meeting.model.js";
import { User } from "../models/user.model.js";
import { sendMail } from "../utils/SendMail.js";
import crypto from "crypto";

// ─── Email Templates ──────────────────────────────────────────
const meetingRequestEmail = (requesterName, topic, scheduledTime) => `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden;border:1px solid rgba(59,180,161,.25)">
    <div style="background:linear-gradient(135deg,#0d9488,#3bb4a1);padding:28px 32px">
      <h1 style="margin:0;color:#fff;font-size:22px">📹 New Meeting Request</h1>
    </div>
    <div style="padding:28px 32px;color:#e2e8f0">
      <p style="margin:0 0 12px;font-size:15px"><strong style="color:#5eead4">${requesterName}</strong> wants to schedule a video call with you.</p>
      <div style="background:rgba(255,255,255,.05);border-radius:10px;padding:16px;margin:16px 0">
        <p style="margin:0 0 8px;font-size:14px;color:#94a3b8">📝 Topic</p>
        <p style="margin:0 0 16px;font-size:15px;color:#fff">${topic}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#94a3b8">🕐 Scheduled Time</p>
        <p style="margin:0;font-size:15px;color:#fff">${new Date(scheduledTime).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}</p>
      </div>
      <p style="margin:16px 0 0;font-size:14px;color:#94a3b8">Log in to SkillSwap to accept or decline this request.</p>
    </div>
  </div>
`;

const meetingAcceptedEmail = (receiverName, topic, scheduledTime, roomId) => `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden;border:1px solid rgba(59,180,161,.25)">
    <div style="background:linear-gradient(135deg,#0d9488,#3bb4a1);padding:28px 32px">
      <h1 style="margin:0;color:#fff;font-size:22px">✅ Meeting Accepted!</h1>
    </div>
    <div style="padding:28px 32px;color:#e2e8f0">
      <p style="margin:0 0 12px;font-size:15px"><strong style="color:#5eead4">${receiverName}</strong> accepted your video call request!</p>
      <div style="background:rgba(255,255,255,.05);border-radius:10px;padding:16px;margin:16px 0">
        <p style="margin:0 0 8px;font-size:14px;color:#94a3b8">📝 Topic</p>
        <p style="margin:0 0 16px;font-size:15px;color:#fff">${topic}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#94a3b8">🕐 Scheduled Time</p>
        <p style="margin:0;font-size:15px;color:#fff">${new Date(scheduledTime).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}</p>
      </div>
      <p style="margin:16px 0 0;font-size:14px;color:#94a3b8">Visit the Meetings page on SkillSwap to join the call when it's time.</p>
    </div>
  </div>
`;

const meetingRejectedEmail = (receiverName, topic) => `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden;border:1px solid rgba(59,180,161,.25)">
    <div style="background:linear-gradient(135deg,#ef4444,#f87171);padding:28px 32px">
      <h1 style="margin:0;color:#fff;font-size:22px">Meeting Declined</h1>
    </div>
    <div style="padding:28px 32px;color:#e2e8f0">
      <p style="margin:0 0 12px;font-size:15px"><strong style="color:#fca5a5">${receiverName}</strong> declined your meeting request.</p>
      <div style="background:rgba(255,255,255,.05);border-radius:10px;padding:16px;margin:16px 0">
        <p style="margin:0 0 8px;font-size:14px;color:#94a3b8">📝 Topic</p>
        <p style="margin:0;font-size:15px;color:#fff">${topic}</p>
      </div>
      <p style="margin:16px 0 0;font-size:14px;color:#94a3b8">You can send another request with a different time on SkillSwap.</p>
    </div>
  </div>
`;

// ─── Controllers ──────────────────────────────────────────────

export const requestMeeting = asyncHandler(async (req, res, next) => {
  console.log("\n******** Inside requestMeeting Controller function ********");

  const { receiverId, scheduledTime, topic, duration } = req.body;
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

  let meetingDuration = Number(duration) || 30;
  if (meetingDuration > 120) meetingDuration = 120;
  if (meetingDuration < 15) meetingDuration = 15;

  const meeting = await Meeting.create({
    requester: requesterId,
    receiver: receiverId,
    scheduledTime,
    topic: topic || "Skill Swap Consultation",
    duration: meetingDuration,
  });

  if (!meeting) return next(new ApiError(500, "Meeting request not created"));


  // Notify the receiver in real time
  const requesterObj = await User.findById(requesterId).select("name");
  req.app.get("io")?.to(receiverId.toString()).emit("meeting-update", {
    action: "request",
    message: `New meeting request from ${requesterObj?.name || 'someone'}`,
  });

  res.status(201).json(new ApiResponse(201, meeting, "Meeting requested successfully"));
});

export const getMeetings = asyncHandler(async (req, res, next) => {
  console.log("\n******** Inside getMeetings Controller function ********");

  const userId = req.user._id;

  // Auto-complete any accepted meetings whose duration has elapsed
  const now = new Date();
  const activeMeetings = await Meeting.find({
    $or: [{ requester: userId }, { receiver: userId }],
    status: "Accepted",
  });

  const expiredIds = activeMeetings
    .filter((mtg) => now >= new Date(mtg.scheduledTime.getTime() + (mtg.duration || 30) * 60 * 1000))
    .map((mtg) => mtg._id);

  if (expiredIds.length > 0) {
    await Meeting.updateMany(
      { _id: { $in: expiredIds } },
      { $set: { status: "Completed" } }
    );
  }

  // Get all meetings where the user is either the requester or the receiver
  const meetings = await Meeting.find({
    $or: [{ requester: userId }, { receiver: userId }],
  })
    .populate("requester", "username firstname lastname picture name email")
    .populate("receiver", "username firstname lastname picture name email")
    .sort({ scheduledTime: -1 })
    .lean();

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

  // Send email notification to the requester
  try {
    const requester = await User.findById(meeting.requester).select("email name");
    const receiver = await User.findById(receiverId).select("name");
    if (requester?.email) {
      await sendMail(
        requester.email,
        `✅ ${receiver.name} accepted your meeting request!`,
        meetingAcceptedEmail(receiver.name, meeting.topic, meeting.scheduledTime, roomId)
      );
    }
  } catch (emailErr) {
    console.error("Failed to send meeting accepted email:", emailErr.message);
  }

  // Notify the original requester in real time
  req.app.get("io")?.to(meeting.requester.toString()).emit("meeting-update", {
    action: "accept",
    message: "Your meeting request was accepted!",
  });

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

  // Send email notification to the requester
  try {
    const requester = await User.findById(meeting.requester).select("email name");
    const receiver = await User.findById(receiverId).select("name");
    if (requester?.email) {
      await sendMail(
        requester.email,
        `Meeting request declined by ${receiver.name}`,
        meetingRejectedEmail(receiver.name, meeting.topic)
      );
    }
  } catch (emailErr) {
    console.error("Failed to send meeting rejected email:", emailErr.message);
  }

  // Notify the original requester in real time
  req.app.get("io")?.to(meeting.requester.toString()).emit("meeting-update", {
    action: "reject",
    message: "Your meeting request was declined.",
  });

  res.status(200).json(new ApiResponse(200, null, "Meeting rejected successfully"));
});

export const cancelMeeting = asyncHandler(async (req, res, next) => {
  console.log("\n******** Inside cancelMeeting Controller function ********");

  const { meetingId } = req.body;
  const requesterId = req.user._id;

  const meeting = await Meeting.findOne({ _id: meetingId, requester: requesterId, status: "Pending" });

  if (!meeting) {
    throw new ApiError(404, "Pending meeting not found or you are not authorized to cancel it");
  }

  const receiverId = meeting.receiver;
  await Meeting.deleteOne({ _id: meetingId });

  // Notify the receiver in real time
  req.app.get("io")?.to(receiverId.toString()).emit("meeting-update", {
    action: "cancel",
    message: "A pending meeting request was canceled.",
  });

  res.status(200).json(new ApiResponse(200, null, "Meeting cancelled successfully"));
});

export const endMeeting = asyncHandler(async (req, res, next) => {
  console.log("\n******** Inside endMeeting Controller function ********");

  const { roomId, meetingId } = req.body;
  const userId = req.user._id;

  let query = {};
  if (roomId) {
    query = { roomId, status: "Accepted" };
  } else if (meetingId) {
    query = { _id: meetingId, status: "Accepted" };
  } else {
    throw new ApiError(400, "Must provide roomId or meetingId");
  }

  const meeting = await Meeting.findOne(query);

  if (!meeting) {
    throw new ApiError(404, "Active meeting not found");
  }

  // Ensure user is authorized
  if (meeting.requester.toString() !== userId.toString() && meeting.receiver.toString() !== userId.toString()) {
    throw new ApiError(403, "Not authorized to end this meeting");
  }

  meeting.status = "Completed";
  await meeting.save();

  // Notify the other user in real time
  const targetId = meeting.requester.toString() === userId.toString() ? meeting.receiver : meeting.requester;
  req.app.get("io")?.to(targetId.toString()).emit("meeting-update", {
    action: "end",
    message: "A meeting has been completed/ended.",
  });

  res.status(200).json(new ApiResponse(200, meeting, "Meeting completed successfully"));
});

