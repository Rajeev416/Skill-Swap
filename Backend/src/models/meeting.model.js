import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema(
  {
    requester: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    receiver: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    scheduledTime: {
      type: Date,
      required: true,
    },
    topic: {
      type: String,
      default: "Skill Swap Consultation",
    },
    duration: {
      type: Number,
      default: 30, // Default duration in minutes
      min: 15,
      max: 120, // Max 2 hours
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected", "Completed"],
      default: "Pending",
    },
    roomId: {
      type: String,
      // Generated when meeting is accepted
    },
  },
  { timestamps: true }
);

meetingSchema.index({ requester: 1, receiver: 1 });
meetingSchema.index({ receiver: 1, requester: 1 });
meetingSchema.index({ scheduledTime: 1 });

export const Meeting = mongoose.model("Meeting", meetingSchema);
