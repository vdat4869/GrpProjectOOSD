import React, { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
	const { login } = useAuth();
	const navigate = useNavigate();
	const [form, setForm] = useState({
		email: '',
		password: '',
		confirmPassword: '',
		firstName: '',
		lastName: ''
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

	const onSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			await api.post('/api/auth/register', {
				Email: form.email,
				Password: form.password,
				ConfirmPassword: form.confirmPassword,
				FirstName: form.firstName,
				LastName: form.lastName
			});
			// Auto login
			const profile = await login(form.email, form.password);
			const roles = profile?.roles || [];
			if (roles.includes('Admin') || roles.includes('Staff')) navigate('/admin');
			else if (roles.includes('CoOwner')) navigate('/booking');
			else navigate('/');
		} catch (err) {
			try {
				const data = err.response?.data;
				setError(typeof data === 'string' ? data : (data?.message || JSON.stringify(data)));
			} catch {
				setError('Đăng ký thất bại.');
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
			<div className="w-full max-w-md bg-white rounded-xl shadow p-6 space-y-4">
				<h1 className="text-2xl font-semibold">Đăng ký</h1>
				<form onSubmit={onSubmit} className="space-y-3">
					<input name="email" type="email" value={form.email} onChange={onChange} className="w-full border rounded px-3 py-2" placeholder="Email" />
					<div className="grid grid-cols-2 gap-3">
						<input name="firstName" value={form.firstName} onChange={onChange} className="border rounded px-3 py-2" placeholder="Tên" />
						<input name="lastName" value={form.lastName} onChange={onChange} className="border rounded px-3 py-2" placeholder="Họ" />
					</div>
					<input name="password" type="password" value={form.password} onChange={onChange} className="w-full border rounded px-3 py-2" placeholder="Mật khẩu" />
					<input name="confirmPassword" type="password" value={form.confirmPassword} onChange={onChange} className="w-full border rounded px-3 py-2" placeholder="Xác nhận mật khẩu" />
					{error ? <div className="text-red-600 text-sm">{error}</div> : null}
					<button disabled={loading} className="w-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700 disabled:opacity-60">
						{loading ? 'Đang đăng ký...' : 'Đăng ký'}
					</button>
				</form>
				<div className="text-sm text-gray-600">Đã có tài khoản? <Link to="/login" className="text-blue-600 hover:underline">Đăng nhập</Link></div>
			</div>
		</div>
	);
}
