// projecthub.client/src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ProjectsPage from './components/ProjectsPage';
import ProjectDetailsPage from './components/ProjectDetailsPage';
import './index.css';

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    {/* Публичные маршруты */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* Защищенные маршруты - главная страница проектов */}
                    <Route path="/" element={
                        <ProtectedRoute>
                            <ProjectsPage />
                        </ProtectedRoute>
                    } />

                    <Route path="/projects" element={
                        <ProtectedRoute>
                            <ProjectsPage />
                        </ProtectedRoute>
                    } />

                    <Route path="/projects/:code" element={
                        <ProtectedRoute>
                            <ProjectDetailsPage />
                        </ProtectedRoute>
                    } />

                    {/* Перенаправление */}
                    <Route path="*" element={<Navigate to="/projects" replace />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;