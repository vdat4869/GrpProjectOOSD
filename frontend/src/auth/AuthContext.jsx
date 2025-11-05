import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [token, setToken] = useState(() => localStorage.getItem('accessToken') || '');
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(false);

	const saveToken = useCallback((newToken) => {
		setToken(newToken || '');
		if (newToken) localStorage.setItem('accessToken', newToken);
		else localStorage.removeItem('accessToken');
	}, []);

	const fetchMe = useCallback(async () => {
		if (!token) {
			setUser(null);
			return null;
		}
		try {
			setLoading(true);
			const res = await api.get('/api/auth/me');
			const profile = res.data?.data || null;
			setUser(profile);
			return profile;
		} catch (e) {
			setUser(null);
			return null;
		} finally {
			setLoading(false);
		}
	}, [token]);

	useEffect(() => {
		fetchMe();
	}, [fetchMe]);

	const login = useCallback(async (email, password) => {
		const res = await api.post('/api/auth/login', { Email: email, Password: password });
		const accessToken = res.data?.data?.accessToken;
		saveToken(accessToken);
		const profile = await fetchMe();
		return profile; // trả về profile để redirect theo role
	}, [fetchMe, saveToken]);

	const logout = useCallback(() => {
		saveToken('');
		setUser(null);
	}, [saveToken]);

	const hasRole = useCallback((role) => {
		return !!user?.roles?.includes(role);
	}, [user]);
	const hasAnyRole = useCallback((roles) => {
		return !!user?.roles?.some(r => roles.includes(r));
	}, [user]);

	const value = useMemo(() => ({ token, user, loading, login, logout, hasRole, hasAnyRole }), [token, user, loading, login, logout, hasRole, hasAnyRole]);

	return (
		<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = React.useContext(AuthContext);
	return ctx;
}
