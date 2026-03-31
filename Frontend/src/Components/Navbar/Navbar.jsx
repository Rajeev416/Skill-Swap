import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../../util/UserContext";
import axios from "axios";
import { FiUser, FiLogOut, FiMenu, FiX, FiChevronDown, FiMessageCircle, FiCompass, FiHome, FiInfo, FiHeart, FiVideo } from "react-icons/fi";
import "./Navbar.css";

const Header = () => {
  const [navUser, setNavUser] = useState(null);
  const { user, setUser } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Sync user from localStorage
  useEffect(() => {
    setNavUser(JSON.parse(localStorage.getItem("userInfo")));
  }, [user]);

  // Scroll listener for background change
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [location]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    localStorage.removeItem("userInfo");
    setUser(null);
    setDropdownOpen(false);
    try {
      await axios.get("/auth/logout");
      window.location.href = "/login";
    } catch (error) {
      console.error(error);
    }
  };

  const isActive = (path) => location.pathname === path;

  // ─── Navigation items ─────────────────────
  const guestLinks = [
    { to: "/", label: "Home", icon: <FiHome size={15} /> },
    { to: "/about_us", label: "About Us", icon: <FiInfo size={15} /> },
    { to: "/#why-skill-swap", label: "Why SkillSwap", icon: <FiHeart size={15} /> },
  ];

  const userLinks = [
    { to: "/", label: "Home", icon: <FiHome size={15} /> },
    { to: "/discover", label: "Discover", icon: <FiCompass size={15} /> },
    { to: "/chats", label: "Chats", icon: <FiMessageCircle size={15} /> },
    { to: "/meetings", label: "Meetings", icon: <FiVideo size={15} /> },
  ];


  const links = navUser ? userLinks : guestLinks;

  return (
    <>
      {/* ── Fixed Navbar ── */}
      <nav className={`ss-navbar ${scrolled ? "scrolled" : ""}`}>
        {/* Brand */}
        <Link to="/" className="ss-navbar-brand">
          <div className="ss-brand-icon">SS</div>
          <div className="ss-brand-text">
            Skill<span>Swap</span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="ss-nav-links">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`ss-nav-link ${isActive(l.to) ? "active" : ""}`}
            >
              {l.icon}
              {l.label}
            </Link>
          ))}

          {navUser ? (
            <>
              <div className="ss-nav-divider" />
              {/* Profile dropdown */}
              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button
                  className="ss-profile-trigger"
                  onClick={() => setDropdownOpen((v) => !v)}
                  aria-expanded={dropdownOpen}
                >
                  <img
                    src={user?.picture || navUser?.picture}
                    alt=""
                    className="ss-profile-avatar"
                  />
                  <span className="ss-profile-name">
                    {user?.username || navUser?.username || "Profile"}
                  </span>
                  <FiChevronDown className="ss-profile-chevron" />
                </button>

                <ul className={`ss-dropdown-menu ${dropdownOpen ? "open" : ""}`}>
                  <li>
                    <button
                      className="ss-dropdown-item"
                      onClick={() => {
                        navigate(`/profile/${user?.username || navUser?.username}`);
                        setDropdownOpen(false);
                      }}
                    >
                      <FiUser size={15} />
                      My Profile
                    </button>
                  </li>
                  <li><div className="ss-dropdown-divider" /></li>
                  <li>
                    <button className="ss-dropdown-item danger" onClick={handleLogout}>
                      <FiLogOut size={15} />
                      Log Out
                    </button>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginLeft: "12px" }}>
              <Link to="/login" className="ss-nav-link" style={{ fontSize: "0.95rem", fontWeight: 500, padding: 0 }}>
                Login
              </Link>
              <Link to="/signup" className="ss-nav-cta-pink">
                SIGN UP FOR FREE
              </Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className={`ss-mobile-toggle ${mobileOpen ? "open" : ""}`}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* ── Mobile Overlay ── */}
      <div
        className={`ss-mobile-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── Mobile Slide Menu ── */}
      <div className={`ss-mobile-menu ${mobileOpen ? "open" : ""}`}>
        <div className="ss-mobile-brand">
          <div className="ss-brand-icon" style={{ width: 30, height: 30, fontSize: "0.8rem" }}>SS</div>
          <div className="ss-brand-text" style={{ fontSize: "1rem" }}>
            Skill<span>Swap</span>
          </div>
        </div>
        <button className="ss-mobile-close" onClick={() => setMobileOpen(false)}>
          <FiX />
        </button>

        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`ss-nav-link ${isActive(l.to) ? "active" : ""}`}
            onClick={() => setMobileOpen(false)}
          >
            {l.icon}
            {l.label}
          </Link>
        ))}

        <div className="ss-mobile-divider" />

        {navUser ? (
          <>
            <Link
              to={`/profile/${user?.username || navUser?.username}`}
              className="ss-nav-link"
              onClick={() => setMobileOpen(false)}
            >
              <FiUser size={15} />
              My Profile
            </Link>
            <button
              className="ss-nav-link"
              onClick={handleLogout}
              style={{ border: "none", background: "none", textAlign: "left", color: "#f56664" }}
            >
              <FiLogOut size={15} />
              Log Out
            </button>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
            <Link to="/login" className="ss-nav-link" onClick={() => setMobileOpen(false)} style={{ textAlign: "center", justifyContent: "center" }}>
              Login
            </Link>
            <Link to="/signup" className="ss-nav-cta-pink" onClick={() => setMobileOpen(false)} style={{ textAlign: "center", width: "100%", justifyContent: "center" }}>
              SIGN UP FOR FREE
            </Link>
          </div>
        )}
      </div>

      {/* Spacer to offset fixed navbar */}
      <div className="ss-navbar-spacer" />
    </>
  );
};

export default Header;
