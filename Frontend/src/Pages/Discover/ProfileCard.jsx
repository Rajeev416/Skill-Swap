import React from "react";
import { Link } from "react-router-dom";
import "./Card.css";

const ProfileCard = ({ profileImageUrl, bio, name, skills, rating, username, index = 0 }) => {
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <span key={i} className="star" style={{ opacity: i < fullStars ? 1 : 0.3 }}>
          ★
        </span>
      );
    }
    return stars;
  };

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=2cb5a0&color=fff&size=160`;

  return (
    <div className="disc-card" style={{ animationDelay: `${index * 0.08}s` }}>
      <img
        className="disc-card-avatar"
        src={profileImageUrl || fallbackAvatar}
        alt={name}
        onError={(e) => { e.target.src = fallbackAvatar; }}
      />
      <h3 className="disc-card-name">{name}</h3>
      <div className="disc-card-rating">
        {renderStars(rating || 5)}
        <span>{rating || 5}.0</span>
      </div>
      <p className="disc-card-bio">{bio || "No bio available"}</p>
      <div className="disc-card-skills">
        {skills?.slice(0, 4).map((skill, i) => (
          <span key={i} className="disc-skill-tag">{skill}</span>
        ))}
        {skills?.length > 4 && (
          <span className="disc-skill-tag" style={{ background: '#f1f5f9', color: '#64748b' }}>
            +{skills.length - 4}
          </span>
        )}
      </div>
      <Link to={`/profile/${username}`} className="disc-card-btn">
        View Profile
      </Link>
    </div>
  );
};

export default ProfileCard;
