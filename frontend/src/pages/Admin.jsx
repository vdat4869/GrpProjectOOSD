import React from 'react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function Admin() {
	const { user } = useAuth();
	const [health, setHealth] = React.useState('');
	const [error, setError] = React.useState('');

	const [userId, setUserId] = React.useState('');
	const [role, setRole] = React.useState('Staff');
	const [assignResult, setAssignResult] = React.useState('');
	const [assignError, setAssignError] = React.useState('');

	const [search, setSearch] = React.useState('');
	const [page, setPage] = React.useState(1);
	const [pageSize, setPageSize] = React.useState(10);
	const [users, setUsers] = React.useState([]);
	const [total, setTotal] = React.useState(0);
	const [loadingUsers, setLoadingUsers] = React.useState(false);

	React.useEffect(() => {
		(async () => {
			try {
				setError('');
				const res = await api.get('/api/admin/health');
				setHealth(JSON.stringify(res.data));
			} catch (e) {
				setError('Không truy cập được Admin service.');
			}
		})();
	}, []);

	const loadUsers = React.useCallback(async () => {
		try {
			setLoadingUsers(true);
			const res = await api.get('/api/role/users', { params: { search, page, pageSize } });
			const data = res.data?.data;
			setUsers(data?.users || []);
			setTotal(data?.total || 0);
		} catch (e) {
			// ignore
		} finally {
			setLoadingUsers(false);
		}
	}, [search, page, pageSize]);

	React.useEffect(() => { loadUsers(); }, [loadUsers]);

	const removeRoleSafe = async (uid, r) => {
		try {
			await api.delete(`/api/role/users/${encodeURIComponent(uid)}/remove`, { data: { RoleName: r } });
		} catch {
			// ignore
		}
	};

	const assignRole = async (e) => {
		e.preventDefault();
		setAssignError('');
		setAssignResult('');
		if (!userId) { setAssignError('Vui lòng nhập UserId'); return; }
		try {
			await removeRoleSafe(userId, 'Staff');
			await removeRoleSafe(userId, 'CoOwner');
			const res = await api.post(`/api/role/users/${encodeURIComponent(userId)}/assign`, { RoleName: role });
			setAssignResult(JSON.stringify(res.data));
			loadUsers();
		} catch (err) {
			try { setAssignError(JSON.stringify(err.response?.data || err.message)); } catch { setAssignError('Gán quyền thất bại.'); }
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">Admin dashboard</h2>
				<div className="text-sm text-gray-600">Đăng nhập: {user?.email}</div>
			</div>

			{/* Quick links */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<a href="/coowners" className="block p-4 rounded border bg-white hover:shadow">Quản lý CoOwners</a>
				<a href="/booking" className="block p-4 rounded border bg-white hover:shadow">Quản lý Booking</a>
				<a href="/group" className="block p-4 rounded border bg-white hover:shadow">Quản lý Group</a>
			</div>

			{/* Assign role */}
			<div className="bg-white rounded border p-4 space-y-3">
				<h3 className="font-semibold">Gán quyền người dùng</h3>
				<p className="text-sm text-gray-600">Nhập UserId và chọn vai trò để gán (thay thế role Staff/CoOwner hiện có).</p>
				<form onSubmit={assignRole} className="flex flex-col md:flex-row gap-3">
					<input value={userId} onChange={(e)=>setUserId(e.target.value)} className="border rounded px-3 py-2 flex-1" placeholder="UserId (từ Auth service)" />
					<select value={role} onChange={(e)=>setRole(e.target.value)} className="border rounded px-3 py-2">
						<option value="Staff">Staff</option>
						<option value="CoOwner">CoOwner</option>
					</select>
					<button className="bg-blue-600 text-white rounded px-4 py-2">Gán quyền</button>
				</form>
				{assignError && <div className="text-red-600 text-sm">{assignError}</div>}
				{assignResult && <pre className="bg-gray-100 text-xs p-2 rounded overflow-auto">{assignResult}</pre>}
			</div>

			{/* Users table */}
			<div className="bg-white rounded border p-4">
				<div className="flex flex-wrap items-center gap-3 mb-3">
					<input value={search} onChange={(e)=>{ setSearch(e.target.value); setPage(1); }} className="border rounded px-3 py-2" placeholder="Tìm email/tên" />
					<select value={pageSize} onChange={(e)=>{ setPageSize(parseInt(e.target.value)); setPage(1); }} className="border rounded px-2 py-2">
						<option value={5}>5</option>
						<option value={10}>10</option>
						<option value={20}>20</option>
					</select>
					<div className="flex items-center gap-2 ml-auto">
						<button disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-2 border rounded">Prev</button>
						<span>Trang {page}</span>
						<button onClick={()=>setPage(p=>p+1)} className="px-3 py-2 border rounded">Next</button>
					</div>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="bg-gray-50 border-b">
								<th className="p-2 text-left">UserId</th>
								<th className="p-2 text-left">Email</th>
								<th className="p-2 text-left">Họ tên</th>
								<th className="p-2 text-left">Roles</th>
								<th className="p-2 text-left">Thao tác</th>
							</tr>
						</thead>
						<tbody>
							{loadingUsers ? (
								<tr><td className="p-3" colSpan={5}>Đang tải...</td></tr>
							) : (
								users.map(u => (
									<tr key={u.id} className="border-b last:border-0">
										<td className="p-2">{u.id}</td>
										<td className="p-2">{u.email}</td>
										<td className="p-2">{u.firstName} {u.lastName}</td>
										<td className="p-2">{(u.roles||[]).join(', ')}</td>
										<td className="p-2 space-x-2">
											<button onClick={()=>{ setUserId(u.id.toString()); setRole('Staff'); }} className="px-3 py-1 border rounded">Set Staff</button>
											<button onClick={()=>{ setUserId(u.id.toString()); setRole('CoOwner'); }} className="px-3 py-1 border rounded">Set CoOwner</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
				<div className="text-xs text-gray-500 mt-2">Tổng: {total}</div>
			</div>

			{/* Service health */}
			<div className="bg-white rounded border p-4">
				<h3 className="font-semibold mb-2">Tình trạng dịch vụ</h3>
				{error ? <div className="text-red-600 text-sm">{error}</div> : null}
				{health ? <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">{health}</pre> : <div className="text-sm text-gray-500">Đang kiểm tra...</div>}
			</div>
		</div>
	);
}
