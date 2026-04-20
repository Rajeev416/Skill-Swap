import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useUser } from "../../util/UserContext";
import { toast } from "react-toastify";
import axios from "axios";
import {
  FiGithub, FiLinkedin, FiExternalLink, FiEdit3,
  FiFlag, FiStar, FiUserPlus, FiBookOpen,
  FiCode, FiArrowUpRight, FiAward, FiZap,
  FiCalendar, FiVideo, FiX
} from "react-icons/fi";

import "./Profile.css";

const Profile = () => {
  const { user, setUser } = useUser();
  const [profileUser, setProfileUser] = useState(null);
  const { username } = useParams();
  const [loading, setLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingTopic, setMeetingTopic] = useState("");
  const [meetingDuration, setMeetingDuration] = useState(30);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`/user/registered/getDetails/${username}`);
        setProfileUser(data.data);
      } catch (error) {
        if (error?.response?.data?.message) {
          toast.error(error.response.data.message);
          if (error.response.data.message === "Please Login") {
            localStorage.removeItem("userInfo");
            setUser(null);
            await axios.get("/auth/logout");
            navigate("/login");
          }
        }
      } finally {
        setLoading(false);
      }
    };
    getUser();
  }, [username, navigate, setUser]);

  const fmtDate = (d) => {
    if (!d) return "Present";
    return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const connectHandler = async () => {
    try {
      setConnectLoading(true);
      const { data } = await axios.post(`/request/create`, { receiverID: profileUser._id });
      toast.success(data.message);
      setProfileUser((p) => ({ ...p, status: "Pending" }));
    } catch (error) {
      if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
        if (error.response.data.message === "Please Login") {
          localStorage.removeItem("userInfo");
          setUser(null);
          await axios.get("/auth/logout");
          navigate("/login");
        }
      }
    } finally {
      setConnectLoading(false);
    }
  };

  const requestMeetingHandler = async () => {
    if (!meetingTime) return toast.error("Please select a time");
    try {
      setMeetingLoading(true);
      const { data } = await axios.post(`/meeting/request`, { 
        receiverId: profileUser._id, 
        scheduledTime: new Date(meetingTime).toISOString(), 
        topic: meetingTopic,
        duration: meetingDuration
      });
      toast.success(data.message);
      setShowMeetingModal(false);
      setMeetingTime("");
      setMeetingTopic("");
      setMeetingDuration(30);
    } catch (error) {
      if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
      }
    } finally {
      setMeetingLoading(false);
    }
  };

  /* ── Loading State ── */
  if (loading) {
    return (
      <div className="pf-loader">
        <div className="pf-spinner" />
      </div>
    );
  }

  if (!profileUser) return null;

  const isOwner = user?.username === username;
  const rating = profileUser.rating ? profileUser.rating.toFixed(1) : "5.0";
  const filledStars = Math.round(profileUser.rating || 5);
  const joinDate = profileUser.createdAt
    ? new Date(profileUser.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="pf">
      {/* ═══════ COVER ═══════ */}
      <div className="pf-cover">
        <div className="pf-cover-mesh" />
      </div>

      {/* ═══════ HEADER CARD ═══════ */}
      <div className="pf-wrap">
        <header className="pf-header">
          <div className="pf-avatar-col">
            <div className="pf-avatar">
              <img src={profileUser.picture} alt={profileUser.name} />
            </div>
          </div>

          <div className="pf-identity">
            <h1>{profileUser.name}</h1>
            <p className="pf-handle">@{profileUser.username}</p>

            {/* Meta row — rating & join date */}
            <div className="pf-meta">
              <div className="pf-stars">
                {[...Array(5)].map((_, i) => (
                  <FiStar key={i} className={i < filledStars ? "lit" : ""} fill={i < filledStars ? "currentColor" : "none"} />
                ))}
                <span>{rating}</span>
              </div>
              {joinDate && (
                <div className="pf-joined"><FiCalendar /> Joined {joinDate}</div>
              )}
            </div>

            {profileUser.bio && <p className="pf-bio">{profileUser.bio}</p>}

            {/* Social row */}
            <div className="pf-links">
              {profileUser.githubLink && (
                <a href={profileUser.githubLink} target="_blank" rel="noreferrer"><FiGithub /> GitHub</a>
              )}
              {profileUser.linkedinLink && (
                <a href={profileUser.linkedinLink} target="_blank" rel="noreferrer"><FiLinkedin /> LinkedIn</a>
              )}
              {profileUser.portfolioLink && (
                <a href={profileUser.portfolioLink} target="_blank" rel="noreferrer"><FiExternalLink /> Portfolio</a>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pf-actions">
            {isOwner ? (
              <Link to="/edit_profile" className="pf-btn primary"><FiEdit3 /> Edit Profile</Link>
            ) : (
              <>
                <button
                  className={`pf-btn accent ${profileUser.status !== "Connect" ? "muted" : ""}`}
                  onClick={profileUser.status === "Connect" ? connectHandler : undefined}
                  disabled={connectLoading}
                >
                  {connectLoading ? (
                    <span className="pf-btn-spin" />
                  ) : (
                    <><FiUserPlus /> {profileUser.status}</>
                  )}
                </button>
                <button 
                  className="pf-btn accent ghost" 
                  onClick={() => setShowMeetingModal(true)}
                >
                  <FiVideo /> Request Call
                </button>
                <div className="pf-btn-pair">
                  <Link to={`/rating/${profileUser.username}`} className="pf-btn ghost"><FiStar /> Rate</Link>
                  <Link to={`/report/${profileUser.username}`} className="pf-btn ghost red"><FiFlag /> Report</Link>
                </div>
              </>
            )}
          </div>
        </header>

        {/* ═══════ SKILLS ═══════ */}
        {(profileUser.skillsProficientAt?.length > 0 || profileUser.skillsToLearn?.length > 0) && (
          <section className="pf-skills">
            {profileUser.skillsProficientAt?.length > 0 && (
              <div className="pf-skill-col">
                <h3><FiZap /> Proficient At</h3>
                <div className="pf-tags">
                  {profileUser.skillsProficientAt.map((s, i) => (
                    <span key={i} className="pf-tag violet">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {profileUser.skillsToLearn?.length > 0 && (
              <div className="pf-skill-col">
                <h3><FiBookOpen /> Wants to Learn</h3>
                <div className="pf-tags">
                  {profileUser.skillsToLearn.map((s, i) => (
                    <span key={i} className="pf-tag blue">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ═══════ EDUCATION TIMELINE ═══════ */}
        {profileUser.education?.length > 0 && (
          <section className="pf-section">
            <h2 className="pf-sec-title"><FiAward /> Education</h2>
            <div className="pf-timeline">
              {profileUser.education.map((edu, i) => (
                <article className="pf-tl-entry" key={i}>
                  <div className="pf-tl-marker" />
                  <div className="pf-card">
                    <div className="pf-card-head">
                      <div>
                        <h3>{edu.institution}</h3>
                        {edu.degree && <p className="pf-card-sub">{edu.degree}</p>}
                      </div>
                      <span className="pf-date-pill">{fmtDate(edu.startDate)} – {fmtDate(edu.endDate)}</span>
                    </div>
                    {edu.description && <p className="pf-card-body">{edu.description}</p>}
                    {edu.score && <div className="pf-card-score">Score <strong>{edu.score}</strong></div>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ═══════ PROJECTS ═══════ */}
        {profileUser.projects?.length > 0 && (
          <section className="pf-section">
            <h2 className="pf-sec-title"><FiCode /> Projects</h2>
            <div className="pf-grid">
              {profileUser.projects.map((proj, i) => (
                <div className="pf-proj" key={i}>
                  <div className="pf-proj-head">
                    <h3>{proj.title}</h3>
                    {proj.projectLink && (
                      <a href={proj.projectLink} target="_blank" rel="noreferrer" className="pf-proj-ext">
                        <FiArrowUpRight />
                      </a>
                    )}
                  </div>
                  <span className="pf-proj-period">{fmtDate(proj.startDate)} – {fmtDate(proj.endDate)}</span>
                  {proj.description && <p className="pf-proj-body">{proj.description}</p>}
                  {proj.techStack?.length > 0 && (
                    <div className="pf-proj-stack">
                      {proj.techStack.map((t, j) => <span key={j}>{t}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty fallback */}
        {!profileUser.education?.length && !profileUser.projects?.length && (
          <div className="pf-empty">
            <FiBookOpen size={36} />
            <h3>No details yet</h3>
            <p>This user hasn't added education or projects.</p>
          </div>
        )}
      </div>

      {/* ═══════ MEETING MODAL ═══════ */}
      {showMeetingModal && (
        <div className="pf-modal-overlay">
          <div className="pf-modal">
            <button className="pf-modal-close" onClick={() => setShowMeetingModal(false)}>
              <FiX />
            </button>
            <h2>Request a Video Call</h2>
            <p>Schedule a time to connect with {profileUser.name}</p>
            
            <div className="pf-modal-form">
              <label>Topic / Purpose</label>
              <input 
                type="text" 
                placeholder="e.g. Discussing React Native"
                value={meetingTopic}
                onChange={(e) => setMeetingTopic(e.target.value)}
              />

              <label>Duration (minutes)</label>
              <input 
                type="number" 
                placeholder="Minutes (15-120)"
                value={meetingDuration}
                onChange={(e) => setMeetingDuration(Math.max(15, Math.min(120, Number(e.target.value) || 15)))}
                min={15}
                max={120}
              />

              <label>Select Date & Time</label>
              <input 
                type="datetime-local" 
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />

              <button 
                className="pf-btn primary" 
                disabled={meetingLoading}
                onClick={requestMeetingHandler}
                style={{ marginTop: "1rem" }}
              >
                {meetingLoading ? "Requesting..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default Profile;
