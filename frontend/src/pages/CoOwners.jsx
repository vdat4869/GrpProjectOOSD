import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function CoOwners() {
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const [form, setForm] = useState({
		userId: '',
		fullName: '',
		identityCardNumber: '',
		drivingLicenseNumber: '',
		email: '',
		phoneNumber: '',
		address: '',
	});

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [search, setSearch] = useState('');

	const [editId, setEditId] = useState(null);
	const [editForm, setEditForm] = useState({ fullName: '', drivingLicenseNumber: '', email: '', phoneNumber: '', address: '' });

	const fetchList = async () => {
		try {
			setLoading(true);
			setError('');
			const res = await api.get('/api/account/CoOwners', { params: { page, pageSize, search } });
			setItems(res.data || res.data?.data || []);
		} catch (e) {
			setError('Không tải được danh sách.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchList();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page, pageSize, search]);

	const onChange = (e) => {
		setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	};

	const onCreate = async (e) => {
		e.preventDefault();
		setError('');
		try {
			await api.post('/api/account/CoOwners', form);
			await fetchList();
			setForm({ userId: '', fullName: '', identityCardNumber: '', drivingLicenseNumber: '', email: '', phoneNumber: '', address: '' });
		} catch (err) {
			try {
				const data = err.response?.data;
				setError(typeof data === 'string' ? data : JSON.stringify(data));
			} catch {
				setError('Tạo CoOwner thất bại.');
			}
		}
	};

	const startEdit = (it) => {
		setEditId(it.id);
		setEditForm({
			fullName: it.fullName || '',
			drivingLicenseNumber: it.drivingLicenseNumber || '',
			email: it.email || '',
			phoneNumber: it.phoneNumber || '',
			address: it.address || '',
		});
	};

	const cancelEdit = () => {
		setEditId(null);
		setEditForm({ fullName: '', drivingLicenseNumber: '', email: '', phoneNumber: '', address: '' });
	};

	const saveEdit = async (id) => {
		try {
			await api.put(`/api/account/CoOwners/${id}`, editForm);
			await fetchList();
			cancelEdit();
		} catch (err) {
			setError('Cập nhật thất bại.');
		}
	};

	const onDelete = async (id) => {
		if (!confirm('Xoá CoOwner này?')) return;
		try {
			await api.delete(`/api/account/CoOwners/${id}`);
			await fetchList();
		} catch (err) {
			setError('Xoá thất bại.');
		}
	};

	return (
		<div className="space-y-6">
			<h2 className="text-xl font-semibold">CoOwners</h2>

			{/* Bộ lọc & phân trang */}
			<div className="flex flex-wrap items-center gap-3">
				<input value={search} onChange={(e)=>setSearch(e.target.value)} className="border rounded px-3 py-2" placeholder="Tìm kiếm (UserId, Họ tên, Email, CCCD)" />
				<select value={pageSize} onChange={(e)=>{setPageSize(parseInt(e.target.value)); setPage(1);}} className="border rounded px-2 py-2">
					<option value={5}>5</option>
					<option value={10}>10</option>
					<option value={20}>20</option>
				</select>
				<div className="flex items-center gap-2">
					<button disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-2 border rounded">Prev</button>
					<span>Trang {page}</span>
					<button onClick={()=>setPage(p=>p+1)} className="px-3 py-2 border rounded">Next</button>
				</div>
			</div>

			<form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded border">
				<input name="userId" value={form.userId} onChange={onChange} className="border rounded px-3 py-2" placeholder="UserId (unique)" />
				<input name="fullName" value={form.fullName} onChange={onChange} className="border rounded px-3 py-2" placeholder="Full name" />
				<input name="identityCardNumber" value={form.identityCardNumber} onChange={onChange} className="border rounded px-3 py-2" placeholder="CCCD (chỉ số)" />
				<input name="drivingLicenseNumber" value={form.drivingLicenseNumber} onChange={onChange} className="border rounded px-3 py-2" placeholder="GPLX (chỉ số)" />
				<input name="email" type="email" value={form.email} onChange={onChange} className="border rounded px-3 py-2" placeholder="Email" />
				<input name="phoneNumber" value={form.phoneNumber} onChange={onChange} className="border rounded px-3 py-2" placeholder="SĐT" />
				<input name="address" value={form.address} onChange={onChange} className="border rounded px-3 py-2 md:col-span-2" placeholder="Địa chỉ" />
				<div className="md:col-span-2 flex items-center gap-3">
					<button className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700">Tạo</button>
					{error ? <span className="text-red-600 text-sm">{error}</span> : null}
				</div>
			</form>

			<div className="bg-white rounded border overflow-x-auto">
				{loading ? (
					<div className="p-4">Đang tải...</div>
				) : (
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b bg-gray-50">
								<th className="text-left p-3">UserId</th>
								<th className="text-left p-3">Họ tên</th>
								<th className="text-left p-3">Email</th>
								<th className="text-left p-3">CCCD</th>
								<th className="text-left p-3">Xác minh</th>
								<th className="text-left p-3">Thao tác</th>
							</tr>
						</thead>
						<tbody>
							{items.map((it) => (
								<tr key={it.id} className="border-b last:border-0">
									<td className="p-3">{it.userId}</td>
									<td className="p-3">{it.fullName}</td>
									<td className="p-3">{it.email}</td>
									<td className="p-3">{it.identityCardNumber}</td>
									<td className="p-3">{it.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}</td>
									<td className="p-3 space-x-2">
										<button onClick={() => startEdit(it)} className="px-3 py-1 border rounded hover:bg-gray-50">Sửa</button>
										<button onClick={() => onDelete(it.id)} className="px-3 py-1 border rounded text-red-600 hover:bg-red-50">Xoá</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			{editId && (
				<div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg w-full max-w-lg p-6 space-y-4">
						<h3 className="text-lg font-semibold">Chỉnh sửa CoOwner</h3>
						<div className="grid grid-cols-1 gap-3">
							<input className="border rounded px-3 py-2" value={editForm.fullName} onChange={(e)=>setEditForm({...editForm, fullName:e.target.value})} placeholder="Họ tên" />
							<input className="border rounded px-3 py-2" value={editForm.drivingLicenseNumber} onChange={(e)=>setEditForm({...editForm, drivingLicenseNumber:e.target.value})} placeholder="GPLX (chỉ số)" />
							<input className="border rounded px-3 py-2" type="email" value={editForm.email} onChange={(e)=>setEditForm({...editForm, email:e.target.value})} placeholder="Email" />
							<input className="border rounded px-3 py-2" value={editForm.phoneNumber} onChange={(e)=>setEditForm({...editForm, phoneNumber:e.target.value})} placeholder="SĐT" />
							<input className="border rounded px-3 py-2" value={editForm.address} onChange={(e)=>setEditForm({...editForm, address:e.target.value})} placeholder="Địa chỉ" />
						</div>
						<div className="flex justify-end gap-3">
							<button onClick={cancelEdit} className="px-4 py-2 border rounded">Huỷ</button>
							<button onClick={()=>saveEdit(editId)} className="px-4 py-2 bg-blue-600 text-white rounded">Lưu</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
