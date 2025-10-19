export async function api(path, { method='GET', body, token }={}) {
const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
method,
headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
body: body ? JSON.stringify(body) : undefined,
credentials: 'include'
});
if (!res.ok) throw new Error(await res.text());
return res.json();
}