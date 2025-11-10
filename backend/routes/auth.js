/* eslint-env node */
const express = require('express');
const { supabase } = require('../supabase');
const { signAppToken, verifyAppToken } = require('../middleware/auth');

const router = express.Router();

const ALLOWED_SIGNUP_ROLES = new Set(["patient", "doctor"]);

const normalizeRole = (rawRole) => {
  if (!rawRole || typeof rawRole !== "string") return "patient";
  const lowered = rawRole.trim().toLowerCase();
  return ALLOWED_SIGNUP_ROLES.has(lowered) ? lowered : "patient";
};

const ensureAppUserRole = async (userId, rolePreference) => {
  if (!userId) return "patient";
  const desiredRole = rolePreference ? normalizeRole(rolePreference) : null;
  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("role, verify")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (data) {
      if (desiredRole && data.role !== desiredRole) {
        await supabase
          .from("app_users")
          .update({
            role: desiredRole,
            verify: desiredRole === "doctor" ? false : data.verify,
          })
          .eq("user_id", userId);
        return desiredRole;
      }
      return data.role || desiredRole || "patient";
    }

    const insertRole = desiredRole || "patient";
    const payload = {
      user_id: userId,
      role: insertRole,
    };
    if (insertRole === "doctor") {
      payload.verify = false;
    }
    const { error: insertError } = await supabase.from("app_users").insert(payload);
    if (insertError) {
      throw insertError;
    }
    return insertRole;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("ensureAppUserRole failed", err);
    return desiredRole || "patient";
  }
};

router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    const user = data.user;
    const effectiveRole = await ensureAppUserRole(user.id);
    const token = signAppToken({ sub: user.id, email: user.email, role: effectiveRole });
    res.cookie('auth_token', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7*24*60*60*1000 });
    return res.json({ session: data.session, user, token });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('signin error', e);
    return res.status(500).json({ error: 'Failed to sign in' });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    const user = data.user;
    const desiredRole = normalizeRole(role);
    const effectiveRole = await ensureAppUserRole(user.id, desiredRole);
    return res.json({ user, role: effectiveRole });
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
