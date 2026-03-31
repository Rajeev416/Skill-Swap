import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

// ─── Intersection Observer hook ─────────────────────────────
function useScrollReveal(options = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, ...options }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
}

// ─── Particle canvas ───────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let particles = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener("resize", resize);

    const PARTICLE_COUNT = 60;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.3 + 0.1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = canvas.offsetWidth;
        if (p.x > canvas.offsetWidth) p.x = 0;
        if (p.y < 0) p.y = canvas.offsetHeight;
        if (p.y > canvas.offsetHeight) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 180, 161, ${p.opacity})`;
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(59, 180, 161, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="lp-particles-canvas" />;
}

// ─── Animated counter ──────────────────────────────────────
function AnimatedCounter({ target, suffix = "", isVisible }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const duration = 2000;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isVisible, target]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── Main component ────────────────────────────────────────
const LandingPage = () => {
  const [scrollY, setScrollY] = useState(0);
  const [heroRef, heroVisible] = useScrollReveal();
  const [statsRef, statsVisible] = useScrollReveal();
  const [featHeaderRef, featHeaderVisible] = useScrollReveal();
  const [ctaRef, ctaVisible] = useScrollReveal();

  // Feature card refs
  const featureRefs = [
    useScrollReveal(),
    useScrollReveal(),
    useScrollReveal(),
    useScrollReveal(),
    useScrollReveal(),
    useScrollReveal(),
  ];

  // Step refs
  const stepRefs = [useScrollReveal(), useScrollReveal(), useScrollReveal()];

  // Parallax
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const features = [
    {
      icon: "🎓",
      title: "Learn From Experts",
      desc: "Gain insights directly from experienced mentors who excel in their fields — programming, design, marketing, and beyond.",
    },
    {
      icon: "🤝",
      title: "Share Your Expertise",
      desc: "Become a mentor yourself. Share your passion, foster community, and contribute to the growth of aspiring learners worldwide.",
    },
    {
      icon: "🌐",
      title: "Collaborative Environment",
      desc: "Connect with like-minded individuals, participate in group projects, and engage in discussions that fuel innovation.",
    },
    {
      icon: "🎯",
      title: "Diverse Opportunities",
      desc: "Explore a wide range of topics — from traditional crafts to cutting-edge technologies. Something for everyone, completely free.",
    },
    {
      icon: "📈",
      title: "Continuous Growth",
      desc: "Learning is a lifelong journey. Continuously expand your knowledge, challenge yourself, and embrace new opportunities.",
    },
    {
      icon: "💸",
      title: "100% Free Always",
      desc: "No hidden fees, no paywalls, and no subscriptions. Knowledge should be accessible to everyone, everywhere without barriers.",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Create Your Profile",
      desc: "Sign up, list the skills you can teach and the ones you want to learn.",
    },
    {
      num: "02",
      title: "Discover & Connect",
      desc: "Browse mentors, filter by skill, and send swap requests instantly.",
    },
    {
      num: "03",
      title: "Swap & Grow",
      desc: "Start video calls, chat in real-time, and track your learning journey.",
    },
  ];

  return (
    <div id="landing-page">
      {/* ═══════ HERO (DARK) ═══════ */}
      <section className="lp-hero" ref={heroRef}>
        <div className="lp-orb lp-orb--1 lp-parallax-layer" style={{ transform: `translate(${scrollY * 0.03}px, ${scrollY * 0.06}px)` }}></div>
        <div className="lp-orb lp-orb--2 lp-parallax-layer" style={{ transform: `translate(${-scrollY * 0.04}px, ${-scrollY * 0.05}px)` }}></div>
        <div className="lp-orb lp-orb--3 lp-parallax-layer" style={{ transform: `translate(${scrollY * 0.02}px, ${-scrollY * 0.03}px)` }}></div>

        <div className="lp-hero-grid"></div>
        <ParticleCanvas />

        <div className="lp-hero-content">
          <div className={`lp-hero-badge ${heroVisible ? "visible" : ""}`}>
            <span className="pulse-dot"></span>
            Free &amp; Open Platform
          </div>

          <h1 className={`lp-hero-title ${heroVisible ? "visible" : ""}`}>
            <span className="text-white">Swap Skills.</span>
            <br />
            <span className="text-gradient">Grow Together.</span>
          </h1>

          <p className={`lp-hero-subtitle ${heroVisible ? "visible" : ""}`}>
            The peer-to-peer learning platform where you teach what you know and
            learn what you don't — no fees, just collaboration.
          </p>

          <div className={`lp-hero-cta-group ${heroVisible ? "visible" : ""}`}>
            <Link to="/signup" className="lp-btn-primary">
              Get Started Free
            </Link>
            <Link to="/discover" className="lp-btn-outline">
              Explore Skills →
            </Link>
          </div>
        </div>

        <div className="lp-scroll-indicator">
          <span>Scroll</span>
          <div className="scroll-line"></div>
        </div>
      </section>

      {/* ═══════ DIAGONAL TRANSITION ═══════ */}
      <div className="lp-diagonal-transition"></div>

      {/* ═══════ STATS BAR (LIGHT / CONTRAST) ═══════ */}
      <section className="lp-contrast-section" id="why-skill-swap">
        <div className="lp-stats-bar" ref={statsRef}>
          {[
            { num: 1200, suffix: "+", label: "Active Learners" },
            { num: 350, suffix: "+", label: "Skills Available" },
            { num: 4800, suffix: "+", label: "Swaps Completed" },
            { num: 98, suffix: "%", label: "Satisfaction Rate" },
          ].map((s, i) => (
            <div
              key={i}
              className={`lp-stat-item ${statsVisible ? "visible" : ""}`}
              style={{ transitionDelay: `${i * 0.12}s` }}
            >
              <div className="lp-stat-number">
                <AnimatedCounter target={s.num} suffix={s.suffix} isVisible={statsVisible} />
              </div>
              <div className="lp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ═══════ FEATURES (LIGHT) ═══════ */}
        <div className="lp-features-header" ref={featHeaderRef}>
          <div className={`lp-section-label lp-reveal ${featHeaderVisible ? "visible" : ""}`}>
            Why Skill Swap
          </div>
          <h2 className={`lp-section-title lp-reveal ${featHeaderVisible ? "visible" : ""}`} style={{ transitionDelay: "0.1s" }}>
            Everything you need to <span className="highlight">learn &amp; teach</span>
          </h2>
        </div>

        <div className="lp-features-grid">
          {features.map((f, i) => {
            const [ref, vis] = featureRefs[i];
            return (
              <div
                key={i}
                ref={ref}
                className={`lp-feature-card ${vis ? "visible" : ""}`}
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="lp-feature-icon">{f.icon}</div>
                <div className="lp-feature-title">{f.title}</div>
                <div className="lp-feature-desc">{f.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════ DIAGONAL TRANSITION 2 ═══════ */}
      <div className="lp-diagonal-transition-2"></div>

      {/* ═══════ HOW IT WORKS (DARK CONTRAST) ═══════ */}
      <section className="lp-dark-section">
        <div className="lp-dark-section-inner">
          <div className="lp-features-header" style={{ padding: "0 0 0" }}>
            <div className="lp-section-label">How It Works</div>
            <h2 className="lp-section-title">
              Three simple steps to <span className="highlight">start swapping</span>
            </h2>
          </div>

          <div className="lp-steps">
            {steps.map((s, i) => {
              const [ref, vis] = stepRefs[i];
              return (
                <div
                  key={i}
                  ref={ref}
                  className={`lp-step ${vis ? "visible" : ""}`}
                  style={{ transitionDelay: `${i * 0.15}s` }}
                >
                  <div className="lp-step-number">{s.num}</div>
                  <div className="lp-step-title">{s.title}</div>
                  <div className="lp-step-desc">{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════ CTA (GRADIENT CONTRAST) ═══════ */}
      <section className="lp-cta-section" ref={ctaRef}>
        <div className="lp-cta-shape lp-cta-shape--1"></div>
        <div className="lp-cta-shape lp-cta-shape--2"></div>
        <div className="lp-cta-shape lp-cta-shape--3"></div>

        <div className="lp-cta-inner">
          <h2 className={`lp-cta-title ${ctaVisible ? "visible" : ""}`}>
            Ready to Start Your Learning Journey?
          </h2>
          <p className={`lp-cta-desc ${ctaVisible ? "visible" : ""}`}>
            Join thousands of curious minds already swapping skills. It's free,
            it's fun, and you'll grow faster than you ever imagined.
          </p>
          <Link to="/signup" className={`lp-btn-white ${ctaVisible ? "visible" : ""}`}>
            Join SkillSwap Today
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
