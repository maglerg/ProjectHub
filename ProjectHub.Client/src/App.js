// projecthub.client/src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ProjectsPage from './components/ProjectsPage';
import ProjectDetailsPage from './components/ProjectDetailsPage';
import ProfilePage from './components/ProfilePage'; 
import './index.css';
import UserProfilePage from './components/UserProfilePage';

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    {/* Публичные маршруты */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* Защищенные маршруты */}
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

                    <Route path="/profile" element={
                        <ProtectedRoute>
                            <ProfilePage />
                        </ProtectedRoute>
                    } />
                    <Route path="/users/:email" element={
                        <ProtectedRoute>
                            <UserProfilePage />
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