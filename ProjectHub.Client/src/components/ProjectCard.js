// src/components/ProjectCard.js
import React from 'react';
import { getCategoryName, getVisibilityName } from '../utils/constants';
import '../styles/components/ProjectCard.css'; 

const ProjectCard = ({ project, onCopyCode }) => {
    return (
        <li className="project-item">
            <div className="project-header">
                <h3>{project.name}</h3>
                <span className={`visibility-tag ${project.visibility === 0 ? 'private' : 'public'}`}>
                    {getVisibilityName(project.visibility)}
                </span>
            </div>

            {project.description && (
                <p className="project-description">{project.description}</p>
            )}

            <div className="project-meta">
                <span className="meta-item">
                    <strong>Категория:</strong> {getCategoryName(project.category)}
                </span>
                {project.deadline && (
                    <span className="meta-item">
                        <strong>Дедлайн:</strong> {new Date(project.deadline).toLocaleString()}
                    </span>
                )}
                <span className="meta-item code-meta">
                    <strong>Код:</strong>
                    <span className="project-code-display">{project.publicCode}</span>
                    <button
                        className="copy-code-btn"
                        onClick={() => onCopyCode(project.publicCode)}
                    >
                        📋
                    </button>
                </span>
            </div>
        </li>
    );
};

export default ProjectCard;