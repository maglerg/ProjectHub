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
import UserProfilePage from './components/UserProfilePage';
import ApplicationsPage from './components/ApplicationsPage';
import FriendRequestsPage from './components/FriendRequestsPage';
import ProjectDashboardPage from './components/ProjectDashboardPage';
import InvitationsPage from './components/InvitationsPage';

import ChatsListPage from './components/ChatsListPage';
import ChatPage from './components/ChatPage';

import VotingsListPage from './components/VotingsListPage';
import CreateVotingPage from './components/CreateVotingPage';
import VotingPage from './components/VotingPage';

import TaskDetailsPage from './components/tasks/TaskDetailsPage';

import './index.css';

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    {/* ─── Публичные маршруты ─── */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* ─── Защищённые маршруты ─── */}
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

                    <Route path="/projects/:code/dashboard" element={
                        <ProtectedRoute>
                            <ProjectDashboardPage />
                        </ProtectedRoute>
                    } />

                    <Route path="/projects/:code/applications" element={
                        <ProtectedRoute>
                            <ApplicationsPage />
                        </ProtectedRoute>
                    } />

                    {/* ─── Задачи ─── */}
                    <Route path="/projects/:code/tasks/:taskId" element={
                        <ProtectedRoute>
                            <TaskDetailsPage />
                        </ProtectedRoute>
                    } />

                    {/* ─── Голосования ─── */}
                    <Route path="/projects/:code/votings" element={
                        <ProtectedRoute>
                            <VotingsListPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/projects/:code/votings/new" element={
                        <ProtectedRoute>
                            <CreateVotingPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/projects/:code/votings/:votingId" element={
                        <ProtectedRoute>
                            <VotingPage />
                        </ProtectedRoute>
                    } />

                    {/* ─── Чаты ─── */}
                    <Route path="/chats" element={
                        <ProtectedRoute>
                            <ChatsListPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/chats/:chatId" element={
                        <ProtectedRoute>
                            <ChatPage />
                        </ProtectedRoute>
                    } />

                    {/* ─── Профиль и социальное ─── */}
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
                    <Route path="/friends/requests" element={
                        <ProtectedRoute>
                            <FriendRequestsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/invitations" element={
                        <ProtectedRoute>
                            <InvitationsPage />
                        </ProtectedRoute>
                    } />

                    {/* ─── Fallback ─── */}
                    <Route path="*" element={<Navigate to="/projects" replace />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;