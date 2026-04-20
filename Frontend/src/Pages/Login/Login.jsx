import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "./Login.css";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_SERVER_URL}/auth/google`;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Must include withCredentials if they are not enabled by default in axios instance
      const { data } = await axios.post(`${import.meta.env.VITE_SERVER_URL}/auth/login`, formData, {
        withCredentials: true,
      });
      toast.success(data.message || "Logged in successfully!");
      if (data.data && data.data.redirect) {
        // hard redirect to pick up cookies cleanly or use react router navigate
        window.location.href = data.data.redirect;
      } else {
        window.location.href = "/discover";
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Log in to your SkillSwap account.</p>

        {/* ════════ Contrastingly Creative Email Form ════════ */}
        <form className="auth-email-form" onSubmit={handleLoginSubmit} style={{ animation: "none", marginBottom: "24px" }}>
          <div className="auth-input-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="auth-input-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="auth-btn-primary" style={{ marginBottom: "0" }} disabled={loading}>
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>
        </form>

        <div className="auth-divider">
          <span>Or</span>
        </div>

        <button className="auth-btn-outline" onClick={handleGoogleLogin}>
          <FcGoogle className="auth-btn-icon" size={20} />
          LOGIN WITH GOOGLE
        </button>

        <p className="auth-terms">
          By logging in, you indicate that you have read, understood and agree to
          SkillSwap's <Link to="#">Terms of Service</Link> and <Link to="#">Privacy Policy</Link>
        </p>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Sign up for free</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
