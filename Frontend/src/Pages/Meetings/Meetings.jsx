import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../../util/UserContext";
import { toast } from "react-toastify";
import axios from "axios";
import {
  FiVideo, FiCalendar, FiClock, FiCheck, FiX,
  FiUser, FiSend, FiArchive, FiTrash2
} from "react-icons/fi";
import "./Meetings.css";

import io from "socket.io-client";

/* ─── Countdown hook ─────────────────────────────────── */
const useCountdown = (targetDate) => {
  const calc = useCallback(() => {
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      isLive: false,
    };
  }, [targetDate]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return time;
};

/* ─── Countdown display component ────────────────────── */
const Countdown = ({ targetDate }) => {
  const { days, hours, minutes, seconds, isLive } = useCountdown(targetDate);
  if (isLive) return <span className="mtg-live-badge">● LIVE NOW</span>;
  return (
    <div className="mtg-countdown">
      {days > 0 && <div className="mtg-cd-unit"><span>{days}</span><small>d</small></div>}
      <div className="mtg-cd-unit"><span>{String(hours).padStart(2, "0")}</span><small>h</small></div>
      <div className="mtg-cd-unit"><span>{String(minutes).padStart(2, "0")}</span><small>m</small></div>
      <div className="mtg-cd-unit"><span>{String(seconds).padStart(2, "0")}</span><small>s</small></div>
    </div>
  );
};

let socket;

/* ─── Main Component ─────────────────────────────────── */
const Meetings = () => {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/meeting");
      setMeetings(data.data);
    } catch (error) {
      if (error?.response?.data?.message === "Please Login") {
        localStorage.removeItem("userInfo");
        setUser(null);
        await axios.get("/auth/logout");
        navigate("/login");
      }
      toast.error("Failed to load meetings");
    } finally {
      setLoading(false);
    }
  }, [navigate, setUser]);

  // Initial fetch + periodic refresh (catches expired meetings)
  useEffect(() => {
    fetchMeetings();
    const interval = setInterval(fetchMeetings, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [fetchMeetings]);

  // Socket Connection for Real-Time Updates
  useEffect(() => {
    socket = io(axios.defaults.baseURL);
    if (user) {
      socket.emit("setup", user);
    }

    const handleUpdate = (data) => {
      fetchMeetings();
      if (data && data.message) {
        toast.info(data.message);
      }
    };

    socket.on("meeting-update", handleUpdate);

    return () => {
      socket.off("meeting-update", handleUpdate);
      socket.disconnect();
    };
  }, [user, fetchMeetings]);


  const handleAccept = async (meetingId) => {
    try {
      const { data } = await axios.post("/meeting/accept", { meetingId });
      toast.success(data.message);
      await fetchMeetings();
      setActiveTab("upcoming");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Error accepting meeting");
    }
  };

  const handleReject = async (meetingId) => {
    try {
      const { data } = await axios.post("/meeting/reject", { meetingId });
      toast.success(data.message);
      await fetchMeetings();
      setActiveTab("history");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Error rejecting meeting");
    }
  };

  const handleCancel = async (meetingId) => {
    try {
      const { data } = await axios.post("/meeting/cancel", { meetingId });
      toast.success(data.message);
      fetchMeetings();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Error cancelling meeting");
    }
  };

  const handleEndMeeting = async (meetingId) => {
    try {
      const { data } = await axios.post("/meeting/end", { meetingId });
      toast.success("Meeting ended/cancelled.");
      fetchMeetings();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Error ending meeting");
    }
  };

  if (loading) {
    return (
      <div className="mtg-loader">
        <div className="mtg-spinner">
          <FiVideo size={28} />
        </div>
        <p className="mtg-loader-text">Loading meetings...</p>
      </div>
    );
  }

  // Filter data
  const upcomingMeetings = meetings.filter((m) => m.status === "Accepted");
  const incomingRequests = meetings.filter(
    (m) => m.status === "Pending" && m.receiver?._id === user?._id
  );
  const outgoingRequests = meetings.filter(
    (m) => m.status === "Pending" && m.requester?._id === user?._id
  );
  const history = meetings.filter(
    (m) => m.status === "Rejected" || m.status === "Completed"
  );

  const tabs = [
    { key: "upcoming", label: "Upcoming", icon: <FiVideo size={16} />, count: upcomingMeetings.length, color: "teal" },
    { key: "incoming", label: "Incoming", icon: <FiUser size={16} />, count: incomingRequests.length, color: "amber" },
    { key: "outgoing", label: "Sent", icon: <FiSend size={16} />, count: outgoingRequests.length, color: "blue" },
    { key: "history", label: "History", icon: <FiArchive size={16} />, count: history.length, color: "gray" },
  ];

  const getAvatar = (person) => person?.picture || person?.profilePic || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcToK4qEfbnd-RN82wdL2awn_PMviy_pelocqQ";
  const getName = (person) => person?.name || `${person?.firstname || ""} ${person?.lastname || ""}`.trim() || "User";

  return (
    <div className="mtg-dashboard">
      {/* ━━ Header ━━ */}
      <div className="mtg-header">
        <div className="mtg-header-mesh" />
        <div className="mtg-wrap">
          <div className="mtg-header-content">
            <div className="mtg-header-icon">
              <FiVideo size={28} />
            </div>
            <div>
              <h1>Meetings Hub</h1>
              <p>Manage video calls, view requests, and join sessions.</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="mtg-stats">
            <div className="mtg-stat">
              <span className="mtg-stat-num teal">{upcomingMeetings.length}</span>
              <span className="mtg-stat-label">Upcoming</span>
            </div>
            <div className="mtg-stat">
              <span className="mtg-stat-num amber">{incomingRequests.length}</span>
              <span className="mtg-stat-label">Pending</span>
            </div>
            <div className="mtg-stat">
              <span className="mtg-stat-num blue">{outgoingRequests.length}</span>
              <span className="mtg-stat-label">Sent</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mtg-wrap">
        {/* ━━ Tabs ━━ */}
        <div className="mtg-tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`mtg-tab ${activeTab === t.key ? "active" : ""}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.icon}
              {t.label}
              {t.count > 0 && <span className={`badge ${t.color}`}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* ━━ Content ━━ */}
        <div className="mtg-content">

          {/* UPCOMING */}
          {activeTab === "upcoming" && (
            <div className="mtg-list">
              {upcomingMeetings.length === 0 ? (
                <EmptyState
                  icon={<FiCalendar size={44} />}
                  title="No Upcoming Calls"
                  subtitle="When someone accepts your request, it will appear here."
                />
              ) : (
                upcomingMeetings.map((mtg) => {
                  const partner = mtg.requester?._id === user?._id ? mtg.receiver : mtg.requester;
                  const isReady = new Date(mtg.scheduledTime).getTime() - Date.now() <= 15 * 60 * 1000;
                  return (
                    <div key={mtg._id} className="mtg-card accepted">
                      <div className="mtg-card-glow" />
                      <div className="mtg-card-head">
                        <img src={getAvatar(partner)} alt="" className="mtg-avatar" />
                        <div className="mtg-info">
                          <h4>{mtg.topic}</h4>
                          <p>
                            with <strong>{getName(partner)}</strong>
                          </p>
                        </div>
                        <div className="mtg-time-badge">
                          <FiClock />
                          {new Date(mtg.scheduledTime).toLocaleString("en-US", {
                            month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                          })}
                          {mtg.duration && ` • ${mtg.duration} min`}
                        </div>
                      </div>

                      <div className="mtg-card-body">
                        <Countdown targetDate={mtg.scheduledTime} />
                      </div>

                      <div className="mtg-card-actions" style={{gap: "0.5rem"}}>
                        {isReady ? (
                          <Link to={`/room/${mtg.roomId}`} className="mtg-btn join-btn">
                            <FiVideo /> Join Video Call
                          </Link>
                        ) : (
                           <button disabled className="mtg-btn join-btn disabled" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", cursor: "not-allowed" }}>
                             <FiVideo /> Not Time Yet
                           </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* INCOMING */}
          {activeTab === "incoming" && (
            <div className="mtg-list">
              {incomingRequests.length === 0 ? (
                <EmptyState
                  icon={<FiUser size={44} />}
                  title="No Incoming Requests"
                  subtitle="You have no pending video call requests."
                />
              ) : (
                incomingRequests.map((mtg) => (
                  <div key={mtg._id} className="mtg-card pending">
                    <div className="mtg-card-head">
                      <img src={getAvatar(mtg.requester)} alt="" className="mtg-avatar" />
                      <div className="mtg-info">
                        <h4>{mtg.topic}</h4>
                        <p>
                          from <strong>{getName(mtg.requester)}</strong>
                        </p>
                      </div>
                      <div className="mtg-time-badge">
                        <FiCalendar />
                        {new Date(mtg.scheduledTime).toLocaleString("en-US", {
                          month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                        })}
                        {mtg.duration && ` • ${mtg.duration} min`}
                      </div>
                    </div>
                    <div className="mtg-card-actions">
                      <button onClick={() => handleAccept(mtg._id)} className="mtg-btn accept-btn">
                        <FiCheck /> Accept
                      </button>
                      <button onClick={() => handleReject(mtg._id)} className="mtg-btn reject-btn">
                        <FiX /> Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* OUTGOING */}
          {activeTab === "outgoing" && (
            <div className="mtg-list">
              {outgoingRequests.length === 0 ? (
                <EmptyState
                  icon={<FiSend size={44} />}
                  title="No Sent Requests"
                  subtitle='Visit a profile and click "Request Call" to get started.'
                />
              ) : (
                outgoingRequests.map((mtg) => (
                  <div key={mtg._id} className="mtg-card outgoing">
                    <div className="mtg-card-head">
                      <img src={getAvatar(mtg.receiver)} alt="" className="mtg-avatar" />
                      <div className="mtg-info">
                        <h4>{mtg.topic}</h4>
                        <p>
                          to <strong>{getName(mtg.receiver)}</strong>
                        </p>
                      </div>
                      <div className="mtg-time-badge">
                        <FiCalendar />
                        {new Date(mtg.scheduledTime).toLocaleString("en-US", {
                          month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                        })}
                        {mtg.duration && ` • ${mtg.duration} min`}
                      </div>
                    </div>
                    <div className="mtg-card-actions">
                      <span className="wait-badge">
                        <span className="wait-dot" />
                        Waiting for response...
                      </span>
                      <button onClick={() => handleCancel(mtg._id)} className="mtg-btn cancel-btn">
                        <FiTrash2 /> Cancel
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* HISTORY */}
          {activeTab === "history" && (
            <div className="mtg-list">
              {history.length === 0 ? (
                <EmptyState
                  icon={<FiArchive size={44} />}
                  title="No History"
                  subtitle="Completed and declined meetings will appear here."
                />
              ) : (
                history.map((mtg) => {
                  const partner = mtg.requester?._id === user?._id ? mtg.receiver : mtg.requester;
                  return (
                    <div key={mtg._id} className={`mtg-card history ${mtg.status.toLowerCase()}`}>
                      <div className="mtg-card-head">
                        <img src={getAvatar(partner)} alt="" className="mtg-avatar" />
                        <div className="mtg-info">
                          <h4>{mtg.topic}</h4>
                          <p>with <strong>{getName(partner)}</strong></p>
                        </div>
                        <span className={`mtg-status-badge ${mtg.status.toLowerCase()}`}>
                          {mtg.status === "Rejected" ? "Declined" : mtg.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Empty state component ──────────────────────────── */
const EmptyState = ({ icon, title, subtitle }) => (
  <div className="mtg-empty">
    <div className="mtg-empty-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{subtitle}</p>
  </div>
);

export default Meetings;
