// projecthub.client/src/components/ProjectList.js

import React from 'react';
import { Loader2, Inbox, BarChart3 } from 'lucide-react';
import ProjectCard from './ProjectCard';
import '../styles/components/ProjectList.css';

const ProjectList = ({
    projects,
    loading,
    onCopyCode,
    onFavoriteToggle,
    onEdit,
    onInvite,
    onArchive,
    onUnarchive,
    onDelete,
    showStats = true,
}) => {
    if (loading) {
        return (
            <div className="loading">
                <Loader2 size={16} className="icon-spin" />
                Загрузка...
            </div>
        );
    }

    if (!projects) {
        return (
            <p className="no-projects">
                <Inbox size={16} />
                Нет проектов
            </p>
        );
    }

    if (!Array.isArray(projects)) {
        return (
            <p className="no-projects">
                <Inbox size={16} />
                Нет проектов
            </p>
        );
    }

    if (projects.length === 0) {
        return (
            <p className="no-projects">
                <Inbox size={16} />
                Нет проектов
            </p>
        );
    }

    const validProjects = projects.filter((p) => {
        if (!p || typeof p !== 'object') return false;
        return true;
    });

    if (validProjects.length === 0) {
        return (
            <p className="no-projects">
                <Inbox size={16} />
                Нет проектов
            </p>
        );
    }

    return (
        <div className="projects-container">
            {showStats && (
                <div className="projects-stats">
                    <span>
                        <BarChart3 size={14} />
                        Всего проектов: {validProjects.length}
                    </span>
                </div>
            )}
            <ul className="projects-list">
                {validProjects.map((project, index) => (
                    <ProjectCard
                        key={project.id || project.publicCode || index}
                        project={project}
                        onCopyCode={onCopyCode}
                        onFavoriteToggle={onFavoriteToggle}
                        onEdit={onEdit}
                        onInvite={onInvite}
                        onArchive={onArchive}
                        onUnarchive={onUnarchive}
                        onDelete={onDelete}
                    />
                ))}
            </ul>
        </div>
    );
};

export default ProjectList;