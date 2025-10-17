/* eslint-env node */
const express = require('express');
const { supabase } = require('../supabase');

const router = express.Router();

// Heartbeat to set/refresh doctor presence
router.post('/heartbeat', async (req, res) => {
  try {
    const { doctorId, isActive = true } = req.body || {};
    if (!doctorId) return res.status(400).json({ error: 'Missing doctorId' });

    const nowIso = new Date().toISOString();
    // Try update first
    const { data: updated, error: updErr } = await supabase
      .from('doctor_status')
      .update({ is_active: !!isActive, last_seen_at: nowIso, updated_at: nowIso })
      .eq('doctor_id', doctorId)
      .select('doctor_id, is_active, last_seen_at')
      .maybeSingle();
    if (updErr) throw updErr;
    if (updated) return res.json({ status: updated });

    // Insert if not exists
    const insertPayload = {
      doctor_id: doctorId,
      is_active: !!isActive,
      last_seen_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    };
    const { data: inserted, error: insErr } = await supabase
      .from('doctor_status')
      .insert(insertPayload)
      .select('doctor_id, is_active, last_seen_at')
      .maybeSingle();
    if (insErr) throw insErr;
    return res.json({ status: inserted });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[doctor/heartbeat] failed', error);
    return res.status(500).json({ error: error?.message || 'heartbeat failed' });
  }
});

module.exports = router;