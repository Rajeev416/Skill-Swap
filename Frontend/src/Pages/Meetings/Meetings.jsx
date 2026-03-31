import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../../util/UserContext";
import { toast } from "react-toastify";
import axios from "axios";
import {
  FiVideo, FiCalendar, FiClock, FiCheck, FiX,
  FiUser, FiLogOut
} from "react-icons/fi";
import "./Meetings.css";

const Meetings = () => {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming"); // upcoming, incoming, outgoing

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/meeting");
      setMeetings(data.data);
    } catch (error) {
      if(error?.response?.data?.message === "Please Login") {
        localStorage.removeItem("userInfo");
        setUser(null);
        await axios.get("/auth/logout");
        navigate("/login");
      }
      toast.error("Failed to load meetings");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (meetingId) => {
    try {
      const { data } = await axios.post("/meeting/accept", { meetingId });
      toast.success(data.message);
      fetchMeetings();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Error accepting meeting");
    }
  };

  const handleReject = async (meetingId) => {
    try {
      const { data } = await axios.post("/meeting/reject", { meetingId });
      toast.success(data.message);
      fetchMeetings();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Error rejecting meeting");
    }
  };

  if (loading) {
    return (
      <div className="mtg-loader">
        <div className="pf-spinner" />
      </div>
    );
  }

  // Filter Data
  const now = new Date();
  
  const upcomingMeetings = meetings.filter(m => m.status === "Accepted");
  const incomingRequests = meetings.filter(
    m => m.status === "Pending" && m.receiver._id === user?._id
  );
  const outgoingRequests = meetings.filter(
    m => m.status === "Pending" && m.requester._id === user?._id
  );

  return (
    <div className="mtg-dashboard">
      <div className="mtg-header">
        <div className="mtg-wrap">
          <h1><FiVideo /> Video Calls & Meetings</h1>
          <p>Manage your upcoming sessions and call requests.</p>
        </div>
      </div>

      <div className="mtg-wrap">
        {/* Tabs */}
        <div className="mtg-tabs">
          <button 
            className={`mtg-tab ${activeTab === "upcoming" ? "active" : ""}`}
            onClick={() => setActiveTab("upcoming")}
          >
            Upcoming Calls 
            {upcomingMeetings.length > 0 && <span className="badge">{upcomingMeetings.length}</span>}
          </button>
          <button 
            className={`mtg-tab ${activeTab === "incoming" ? "active" : ""}`}
            onClick={() => setActiveTab("incoming")}
          >
            Incoming Requests
            {incomingRequests.length > 0 && <span className="badge amber">{incomingRequests.length}</span>}
          </button>
          <button 
            className={`mtg-tab ${activeTab === "outgoing" ? "active" : ""}`}
            onClick={() => setActiveTab("outgoing")}
          >
            Sent Requests
          </button>
        </div>

        {/* Content */}
        <div className="mtg-content">
          
          {/* UPCOMING CALLS */}
          {activeTab === "upcoming" && (
            <div className="mtg-list">
              {upcomingMeetings.length === 0 ? (
                <div className="mtg-empty">
                  <FiCalendar size={40} />
                  <h3>No Upcoming Calls</h3>
                  <p>You don't have any scheduled sessions.</p>
                </div>
              ) : (
                upcomingMeetings.map(mtg => {
                  const partner = mtg.requester._id === user?._id ? mtg.receiver : mtg.requester;
                  const meetingDate = new Date(mtg.scheduledTime);
                  const isReady = meetingDate.getTime() - now.getTime() < 15 * 60 * 1000; // Joinable 15 mins before

                  return (
                    <div key={mtg._id} className="mtg-card accepted">
                      <div className="mtg-card-head">
                        <img src={partner.profilePic} alt="avatar" className="mtg-avatar" />
                        <div className="mtg-info">
                          <h4>{mtg.topic}</h4>
                          <p>with <strong>{partner.firstname} {partner.lastname}</strong></p>
                        </div>
                        <div className="mtg-time-badge">
                          <FiClock /> {meetingDate.toLocaleString()}
                        </div>
                      </div>
                      <div className="mtg-card-actions">
                        {isReady ? (
                          <Link to={`/room/${mtg.roomId}`} className="mtg-btn join-btn">
                            <FiVideo /> Join Video Call
                          </Link>
                        ) : (
                          <button disabled className="mtg-btn join-btn disabled">
                            <FiVideo /> Join 15 mins early
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* INCOMING REQUESTS */}
          {activeTab === "incoming" && (
            <div className="mtg-list">
              {incomingRequests.length === 0 ? (
                <div className="mtg-empty">
                  <FiUser size={40} />
                  <h3>No Incoming Requests</h3>
                  <p>You have no pending video call requests.</p>
                </div>
              ) : (
                incomingRequests.map(mtg => {
                  const meetingDate = new Date(mtg.scheduledTime);
                  return (
                    <div key={mtg._id} className="mtg-card pending">
                      <div className="mtg-card-head">
                        <img src={mtg.requester.profilePic} alt="avatar" className="mtg-avatar" />
                        <div className="mtg-info">
                          <h4>{mtg.topic}</h4>
                          <p>Requested by <strong>{mtg.requester.firstname} {mtg.requester.lastname}</strong></p>
                        </div>
                        <div className="mtg-time-badge">
                          <FiCalendar /> {meetingDate.toLocaleString()}
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
                  );
                })
              )}
            </div>
          )}

          {/* OUTGOING REQUESTS */}
          {activeTab === "outgoing" && (
            <div className="mtg-list">
              {outgoingRequests.length === 0 ? (
                <div className="mtg-empty">
                  <FiLogOut size={40} />
                  <h3>No Sent Requests</h3>
                  <p>You haven't requested any video calls.</p>
                </div>
              ) : (
                outgoingRequests.map(mtg => {
                  const meetingDate = new Date(mtg.scheduledTime);
                  return (
                    <div key={mtg._id} className="mtg-card outgoing">
                      <div className="mtg-card-head">
                        <img src={mtg.receiver.profilePic} alt="avatar" className="mtg-avatar" />
                        <div className="mtg-info">
                          <h4>{mtg.topic}</h4>
                          <p>Sent to <strong>{mtg.receiver.firstname} {mtg.receiver.lastname}</strong></p>
                        </div>
                        <div className="mtg-time-badge">
                          <FiCalendar /> {meetingDate.toLocaleString()}
                        </div>
                      </div>
                      <div className="mtg-card-actions">
                        <span className="wait-badge">Waiting for response...</span>
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

export default Meetings;
