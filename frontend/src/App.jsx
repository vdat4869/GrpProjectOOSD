import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import CoOwners from './pages/CoOwners';
import Booking from './pages/Booking';
import Group from './pages/Group';
import History from './pages/History';
import Admin from './pages/Admin';

function Private({ children }) {
	const { token } = useAuth();
	if (!token) return <Navigate to="/login" replace />;
	return children;
}

function Layout({ children }) {
	const { user, logout, hasAnyRole } = useAuth();
	const linkClass = ({ isActive }) => `px-3 py-1 rounded ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`;
	const isAdminOrStaff = hasAnyRole(["Admin","Staff"]);
	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white border-b sticky top-0 z-10">
				<div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
					<nav className="flex items-center gap-2">
						<NavLink to="/" className={({isActive}) => `font-semibold mr-4 ${isActive ? 'text-blue-700' : ''}`}>EV Co-ownership</NavLink>
						{isAdminOrStaff && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
						{isAdminOrStaff && <NavLink to="/coowners" className={linkClass}>CoOwners</NavLink>}
						<NavLink to="/booking" className={linkClass}>Booking</NavLink>
						<NavLink to="/group" className={linkClass}>Group</NavLink>
						<NavLink to="/history" className={linkClass}>History</NavLink>
					</nav>
					<div className="text-sm flex items-center gap-3">
						{user ? <span className="hidden sm:inline">{user.email}</span> : null}
						<button onClick={logout} className="text-red-600 hover:underline">Đăng xuất</button>
					</div>
				</div>
			</header>
			<main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
		</div>
	);
}

function Dashboard() {
	const { hasAnyRole } = useAuth();
	const isAdminOrStaff = hasAnyRole(["Admin","Staff"]);
	return (
		<div className="space-y-4">
			<h2 className="text-xl font-semibold">Dashboard</h2>
			<p className="text-gray-600">{isAdminOrStaff ? 'Bảng điều khiển quản trị' : 'Bảng điều khiển CoOwner'}</p>
		</div>
	);
}

export default function App() {
	return (
		<AuthProvider>
			<BrowserRouter>
				<Routes>
					<Route path="/login" element={<Login />} />
					<Route path="/register" element={<Register />} />
					<Route path="/" element={<Private><Layout><Dashboard /></Layout></Private>} />
					<Route path="/coowners" element={<Private><Layout><CoOwners /></Layout></Private>} />
					<Route path="/booking" element={<Private><Layout><Booking /></Layout></Private>} />
					<Route path="/group" element={<Private><Layout><Group /></Layout></Private>} />
					<Route path="/history" element={<Private><Layout><History /></Layout></Private>} />
					<Route path="/admin" element={<Private><Layout><Admin /></Layout></Private>} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</BrowserRouter>
		</AuthProvider>
	);
}
