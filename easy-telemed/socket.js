import { io } from 'socket.io-client';
export function connectSocket(idToken) {
	const url =
		(typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SOCKET_URL || import.meta.env?.VITE_BACKEND_URL)) ||
		'http://localhost:3001';
	return io(url, { auth: { token: idToken } });
}