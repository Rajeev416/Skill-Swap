import React, { useEffect, useState } from "react";
import "./AboutUs.css";
import { Link } from "react-router-dom";

const AboutUs = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="au-page">
      {/* ── BACKGROUND ORBS ── */}
      <div 
        className="au-orb au-orb-1"
        style={{ transform: `translateY(${scrollY * 0.15}px)` }}
      />
      <div 
        className="au-orb au-orb-2"
        style={{ transform: `translateY(${scrollY * -0.1}px)` }}
      />

      {/* ── HERO SECTION ── */}
      <section className="au-hero">
        <div className="au-hero-content">
          <div className="au-badge">Our Story</div>
          <h1 className="au-title">
            Reimagining <span className="au-gradient-text">How We Learn</span>
          </h1>
          <p className="au-subtitle">
            We are building a world where education isn't locked behind paywalls. 
            SkillSwap is a completely free, peer-to-peer learning ecosystem driven 
            by passionate individuals worldwide.
          </p>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <section className="au-content-section">
        <div className="au-container">
          
          {/* Mission Block */}
          <div className="au-block au-block-reverse">
            <div className="au-block-text">
              <h2>The Problem We're Solving</h2>
              <p>
                As students and professionals, we constantly search for ways to upskill. 
                But more often than not, meaningful learning requires expensive courses, 
                premium bootcamps, and walled-garden platforms. We knew there had to be a better way.
              </p>
              <p>
                <strong>SkillSwap was born from a simple idea:</strong> Everyone has something 
                valuable to teach, and everyone has a desire to learn. What if we could just 
                trade our skills directly?
              </p>
            </div>
            <div className="au-block-visual">
              <div className="au-glass-card">
                <div className="au-icon-large">💸</div>
                <h3>Breaking Financial Barriers</h3>
                <p>Learn invaluable tech and life skills simply by paying it forward with your own knowledge.</p>
              </div>
            </div>
          </div>

          {/* Vision Block */}
          <div className="au-block">
            <div className="au-block-visual">
              <img src="/assets/images/about us.png" alt="Collaborative Learning" className="au-featured-img" />
            </div>
            <div className="au-block-text">
              <h2>A Culture of Collaboration</h2>
              <p>
                At SkillSwap, we believe in the transformative power of experiential learning. 
                When two people connect over a shared goal, they don't just learn a framework or a language—they 
                gain real-world mentorship, networking, and a lasting connection.
              </p>
              <p>
                Whether you're a senior developer looking to mentor while learning guitar, or a beginner 
                designer willing to teach photography to learn React, our platform adapts to your journey.
              </p>
              <ul className="au-check-list">
                <li><span>✓</span> Community-Driven Knowledge Base</li>
                <li><span>✓</span> Real-Time Video & Chat Integration</li>
                <li><span>✓</span> Global Network of Enthusiasts</li>
              </ul>
            </div>
          </div>
          
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="au-cta">
        <div className="au-cta-inner">
          <h2>Join the SkillSwap Movement</h2>
          <p>You already have everything you need to start. Share a skill. Learn a skill.</p>
          <div className="au-cta-actions">
            <Link to="/signup" className="au-btn au-btn-primary">Become a Member</Link>
            <Link to="/discover" className="au-btn au-btn-outline">Explore Skills</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
