import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "../../util/UserContext";
import io from "socket.io-client";
import axios from "axios";
import {
  FiMic, FiMicOff, FiVideo, FiVideoOff,
  FiMonitor, FiPhoneOff, FiArrowLeft, FiLoader
} from "react-icons/fi";
import "./VideoRoom.css";

// ICE servers — Google STUN (free)
const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

const VideoRoom = () => {
  const { roomId } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const socketRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  // State
  const [connectionState, setConnectionState] = useState("lobby"); // lobby | connecting | connected | disconnected
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remotePeerName, setRemotePeerName] = useState("");
  const [remoteMicOn, setRemoteMicOn] = useState(true);
  const [remoteCameraOn, setRemoteCameraOn] = useState(true);
  const [error, setError] = useState(null);

  const userName = user?.name || "Guest";
  const userId = user?._id || Date.now().toString();

  // ─── Get local media stream ────────────────────────────
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Failed to get local media:", err);
      setError("Camera/microphone access denied. Please allow permissions and try again.");
      return null;
    }
  }, []);

  // ─── Create peer connection ────────────────────────────
  const createPeerConnection = useCallback((remotePeerId) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);

    // Add local tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      console.log("[WebRTC] Received remote track:", event.track.kind);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          candidate: event.candidate,
          targetPeerId: remotePeerId,
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state:", pc.connectionState);
      switch (pc.connectionState) {
        case "connected":
          setConnectionState("connected");
          break;
        case "disconnected":
        case "failed":
          setConnectionState("disconnected");
          break;
        case "closed":
          setConnectionState("disconnected");
          break;
        default:
          break;
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setConnectionState("connected");
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, []);

  // ─── Process pending ICE candidates ────────────────────
  const processPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;

    for (const candidate of pendingCandidatesRef.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("[WebRTC] Error adding buffered candidate:", err);
      }
    }
    pendingCandidatesRef.current = [];
  }, []);

  // ─── Join the video room ──────────────────────────────
  const joinRoom = useCallback(async () => {
    setConnectionState("connecting");

    const stream = await getLocalStream();
    if (!stream) return;

    // Connect to Socket.io
    const socket = io(axios.defaults.baseURL, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);

      // Join the video room
      socket.emit("join-video-room", { roomId, userId, userName });
    });

    // When existing peers are already in the room — we create the offer
    socket.on("existing-peers", async (peers) => {
      if (peers.length > 0) {
        const peer = peers[0]; // 1-on-1 call
        setRemotePeerName(peer.userName);

        const pc = createPeerConnection(peer.peerId);

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("video-offer", { offer, targetPeerId: peer.peerId });
        } catch (err) {
          console.error("[WebRTC] Error creating offer:", err);
          setError("Failed to establish connection. Please try again.");
        }
      }
    });

    // When a new peer joins — they will send us an offer
    socket.on("peer-joined", ({ peerId, userName: peerName }) => {
      console.log("[Socket] Peer joined:", peerName);
      setRemotePeerName(peerName);
    });

    // Receive an offer from the other peer
    socket.on("video-offer", async ({ offer, fromPeerId, fromUserName }) => {
      console.log("[WebRTC] Received offer from:", fromUserName);
      setRemotePeerName(fromUserName);

      const pc = createPeerConnection(fromPeerId);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await processPendingCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("video-answer", { answer, targetPeerId: fromPeerId });
      } catch (err) {
        console.error("[WebRTC] Error handling offer:", err);
        setError("Failed to establish connection. Please try again.");
      }
    });

    // Receive the answer
    socket.on("video-answer", async ({ answer, fromPeerId }) => {
      console.log("[WebRTC] Received answer");
      const pc = peerConnectionRef.current;
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await processPendingCandidates();
        } catch (err) {
          console.error("[WebRTC] Error setting remote description:", err);
        }
      }
    });

    // Receive ICE candidates
    socket.on("ice-candidate", async ({ candidate, fromPeerId }) => {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("[WebRTC] Error adding ICE candidate:", err);
        }
      } else {
        // Buffer candidates until remote description is set
        pendingCandidatesRef.current.push(candidate);
      }
    });

    // Peer toggled their media
    socket.on("peer-media-toggled", ({ type, enabled }) => {
      if (type === "audio") setRemoteMicOn(enabled);
      if (type === "video") setRemoteCameraOn(enabled);
    });

    // Peer left
    socket.on("peer-left", ({ userName: peerName }) => {
      console.log("[Socket] Peer left:", peerName);
      setConnectionState("disconnected");
      setRemotePeerName("");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
    });
  }, [roomId, userId, userName, getLocalStream, createPeerConnection, processPendingCandidates]);

  // ─── Media controls ────────────────────────────────────
  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
        socketRef.current?.emit("toggle-media", {
          roomId, type: "audio", enabled: audioTrack.enabled,
        });
      }
    }
  }, [roomId]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
        socketRef.current?.emit("toggle-media", {
          roomId, type: "video", enabled: videoTrack.enabled,
        });
      }
    }
  }, [roomId]);

  const toggleScreenShare = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    if (isScreenSharing) {
      // Stop screen sharing — switch back to camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      const cameraStream = localStreamRef.current;
      if (cameraStream) {
        const videoTrack = cameraStream.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = cameraStream;
        }
      }
      setIsScreenSharing(false);
      socketRef.current?.emit("toggle-media", { roomId, type: "screen", enabled: false });
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" },
          audio: false,
        });
        screenStreamRef.current = screenStream;

        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // When user stops sharing via browser UI
        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
        socketRef.current?.emit("toggle-media", { roomId, type: "screen", enabled: true });
      } catch (err) {
        console.error("Screen share cancelled or failed:", err);
      }
    }
  }, [isScreenSharing, roomId]);

  const endCall = useCallback(() => {
    // Stop all local tracks
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Notify server and disconnect
    socketRef.current?.emit("leave-video-room", { roomId });
    socketRef.current?.disconnect();

    navigate("/meetings");
  }, [roomId, navigate]);

  // ─── Cleanup on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerConnectionRef.current?.close();
      socketRef.current?.emit("leave-video-room", { roomId });
      socketRef.current?.disconnect();
    };
  }, [roomId]);

  // ─── Start camera preview on mount (lobby) ─────────────
  useEffect(() => {
    if (connectionState === "lobby") {
      getLocalStream();
    }
  }, [connectionState, getLocalStream]);

  // ─── Error state ────────────────────────────────────────
  if (error) {
    return (
      <div className="vr-error">
        <div className="vr-error-card">
          <FiVideo size={48} />
          <h2>Connection Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/meetings")} className="vr-back-btn">
            <FiArrowLeft /> Back to Meetings
          </button>
        </div>
      </div>
    );
  }

  // ─── Pre-join Lobby ─────────────────────────────────────
  if (connectionState === "lobby") {
    return (
      <div className="vr-lobby">
        <div className="vr-lobby-card">
          <div className="vr-lobby-header">
            <FiVideo size={24} />
            <h2>Ready to join?</h2>
          </div>
          <p className="vr-lobby-room">Room: {roomId.slice(0, 8)}...</p>

          <div className="vr-lobby-preview">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="vr-lobby-video"
            />
            <div className="vr-lobby-controls">
              <button
                className={`vr-lobby-ctrl ${!isMicOn ? "off" : ""}`}
                onClick={toggleMic}
              >
                {isMicOn ? <FiMic /> : <FiMicOff />}
              </button>
              <button
                className={`vr-lobby-ctrl ${!isCameraOn ? "off" : ""}`}
                onClick={toggleCamera}
              >
                {isCameraOn ? <FiVideo /> : <FiVideoOff />}
              </button>
            </div>
          </div>

          <button className="vr-join-btn" onClick={joinRoom}>
            <FiVideo /> Join Video Call
          </button>
          <button className="vr-cancel-btn" onClick={() => navigate("/meetings")}>
            <FiArrowLeft /> Back to Meetings
          </button>
        </div>
      </div>
    );
  }

  // ─── In-call UI ─────────────────────────────────────────
  return (
    <div className="vr-container">
      {/* Connection status banner */}
      {connectionState === "connecting" && (
        <div className="vr-status-banner connecting">
          <FiLoader className="vr-spinner" />
          Waiting for the other participant to join...
        </div>
      )}
      {connectionState === "disconnected" && (
        <div className="vr-status-banner disconnected">
          The other participant has left the call.
        </div>
      )}

      {/* Video grid */}
      <div className="vr-video-grid">
        {/* Remote video — large */}
        <div className="vr-remote-wrapper">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="vr-remote-video"
          />
          {remotePeerName && connectionState === "connected" && (
            <div className="vr-remote-label">
              <span className="vr-remote-name">{remotePeerName}</span>
              {!remoteMicOn && <FiMicOff className="vr-remote-muted" />}
            </div>
          )}
          {connectionState !== "connected" && (
            <div className="vr-remote-placeholder">
              <div className="vr-remote-avatar">
                {remotePeerName ? remotePeerName.charAt(0).toUpperCase() : "?"}
              </div>
              <p>{remotePeerName || "Waiting for participant..."}</p>
            </div>
          )}
        </div>

        {/* Local video — small PiP */}
        <div className={`vr-local-wrapper ${isScreenSharing ? "screen-sharing" : ""}`}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="vr-local-video"
          />
          <div className="vr-local-label">
            {isScreenSharing && <FiMonitor className="vr-screen-icon" />}
            You
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="vr-control-bar">
        <div className="vr-controls">
          <button
            className={`vr-ctrl-btn ${!isMicOn ? "off" : ""}`}
            onClick={toggleMic}
            title={isMicOn ? "Mute mic" : "Unmute mic"}
          >
            {isMicOn ? <FiMic size={20} /> : <FiMicOff size={20} />}
            <span>{isMicOn ? "Mic" : "Muted"}</span>
          </button>

          <button
            className={`vr-ctrl-btn ${!isCameraOn ? "off" : ""}`}
            onClick={toggleCamera}
            title={isCameraOn ? "Turn off camera" : "Turn on camera"}
          >
            {isCameraOn ? <FiVideo size={20} /> : <FiVideoOff size={20} />}
            <span>{isCameraOn ? "Camera" : "Off"}</span>
          </button>

          <button
            className={`vr-ctrl-btn ${isScreenSharing ? "active" : ""}`}
            onClick={toggleScreenShare}
            title={isScreenSharing ? "Stop sharing" : "Share screen"}
            disabled={connectionState !== "connected"}
          >
            <FiMonitor size={20} />
            <span>{isScreenSharing ? "Sharing" : "Screen"}</span>
          </button>

          <button className="vr-ctrl-btn end" onClick={endCall} title="End call">
            <FiPhoneOff size={20} />
            <span>End</span>
          </button>
        </div>

        <div className="vr-room-info">
          Room: {roomId.slice(0, 8)}...
        </div>
      </div>
    </div>
  );
};

export default VideoRoom;
