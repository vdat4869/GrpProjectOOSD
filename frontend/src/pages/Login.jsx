import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
	const { login } = useAuth();
	const navigate = useNavigate();
	const [email, setEmail] = useState('admin@example.com');
	const [password, setPassword] = useState('Admin@12345');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const onSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			const profile = await login(email, password);
			const roles = profile?.roles || [];
			if (roles.includes('Admin') || roles.includes('Staff')) {
				navigate('/admin');
			} else if (roles.includes('CoOwner')) {
				navigate('/booking');
			} else {
				navigate('/');
			}
		} catch (err) {
			setError('Đăng nhập thất bại. Vui lòng kiểm tra Email/Mật khẩu.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
			<div className="w-full max-w-md bg-white rounded-xl shadow p-6 space-y-3">
				<h1 className="text-2xl font-semibold">Đăng nhập</h1>
				<form onSubmit={onSubmit} className="space-y-4">
					<div>
						<label className="block text-sm mb-1">Email</label>
						<input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" type="email" placeholder="email@example.com" />
					</div>
					<div>
						<label className="block text-sm mb-1">Mật khẩu</label>
						<input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" type="password" placeholder="••••••••" />
					</div>
					{error ? <div className="text-red-600 text-sm">{error}</div> : null}
					<button disabled={loading} className="w-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700 disabled:opacity-60">
						{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
					</button>
				</form>
				<div className="text-sm text-gray-600">Chưa có tài khoản? <Link to="/register" className="text-blue-600 hover:underline">Đăng ký</Link></div>
			</div>
		</div>
	);
}
