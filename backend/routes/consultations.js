/* eslint-env node */
const express = require('express');
const { supabase } = require('../supabase');
const { emitToUser } = require('../socket');

const router = express.Router();

// Mark consultation as started and store Twilio room SID
router.post('/:consultationId/start', async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { room_id } = req.body || {};
    if (!consultationId) return res.status(400).json({ error: 'Missing consultationId' });

    // Base updates that we know exist in schema
    const updatesBase = { status: 'active', started_at: new Date().toISOString() };
    // Optional fields (may not exist in current schema)
  const updatesOptional = {};
  if (room_id) updatesOptional.room_id = room_id;

    // First try: include optional columns
    let result = await supabase
      .from('consultations')
      .update({ ...updatesBase, ...updatesOptional })
      .eq('consultation_id', consultationId)
      .select('*')
      .maybeSingle();

    // If failed due to unknown column (schema doesn’t have room_id), retry with base only
    if (result.error && (
      String(result.error.code) === 'PGRST204' /* PostgREST schema cache miss for column */ ||
      String(result.error.code) === '42703'    /* Postgres undefined_column */
    )) {
      console.warn('Optional column room_id not present on consultations; retrying without it:', result.error?.message);
      result = await supabase
        .from('consultations')
        .update(updatesBase)
        .eq('consultation_id', consultationId)
        .select('*')
        .maybeSingle();
    }

    if (result.error) throw result.error;
    return res.json({ consultation: result.data });
  } catch (e) {
    console.error('start consultation error', e);
    return res.status(500).json({ error: e.message });
  }
});

// Progress to summarizing step and notify patient
router.post('/:consultationId/summarize', async (req, res) => {
  try {
    const { consultationId } = req.params;
    if (!consultationId) return res.status(400).json({ error: 'Missing consultationId' });
    // Schema allows 'summarizing' -> persist to DB
    const { data: updated, error } = await supabase
      .from('consultations')
      .update({ status: 'summarizing' })
      .eq('consultation_id', consultationId)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    if (updated?.case_id) {
      const { data: caseRow } = await supabase
        .from('patient_cases')
        .select('patient_id')
        .eq('case_id', updated.case_id)
        .maybeSingle();
      const patientId = caseRow?.patient_id;
      if (patientId) {
        try { emitToUser(patientId, 'consultation:summarizing', { consultationId }); } catch (_) {}
      }
    }
    return res.json({ ok: true, consultation: updated, clientPhase: 'summarizing' });
  } catch (e) {
    console.error('summarize consultation error', e);
    return res.status(500).json({ error: e.message });
  }
});

// End consultation (complete) and notify patient
router.post('/:consultationId/end', async (req, res) => {
  try {
    const { consultationId } = req.params;
    if (!consultationId) return res.status(400).json({ error: 'Missing consultationId' });

    const updates = {
      status: 'completed',
      ended_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('consultations')
      .update(updates)
      .eq('consultation_id', consultationId)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    if (updated?.case_id) {
      const { data: caseRow } = await supabase
        .from('patient_cases')
        .select('patient_id')
        .eq('case_id', updated.case_id)
        .maybeSingle();
      const patientId = caseRow?.patient_id;
      if (patientId) {
        try { emitToUser(patientId, 'consultation:ended', { consultationId }); } catch (_) {}
      }
    }

    return res.json({ ok: true, consultation: updated });
  } catch (e) {
    console.error('end consultation error', e);
    return res.status(500).json({ error: e.message });
  }
});

// Fetch active drugs
router.get('/drugs', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('drug_catalog')
      .select('drug_id, name, strength, form, unit')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return res.json({ drugs: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Create or fetch prescription for consultation
router.post('/:consultationId/prescriptions', async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { issued_by, note } = req.body || {};
    if (!consultationId || !issued_by) return res.status(400).json({ error: 'Missing consultationId or issued_by' });

    // Try existing
    const { data: existing } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('consultation_id', consultationId)
      .maybeSingle();
    if (existing) return res.json({ prescription: existing });

    const { data, error } = await supabase
      .from('prescriptions')
      .insert({ consultation_id: consultationId, issued_by, note: note || null })
      .select('*')
      .single();
    if (error) throw error;
    return res.json({ prescription: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Add prescription items (bulk)
router.post('/prescriptions/:prescriptionId/items', async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { items } = req.body || {};
    if (!prescriptionId || !Array.isArray(items)) return res.status(400).json({ error: 'Missing prescriptionId or items' });

    const payload = items.map((it) => ({
      prescription_id: prescriptionId,
      drug_id: it.drug_id,
      dose: it.dose || null,
      route: it.route || null,
      frequency: it.frequency || null,
      duration: it.duration || null,
      quantity: it.quantity ?? null,
      instruction: it.instruction || null,
    }));

    const { data, error } = await supabase
      .from('prescription_items')
      .insert(payload)
      .select('*');
    if (error) throw error;
    return res.json({ items: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Create or update discharge summary (unique per consultation)
router.post('/:consultationId/discharge-summary', async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { diagnosis, plan, advice, prescription_id } = req.body || {};
    if (!consultationId || !prescription_id) return res.status(400).json({ error: 'Missing consultationId or prescription_id' });

    const upsertRow = {
      consultation_id: consultationId,
      diagnosis: diagnosis || null,
      plan: plan || null,
      advice: advice || null,
      prescription_id,
    };

    const { data, error } = await supabase
      .from('discharge_summaries')
      .upsert(upsertRow, { onConflict: 'consultation_id' })
      .select('*')
      .single();
    if (error) throw error;
    return res.json({ summary: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
