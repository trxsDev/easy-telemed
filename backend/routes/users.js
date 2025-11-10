/* eslint-env node */
const express = require('express');
const { supabase } = require('../supabase');

const router = express.Router();

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const [{ data: appUser, error: appErr }, { data: authUser, error: authErr }] = await Promise.all([
      supabase.from('app_users').select('*').eq('user_id', userId).maybeSingle(),
      supabase.auth.admin.getUserById(userId),
    ]);
    if (appErr) throw appErr;
    if (authErr) throw authErr;

    const authData = authUser?.user || null;
    const out = appUser
      ? {
          ...appUser,
          email: authData?.email ?? null,
          email_confirmed_at: authData?.email_confirmed_at ?? null,
          last_sign_in_at: authData?.last_sign_in_at ?? null,
        }
      : null;
    return res.json({ user: out });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('get user error', e);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
