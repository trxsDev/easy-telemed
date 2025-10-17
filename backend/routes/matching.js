/* eslint-env node */
const express = require('express');
const { supabase } = require('../supabase');

const router = express.Router();
const { emitToUser } = require('../socket');

// Create a match request and update the related case status
router.post('/requests', async (req, res) => {
  try {
    const { caseId, mode, preferredDoctorId = null, specialty, expiresAt = null } = req.body || {};
    if (!caseId) return res.status(400).json({ error: 'Missing caseId' });
    if (!mode) return res.status(400).json({ error: 'Missing mode' });

    // Load case for queue enrichment
    const { data: caseRow, error: caseErr } = await supabase
      .from('patient_cases')
      .select('*')
      .eq('case_id', caseId)
      .single();
    if (caseErr) throw caseErr;

    // Insert into match_requests (minimal required fields)
    const minimalPayload = { case_id: caseId, mode, status: 'waiting' };
    if (preferredDoctorId) minimalPayload.preferred_doctor_id = preferredDoctorId;
    if (expiresAt) minimalPayload.expires_at = expiresAt;
    const { data: inserted, error: insErr } = await supabase
      .from('match_requests')
      .insert(minimalPayload)
      .select()
      .single();
    if (insErr) throw insErr;

    // Update case status + requested specialty
    const caseUpdate = { status: 'in_queue' };
    if (specialty && typeof specialty === 'object') {
      caseUpdate.requested_specialty = specialty.name || specialty.name_th || null;
      caseUpdate.requested_specialty_id = specialty.id || null;
    } else if (typeof specialty === 'string') {
      caseUpdate.requested_specialty = specialty;
    }
    try {
      await supabase.from('patient_cases').update(caseUpdate).eq('case_id', caseId);
    } catch (e) {
      // non-fatal
      // eslint-disable-next-line no-console
      console.warn('Failed to update patient_cases after match request', e?.message || e);
    }

    // Insert into queue_requests (FK -> profiles.id)
    let queueInsert = null;
    let queueSkippedReason = null;
    try {
      const pid = caseRow?.patient_id;
      if (pid) {
        // Check profiles.id == pid
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', pid)
          .maybeSingle();

        let ensureProfile = !!profileRow;
        if (!ensureProfile) {
          // If profiles has user_id field, try match by user_id
          try {
            const { data: altProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', pid)
              .maybeSingle();
            if (altProfile) ensureProfile = true;
          } catch (_) { /* ignore if column not exists */ }
        }
        if (!ensureProfile) {
          // Last resort: upsert minimal profile so FK can pass (requires permissions)
          try {
            await supabase.from('profiles').upsert({ id: pid }, { onConflict: 'id' });
            ensureProfile = true;
          } catch (upErr) {
            console.warn('[queue_requests] failed to upsert profile for', pid, upErr?.message);
          }
        }

        if (ensureProfile) {
          const queuePayload = {
            patient_uid: pid,
            symptom: caseRow?.symptoms_text || null,
            specialty: caseUpdate.requested_specialty || caseRow?.requested_specialty || null,
            status: 'pending',
          };
          const { data: qData } = await supabase
            .from('queue_requests')
            .insert(queuePayload)
            .select()
            .maybeSingle();
          queueInsert = qData || true;
        } else {
          console.warn('[queue_requests] profiles row not found for patient_id', pid, '; skipping queue insert');
          queueSkippedReason = 'no_profile_for_patient';
        }
      }
    } catch (e) {
      console.warn('Failed to insert into queue_requests (non-fatal):', e?.message || e);
    }

    return res.json({ request: inserted, queue: queueInsert, queueSkippedReason });
  } catch (error) {
    console.error('Failed to create match request', error);
    return res.status(500).json({ error: error?.message || 'Failed to create match request' });
  }
});

// Status helpers
const ACTIVE_MATCH_STATUSES = ['waiting', 'offered', 'accepted'];

// Get current matching status by case id
router.get('/status/by-case/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    if (!caseId) return res.status(400).json({ error: 'Missing caseId' });

    const { data: caseRow, error: caseErr } = await supabase
      .from('patient_cases')
      .select('*')
      .eq('case_id', caseId)
      .single();
    if (caseErr) throw caseErr;

    const { data: matchReq, error: matchErr } = await supabase
      .from('match_requests')
      .select('*')
      .eq('case_id', caseId)
      .in('status', ACTIVE_MATCH_STATUSES)
      .order('created_at', { ascending: false })
      .maybeSingle();
    if (matchErr) throw matchErr;

    const { data: consultRow } = await supabase
      .from('consultations')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .maybeSingle();

    let step = 'match';
    let status = null;
    if (consultRow) {
      step = 'doctor_ready';
      status = 'doctor_ready';
    } else if (matchReq) {
      step = 'waiting';
      status = matchReq.status;
    } else if (caseRow?.status === 'open') {
      step = 'match';
      status = 'open';
    } else if (caseRow?.status === 'in_queue') {
      step = 'waiting';
      status = 'waiting';
    }

    return res.json({ case: caseRow, matchRequest: matchReq, consultation: consultRow, step, status });
  } catch (error) {
    console.error('Failed to get matching status', error);
    return res.status(500).json({ error: error?.message || 'Failed to get status' });
  }
});

// Cancel an active match request by requestId
router.post('/requests/:requestId/cancel', async (req, res) => {
  try {
    const { requestId } = req.params;
    if (!requestId) return res.status(400).json({ error: 'Missing requestId' });
    const { data, error } = await supabase
      .from('match_requests')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('request_id', requestId)
      .select()
      .single();
    if (error) throw error;
    return res.json({ request: data });
  } catch (error) {
    console.error('Failed to cancel match request', error);
    return res.status(500).json({ error: error?.message || 'Failed to cancel' });
  }
});

// Inspect queue entries by patient id (debug/helper)
router.get('/queue/by-patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) return res.status(400).json({ error: 'Missing patientId' });
    const { data, error } = await supabase
      .from('queue_requests')
      .select('*')
      .eq('patient_uid', patientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ items: data || [] });
  } catch (error) {
    console.error('Failed to fetch queue by patient', error);
    return res.status(500).json({ error: error?.message || 'Failed to fetch queue' });
  }
});

// Get queue for a doctor (match_requests targeted to the doctor)
router.get('/doctor-queue', async (req, res) => {
  try {
    const doctorId = req.query.doctorId;
    if (!doctorId) return res.status(400).json({ error: 'Missing doctorId' });
    const { data: requests, error } = await supabase
      .from('match_requests')
      .select('*')
      .in('status', ['waiting', 'offered'])
      .eq('preferred_doctor_id', doctorId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const caseIds = (requests || []).map((r) => r.case_id);
    const { data: cases } = await supabase
      .from('patient_cases')
      .select('*')
      .in('case_id', caseIds);
    const casesById = new Map((cases || []).map((c) => [c.case_id, c]));

    const patientIds = Array.from(new Set((cases || []).map((c) => c.patient_id).filter(Boolean)));
    const { data: patients } = await supabase
      .from('app_users')
      .select('user_id, display_name')
      .in('user_id', patientIds);
    const patientsById = new Map((patients || []).map((p) => [p.user_id, p]));

    const enriched = (requests || []).map((r) => ({
      request: r,
      case: casesById.get(r.case_id) || null,
      patient: patientsById.get((casesById.get(r.case_id) || {}).patient_id) || null,
    }));
    return res.json({ items: enriched });
  } catch (error) {
    console.error('Failed to fetch doctor queue', error);
    return res.status(500).json({ error: error?.message || 'Failed to fetch queue' });
  }
});

// Accept a match request
router.post('/requests/:requestId/accept', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { doctorId } = req.body || {};
    if (!requestId || !doctorId) return res.status(400).json({ error: 'Missing requestId or doctorId' });
    const { data, error } = await supabase
      .from('match_requests')
      .update({ status: 'accepted', preferred_doctor_id: doctorId, updated_at: new Date().toISOString() })
      .eq('request_id', requestId)
      .select()
      .single();
    if (error) throw error;

    if (data?.case_id) {
      await supabase.from('patient_cases').update({ status: 'matched' }).eq('case_id', data.case_id);
    }

    return res.json({ request: data });
  } catch (error) {
    console.error('Failed to accept request', error);
    return res.status(500).json({ error: error?.message || 'Failed to accept request' });
  }
});

// Create consultation if missing
router.post('/consultations', async (req, res) => {
  try {
    const { caseId, patientId, doctorId, createdBy } = req.body || {};
    if (!caseId || !patientId || !doctorId) return res.status(400).json({ error: 'Missing caseId/patientId/doctorId' });

    // Ensure doctor is active/recent; try to refresh last_seen_at if already active
    try {
      const { data: statusRow } = await supabase
        .from('doctor_status')
        .select('doctor_id, is_active, last_seen_at')
        .eq('doctor_id', doctorId)
        .maybeSingle();
      const now = Date.now();
      const FIVE_MIN = 5 * 60 * 1000;
      if (!statusRow || statusRow.is_active !== true) {
        return res.status(400).json({ error: 'doctor not active/recent' });
      }
      const lastSeen = statusRow.last_seen_at ? new Date(statusRow.last_seen_at).getTime() : 0;
      if (!lastSeen || now - lastSeen > FIVE_MIN) {
        // Refresh last_seen_at to now
        await supabase
          .from('doctor_status')
          .update({ last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('doctor_id', doctorId);
      }
    } catch (_) {
      // If this check fails unexpectedly, let DB constraint decide, but we've attempted to help
    }

    const { data: existing, error: findError } = await supabase
      .from('consultations')
      .select('consultation_id')
      .eq('case_id', caseId)
      .maybeSingle();
    if (findError) throw findError;
    if (existing) return res.json({ consultation: existing });

    const payload = {
      case_id: caseId,
      patient_id: patientId,
      doctor_id: doctorId,
      status: 'pending',
      created_by: createdBy || doctorId,
    };
    const { data, error } = await supabase
      .from('consultations')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    // Do not auto-invite the patient; doctor will manually send doctor:ready when ready
    return res.json({ consultation: data });
  } catch (error) {
    console.error('Failed to create consultation', error);
    return res.status(500).json({ error: error?.message || 'Failed to create consultation' });
  }
});

module.exports = router;
