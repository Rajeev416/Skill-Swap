import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "../Login/Login.css"; // Reuse the same sleek auth CSS!

const SignUp = () => {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignup = () => {
    window.location.href = `${import.meta.env.VITE_SERVER_URL}/auth/google`;
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_SERVER_URL}/auth/signup`, formData);
      toast.success(data.message || "Verification email sent! Please check your inbox.");
      setFormData({ name: "", email: "", password: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to sign up.");
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
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join the worldwide learning community.</p>

        {/* ════════ Contrastingly Creative Email Form ════════ */}
        <form className="auth-email-form" onSubmit={handleSignupSubmit} style={{ animation: "none", marginBottom: "24px" }}>
          <div className="auth-input-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              required
            />
          </div>

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
              placeholder="Create a strong password"
              required
            />
          </div>

          <button type="submit" className="auth-btn-submit" style={{ marginBottom: "0" }} disabled={loading}>
            {loading ? "SENDING..." : "CREATE ACCOUNT"}
          </button>
        </form>

        <div className="auth-divider">
          <span>Or</span>
        </div>

        <button className="auth-btn-outline" onClick={handleGoogleSignup}>
          <FcGoogle className="auth-btn-icon" size={20} />
          SIGN UP WITH GOOGLE
        </button>

        <p className="auth-terms">
          By signing up, you indicate that you have read, understood and agree to
          SkillSwap's <Link to="#">Terms of Service</Link> and <Link to="#">Privacy Policy</Link>
        </p>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
