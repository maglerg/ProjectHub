// projecthub.client/src/components/ProjectList.js

import React from 'react';
import ProjectCard from './ProjectCard';
import '../styles/components/ProjectList.css';

const ProjectList = ({ projects, loading, onCopyCode, onFavoriteToggle, showStats = true }) => {
    if (loading) {
        return <div className="loading">⏳ Загрузка...</div>;
    }

    if (!projects) {
        console.warn('⚠️ ProjectList: projects is undefined');
        return <p className="no-projects">📭 Нет проектов</p>;
    }

    if (!Array.isArray(projects)) {
        console.warn('⚠️ ProjectList: projects is not an array', projects);
        return <p className="no-projects">📭 Нет проектов</p>;
    }

    if (projects.length === 0) {
        return <p className="no-projects">📭 Нет проектов</p>;
    }

    const validProjects = projects.filter((p, index) => {
        if (!p || typeof p !== 'object') {
            console.warn(`⚠️ ProjectList: invalid project at index ${index}`, p);
            return false;
        }
        return true;
    });

    if (validProjects.length === 0) {
        console.warn('⚠️ ProjectList: no valid projects after filtering');
        return <p className="no-projects">📭 Нет проектов</p>;
    }

    return (
        <div className="projects-container">
            {showStats && (
                <div className="projects-stats">
                    <span>📊 Всего проектов: {validProjects.length}</span>
                </div>
            )}
            <ul className="projects-list">
                {validProjects.map((project, index) => (
                    <ProjectCard
                        key={project.id || project.publicCode || index}
                        project={project}
                        onCopyCode={onCopyCode}
                        onFavoriteToggle={onFavoriteToggle}
                    />
                ))}
            </ul>
        </div>
    );
};

export default ProjectList;