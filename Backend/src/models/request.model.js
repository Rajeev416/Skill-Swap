import mongoose, { Schema } from "mongoose";

const requestSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    receiver: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["Pending", "Rejected", "Connected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

// Performance optimization: Indexes for fast connection status queries
requestSchema.index({ sender: 1, receiver: 1 });
requestSchema.index({ receiver: 1, sender: 1 });

export const Request = mongoose.model("Request", requestSchema);
