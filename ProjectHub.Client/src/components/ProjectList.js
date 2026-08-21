// src/components/ProjectList.js
import React from 'react';
import ProjectCard from './ProjectCard';
import '../styles/components/ProjectList.css';

const ProjectList = ({ projects, loading, onCopyCode, showStats = true }) => {
    if (loading) {
        return <div className="loading">⏳ Загрузка...</div>;
    }

    if (projects.length === 0) {
        return <p className="no-projects">📭 Нет проектов</p>;
    }

    return (
        <div className="projects-container">
            {showStats && (
                <div className="projects-stats">
                    <span>📊 Всего проектов: {projects.length}</span>
                </div>
            )}
            <ul className="projects-list">
                {projects.map((project) => (
                    <ProjectCard
                        key={project.publicCode}
                        project={project}
                        onCopyCode={onCopyCode}
                    />
                ))}
            </ul>
        </div>
    );
};

export default ProjectList;