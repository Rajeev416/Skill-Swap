import React, { useRef, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { useUser } from "../../util/UserContext";
import { FiArrowLeft, FiVideo } from "react-icons/fi";
import axios from "axios";
import "./VideoRoom.css";

const VideoRoom = () => {
  const { roomId } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();
  const zpRef = useRef(null);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState(null);
  const [zegoConfig, setZegoConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // 1. Fetch secure config from backend
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await axios.get("/meeting/zego-config");
        setZegoConfig(data.data);
      } catch (err) {
        console.error("Failed to fetch Zego config:", err);
        setError("Security check failed. Please ensure you are logged in.");
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  const containerRef = useCallback(
    (element) => {
      if (!element || !zegoConfig) return;

      try {
        const { appID, serverSecret } = zegoConfig;

        if (!appID || !serverSecret) {
          setError("Video call credentials are not available. Contact support.");
          return;
        }

        const userName = user?.name || user?.firstname
          ? `${user.firstname} ${user.lastname}`
          : "Guest";

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appID,
          serverSecret,
          roomId,
          user?._id || Date.now().toString(),
          userName
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        zp.joinRoom({
          container: element,
          scenario: {
            mode: ZegoUIKitPrebuilt.OneONoneCall,
          },
          showPreJoinView: true,
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: true,
          showMyCameraToggleButton: true,
          showMyMicrophoneToggleButton: true,
          showAudioVideoSettingsButton: true,
          showScreenSharingButton: true,
          showTextChat: true,
          showUserList: true,
          showLayoutButton: true,
          maxUsers: 2,
          onJoinRoom: () => {
            setJoined(true);
          },
          onLeaveRoom: () => {
            navigate("/meetings");
          },
        });
      } catch (err) {
        console.error("ZegoCloud initialization error:", err);
        setError("Failed to start video call. Please try again.");
      }
    },
    [roomId, user, navigate, zegoConfig]
  );


  const handleLeave = () => {
    if (zpRef.current) {
      zpRef.current.destroy();
      zpRef.current = null;
    }
    navigate("/meetings");
  };

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

  return (
    <div className="vr-container">
      {/* Top bar with leave button */}
      <div className={`vr-topbar ${joined ? "joined" : ""}`}>
        <button onClick={handleLeave} className="vr-leave-btn">
          <FiArrowLeft /> Leave Meeting
        </button>
        <span className="vr-room-id">Room: {roomId.slice(0, 8)}...</span>
      </div>

      {/* ZegoCloud container */}
      <div ref={containerRef} className="vr-video" />
    </div>
  );
};

export default VideoRoom;
