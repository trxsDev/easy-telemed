/* eslint-env node */
const express = require('express');
const { supabase } = require('../supabase');
const { signAppToken, verifyAppToken } = require('../middleware/auth');

const router = express.Router();

router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    const user = data.user;
    const token = signAppToken({ sub: user.id, email: user.email, role: 'patient' });
    res.cookie('auth_token', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7*24*60*60*1000 });
    return res.json({ session: data.session, user });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('signin error', e);
    return res.status(500).json({ error: 'Failed to sign in' });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    const user = data.user;
    const token = signAppToken({ sub: user.id, email: user.email, role: 'patient' });
    res.cookie('auth_token', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7*24*60*60*1000 });
    return res.json({ user, session: data.session });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('signup error', e);
    return res.status(500).json({ error: 'Failed to sign up' });
  }
});

router.post('/signout', async (_req, res) => {
  res.clearCookie('auth_token');
  return res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : (req.cookies?.auth_token || null);
  if (!token) return res.json({ user: null });
  const claims = verifyAppToken(token);
  if (!claims) return res.json({ user: null });
  return res.json({ user: { user_id: claims.sub, email: claims.email } });
});

module.exports = router;
