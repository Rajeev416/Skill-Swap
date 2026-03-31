import React from "react";
import { useParams } from "react-router-dom";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { useUser } from "../../util/UserContext";

const VideoRoom = () => {
  const { roomId } = useParams();
  const { user } = useUser();

  const myMeeting = async (element) => {
    // Read credentials from your Frontend/.env file
    const appID = Number(import.meta.env.VITE_ZEGO_APP_ID);
    const serverSecret = import.meta.env.VITE_ZEGO_SERVER_SECRET;

    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      appID,
      serverSecret,
      roomId,
      user?._id || Date.now().toString(),
      user?.firstname ? `${user.firstname} ${user.lastname}` : "Guest"
    );

    const zp = ZegoUIKitPrebuilt.create(kitToken);

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
    });
  };

  return (
    <div
      ref={myMeeting}
      style={{ width: "100%", height: "100vh", background: "#0A0E17" }}
    ></div>
  );
};

export default VideoRoom;
