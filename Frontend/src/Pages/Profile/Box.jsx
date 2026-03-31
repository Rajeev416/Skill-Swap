import React from "react";
import { FiCheckCircle, FiBookOpen, FiExternalLink } from "react-icons/fi";
import "./Box.css";

const Box = ({ head, date, spec, desc, skills, score, type, link }) => {
  return (
    <div className={`prof-box prof-box-${type}`}>
      <div className="prof-box-header">
        <div className="prof-box-title-wrap">
          <div className="prof-box-icon">
            {type === "edu" ? <FiBookOpen /> : <FiCheckCircle />}
          </div>
          <div>
            <h3 className="prof-box-title">{head}</h3>
            {spec && <h4 className="prof-box-spec">{spec}</h4>}
          </div>
        </div>
        <div className="prof-box-date">{date}</div>
      </div>

      <p className="prof-box-desc">{desc}</p>

      {/* Footer Info */}
      <div className="prof-box-footer">
        {score && (
          <div className="prof-box-score">
            <span>Grade / Score:</span> <strong>{score}</strong>
          </div>
        )}

        {skills && skills.length > 0 && (
          <div className="prof-box-used-skills">
            {skills.map((skill, index) => (
              <span key={index} className="prof-box-skill-tag">{skill}</span>
            ))}
          </div>
        )}

        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="prof-box-link">
            View Project <FiExternalLink />
          </a>
        )}
      </div>
    </div>
  );
};

export default Box;
