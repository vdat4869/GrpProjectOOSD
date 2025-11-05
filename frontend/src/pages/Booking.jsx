import React from 'react';
import api from '../api/client';

export default function Booking() {
	const [health, setHealth] = React.useState('');
	const [error, setError] = React.useState('');

	React.useEffect(() => {
		(async () => {
			try {
				setError('');
				const res = await api.get('/api/booking/health');
				setHealth(JSON.stringify(res.data));
			} catch (e) {
				setError('Không truy cập được Booking service.');
			}
		})();
	}, []);

	return (
		<div className="space-y-4">
			<h2 className="text-xl font-semibold">Booking</h2>
			{error ? <div className="text-red-600 text-sm">{error}</div> : null}
			{health ? <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">{health}</pre> : null}
			<p className="text-sm text-gray-600">Trang này sẽ mở rộng các chức năng đặt lịch/đặt xe.</p>
		</div>
	);
}
