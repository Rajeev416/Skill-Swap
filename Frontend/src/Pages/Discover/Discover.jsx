import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../util/UserContext";
import axios from "axios";
import { toast } from "react-toastify";
import ProfileCard from "./ProfileCard";
import "./Discover.css";

const SkeletonCard = () => (
  <div className="disc-skeleton-card">
    <div className="disc-skeleton-circle" />
    <div className="disc-skeleton-line w-60" />
    <div className="disc-skeleton-line w-40" />
    <div className="disc-skeleton-line w-80" />
    <div className="disc-skeleton-line w-60" />
  </div>
);

const EmptyState = ({ icon, title, subtitle }) => (
  <div className="disc-empty-wrapper">
    <div className="disc-empty">
      <div className="disc-empty-icon">{icon}</div>
      <h4>{title}</h4>
      <p>{subtitle}</p>
    </div>
  </div>
);

const sections = [
  { id: "for-you", label: "For You", icon: "✨", badge: "for-you" },
  { id: "web-development", label: "Web Development", icon: "🌐", badge: "web-dev" },
  { id: "machine-learning", label: "Machine Learning", icon: "🤖", badge: "ml" },
  { id: "others", label: "Others", icon: "🎯", badge: "others" },
];

const Discover = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("for-you");
  const [searchQuery, setSearchQuery] = useState("");

  const [discoverUsers, setDiscoverUsers] = useState([]);
  const [webDevUsers, setWebDevUsers] = useState([]);
  const [mlUsers, setMlUsers] = useState([]);
  const [otherUsers, setOtherUsers] = useState([]);

  const handleAuthError = useCallback(async (error) => {
    console.error(error);
    if (error?.response?.data?.message) {
      toast.error(error.response.data.message);
    }
    localStorage.removeItem("userInfo");
    setUser(null);
    await axios.get("/auth/logout");
    navigate("/login");
  }, [setUser, navigate]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        // Fetch user details and discover users in parallel
        const [userRes, discoverRes] = await Promise.all([
          axios.get("/user/registered/getDetails"),
          axios.get("/user/discover"),
        ]);

        setUser(userRes.data.data);
        localStorage.setItem("userInfo", JSON.stringify(userRes.data.data));

        setDiscoverUsers(discoverRes.data.data.forYou || []);
        setWebDevUsers(discoverRes.data.data.webDev || []);
        setMlUsers(discoverRes.data.data.ml || []);
        setOtherUsers(discoverRes.data.data.others || []);
      } catch (error) {
        handleAuthError(error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleNavClick = (sectionId) => {
    setActiveSection(sectionId);
  };

  // Filter users by search query
  const filterUsers = (users) => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u?.name?.toLowerCase().includes(q) ||
        u?.username?.toLowerCase().includes(q) ||
        u?.skillsProficientAt?.some((s) => s.toLowerCase().includes(q))
    );
  };

  const renderSection = (id, title, icon, badge, users) => {
    const filtered = filterUsers(users);
    return (
      <div className="disc-section" id={id} key={id}>
        <div className="disc-section-header">
          <span className={`disc-section-badge ${badge}`}>
            {icon} {title}
          </span>
          <div className="disc-section-line" />
        </div>
        <div className="disc-cards-grid">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filtered.length > 0 ? (
            filtered.map((u, i) => (
              <ProfileCard
                key={u._id || u.username || i}
                profileImageUrl={u?.picture}
                name={u?.name}
                rating={u?.rating || 5}
                bio={u?.bio}
                skills={u?.skillsProficientAt}
                username={u?.username}
                index={i}
              />
            ))
          ) : (
            <EmptyState
              icon="🔍"
              title={searchQuery ? "No matches found" : "No users yet"}
              subtitle={searchQuery ? "Try a different search term" : "Check back later for new users"}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="discover-page">
      {/* Sidebar */}
      <aside className="disc-sidebar">
        <div className="disc-sidebar-title">Categories</div>
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`disc-nav-item ${activeSection === s.id ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              handleNavClick(s.id);
            }}
          >
            <span className="disc-nav-icon">{s.icon}</span>
            {s.label}
          </a>
        ))}
      </aside>

      {/* Main Content */}
      <main className="disc-main">
        {/* Hero Banner */}
        <div className="disc-hero">
          <h1>Discover Talented People 🚀</h1>
          <p>Find the perfect skill swap partner and start learning something new today</p>
          <div className="disc-search">
            <span className="disc-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name, username, or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Sections */}
        {activeSection === "for-you" && renderSection("for-you", "For You", "✨", "for-you", discoverUsers)}
        {activeSection === "web-development" && renderSection("web-development", "Web Development", "🌐", "web-dev", webDevUsers)}
        {activeSection === "machine-learning" && renderSection("machine-learning", "Machine Learning", "🤖", "ml", mlUsers)}
        {activeSection === "others" && renderSection("others", "Others", "🎯", "others", otherUsers)}
      </main>
    </div>
  );
};

export default Discover;
