import dotenv from "dotenv";
import connectDB from "./config/connectDB.js";
import { app } from "./app.js";
import { Server } from "socket.io";

dotenv.config();

const port = process.env.PORT || 8000;

connectDB()
  .then(() => {
    console.log("Database connected");
    const server = app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });

    const io = new Server(server, {
      pingTimeout: 60000,
      cors: {
        origin: process.env.FRONTEND_URL || "*",
        credentials: true,
      },
    });

    app.set("io", io);

    io.on("connection", (socket) => {
      console.log("Connected to socket:", socket.id);

      // ─── Chat Events ───────────────────────────────────
      socket.on("setup", (userData) => {
        console.log("Connected to socket in setup: ", userData.username);
        socket.join(userData._id);
        socket.emit("connected");
      });

      socket.on("join chat", (room) => {
        console.log("Joining chat: ", room);
        socket.join(room);
        console.log("Joined chat: ", room);
      });

      socket.on("new message", (newMessage) => {
        var chat = newMessage.chatId;
        if (!chat.users) return console.log("Chat.users not defined");
        chat.users.forEach((user) => {
          if (user._id === newMessage.sender._id) return;
          io.to(user._id).emit("message recieved", newMessage);
          console.log("Message sent to: ", user._id);
        });
      });

      // ─── WebRTC Signaling Events ───────────────────────

      // User joins a video room
      socket.on("join-video-room", ({ roomId, userId, userName }) => {
        socket.join(roomId);
        socket.videoRoomId = roomId;
        socket.videoUserId = userId;
        socket.videoUserName = userName;

        // Notify others in the room that a new peer joined
        socket.to(roomId).emit("peer-joined", {
          peerId: socket.id,
          userId,
          userName,
        });

        // Tell the joiner about existing peers in the room
        const roomSockets = io.sockets.adapter.rooms.get(roomId);
        if (roomSockets) {
          const peers = [];
          for (const socketId of roomSockets) {
            if (socketId !== socket.id) {
              const peerSocket = io.sockets.sockets.get(socketId);
              if (peerSocket) {
                peers.push({
                  peerId: socketId,
                  userId: peerSocket.videoUserId,
                  userName: peerSocket.videoUserName,
                });
              }
            }
          }
          socket.emit("existing-peers", peers);
        }

        console.log(`[WebRTC] ${userName} joined room ${roomId}`);
      });

      // Forward SDP offer to the target peer
      socket.on("video-offer", ({ offer, targetPeerId }) => {
        socket.to(targetPeerId).emit("video-offer", {
          offer,
          fromPeerId: socket.id,
          fromUserName: socket.videoUserName,
        });
      });

      // Forward SDP answer back to the offering peer
      socket.on("video-answer", ({ answer, targetPeerId }) => {
        socket.to(targetPeerId).emit("video-answer", {
          answer,
          fromPeerId: socket.id,
        });
      });

      // Forward ICE candidates for NAT traversal
      socket.on("ice-candidate", ({ candidate, targetPeerId }) => {
        socket.to(targetPeerId).emit("ice-candidate", {
          candidate,
          fromPeerId: socket.id,
        });
      });

      // Notify partner when mic/camera/screen is toggled
      socket.on("toggle-media", ({ roomId, type, enabled }) => {
        socket.to(roomId).emit("peer-media-toggled", {
          peerId: socket.id,
          type, // "audio" | "video" | "screen"
          enabled,
        });
      });

      // User leaves the video room
      socket.on("leave-video-room", ({ roomId }) => {
        socket.leave(roomId);
        socket.to(roomId).emit("peer-left", {
          peerId: socket.id,
          userName: socket.videoUserName,
        });
        console.log(`[WebRTC] ${socket.videoUserName} left room ${roomId}`);
        socket.videoRoomId = null;
      });

      // ─── Disconnect ─────────────────────────────────────
      socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id);
        // Notify the video room if user was in one
        if (socket.videoRoomId) {
          socket.to(socket.videoRoomId).emit("peer-left", {
            peerId: socket.id,
            userName: socket.videoUserName,
          });
        }
      });
    });
  })
  .catch((err) => {
    console.log(err);
  });
