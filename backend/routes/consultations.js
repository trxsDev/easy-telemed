/* eslint-env node */
const express = require('express');
const { supabase } = require('../supabase');
const { emitToUser } = require('../socket');
const PDFDocument = require('pdfkit');

const router = express.Router();
const SUMMARY_BUCKET = process.env.SUMMARY_STORAGE_BUCKET || 'attachments';
let ensuredBuckets = new Set();

const safeText = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value.trim() || '-';
  return String(value);
};

const formatDateTime = (value) => {
  if (!value) return '-';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return safeText(value);
    return date.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  } catch {
    return safeText(value);
  }
};

const enrichPrescriptionItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const drugIds = Array.from(new Set(items.map((it) => it?.drug_id).filter(Boolean)));
  if (drugIds.length === 0) return items;
  const { data, error } = await supabase
    .from('drug_catalog')
    .select('drug_id, name, strength')
    .in('drug_id', drugIds);
  if (error) {
    return items;
  }
  const lookup = new Map();
  (data || []).forEach((drug) => {
    const label = [drug?.name, drug?.strength].filter(Boolean).join(' ');
    lookup.set(drug.drug_id, label || drug?.name || drug?.drug_id);
  });
  return items.map((item) => ({
    ...item,
    drug_name: lookup.get(item?.drug_id) || item?.drug_name || item?.drug_id || '',
  }));
};

const ensureBucket = async (bucket) => {
  if (!bucket) throw new Error('Missing bucket name');
  if (ensuredBuckets.has(bucket)) return;
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    // If listing buckets fails due to RLS, propagate (service role should bypass)
    throw listError;
  }
  if (!Array.isArray(buckets) || !buckets.find((b) => b?.name === bucket)) {
    const { error: createError } = await supabase.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024, // 50 MB
    });
    if (createError && !String(createError.message || '').includes('already exists')) {
      throw createError;
    }
  }
  ensuredBuckets.add(bucket);
};

const buildSummaryPdf = ({ consultationId, consultation, caseData, patient, doctor, dischargeSummary, prescription, items }) => new Promise((resolve, reject) => {
  try {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Telemedicine Consultation Summary', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Generated At: ${formatDateTime(new Date().toISOString())}`);
    doc.text(`Consultation ID: ${consultationId}`);
    doc.text(`Consultation Status: ${safeText(consultation?.status)}`);
    doc.moveDown();

    doc.fontSize(14).text('Participants', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Patient: ${safeText(patient?.display_name)} (${safeText(consultation?.patient_id)})`);
    doc.text(`Doctor: ${safeText(doctor?.display_name)} (${safeText(consultation?.doctor_id)})`);
    if (caseData?.requested_specialty) {
      doc.text(`Specialty: ${safeText(caseData.requested_specialty)}`);
    }
    doc.moveDown();

    if (caseData?.symptoms_text) {
      doc.fontSize(14).text('Presenting Symptoms', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(caseData.symptoms_text, { align: 'left' });
      doc.moveDown();
    }

    doc.fontSize(14).text('Clinical Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Diagnosis: ${safeText(dischargeSummary?.diagnosis)}`);
    doc.text(`Treatment Plan: ${safeText(dischargeSummary?.plan)}`);
    doc.text(`Advice: ${safeText(dischargeSummary?.advice)}`);
    doc.moveDown();

    doc.fontSize(14).text('Medication', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    if (Array.isArray(items) && items.length > 0) {
      items.forEach((item, idx) => {
        doc.text(`${idx + 1}. ${safeText(item.drug_name)}`);
        const details = [
          item.dose ? `Dose: ${safeText(item.dose)}` : null,
          item.route ? `Route: ${safeText(item.route)}` : null,
          item.frequency ? `Frequency: ${safeText(item.frequency)}` : null,
          item.duration ? `Duration: ${safeText(item.duration)}` : null,
          Number.isFinite(item.quantity) ? `Quantity: ${item.quantity}` : null,
          item.instruction ? `Instructions: ${safeText(item.instruction)}` : null,
        ].filter(Boolean);
        if (details.length > 0) {
          details.forEach((line) => doc.text(`   - ${line}`));
        }
        doc.moveDown(0.3);
      });
    } else {
      doc.text('No medications prescribed.');
    }
    doc.moveDown();

    doc.fontSize(12).text('--- End of Summary ---', { align: 'center' });
    doc.end();
  } catch (err) {
    reject(err);
  }
});

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
        try {
          emitToUser(patientId, 'consultation:summarizing', {
            consultationId,
            patientId,
            consultation: updated,
          });
        } catch (_) {}
      }
    }
    try { await emitConsultationUpdate(updated); } catch (_) {}
    return res.json({ ok: true, consultation: updated, clientPhase: 'summarizing' });
  } catch (e) {
    console.error('summarize consultation error', e);
    return res.status(500).json({ error: e.message });
  }
});

const emitConsultationUpdate = async (consultation) => {
  try {
    if (!consultation?.case_id) return;
    const { data: caseRow } = await supabase
      .from('patient_cases')
      .select('patient_id')
      .eq('case_id', consultation.case_id)
      .maybeSingle();
    const patientId = caseRow?.patient_id;
    if (patientId) {
      emitToUser(patientId, 'consultation:updated', {
        consultationId: consultation.consultation_id,
        status: consultation.status,
      });
    }
  } catch (e) {
    console.warn('Failed to emit consultation update', e?.message || e);
  }
};

router.post('/:consultationId/pause', async (req, res) => {
  try {
    const { consultationId } = req.params;
    if (!consultationId) return res.status(400).json({ error: 'Missing consultationId' });

    const updates = {
      status: 'on_hold',
      on_hold_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('consultations')
      .update(updates)
      .eq('consultation_id', consultationId)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    await emitConsultationUpdate(updated);

    return res.json({ ok: true, consultation: updated });
  } catch (e) {
    console.error('pause consultation error', e);
    return res.status(500).json({ error: e.message });
  }
});

router.post('/:consultationId/summary/complete', async (req, res) => {
  try {
    const { consultationId } = req.params;
    if (!consultationId) return res.status(400).json({ error: 'Missing consultationId' });

    const { data: consultationRow, error: consultationError } = await supabase
      .from('consultations')
      .select('*')
      .eq('consultation_id', consultationId)
      .maybeSingle();
    if (consultationError) throw consultationError;
    if (!consultationRow) return res.status(404).json({ error: 'ไม่พบข้อมูลการปรึกษา' });

    const { data: dischargeSummary, error: dischargeError } = await supabase
      .from('discharge_summaries')
      .select('*')
      .eq('consultation_id', consultationId)
      .maybeSingle();
    if (dischargeError) throw dischargeError;
    if (!dischargeSummary) {
      return res.status(400).json({ error: 'ยังไม่ได้บันทึกสรุปผลและใบสั่งยา' });
    }

    let caseRow = null;
    if (consultationRow.case_id) {
      const { data: caseDataRow, error: caseError } = await supabase
        .from('patient_cases')
        .select('*')
        .eq('case_id', consultationRow.case_id)
        .maybeSingle();
      if (!caseError && caseDataRow) {
        caseRow = caseDataRow;
      }
    }

    let patientRow = null;
    if (consultationRow.patient_id) {
      const { data: patientData, error: patientError } = await supabase
        .from('app_users')
        .select('user_id, display_name, phone')
        .eq('user_id', consultationRow.patient_id)
        .maybeSingle();
      if (!patientError && patientData) {
        patientRow = patientData;
      }
    }

    let doctorRow = null;
    if (consultationRow.doctor_id) {
      const { data: doctorData, error: doctorError } = await supabase
        .from('app_users')
        .select('user_id, display_name, phone')
        .eq('user_id', consultationRow.doctor_id)
        .maybeSingle();
      if (!doctorError && doctorData) {
        doctorRow = doctorData;
      }
    }

    let prescription = null;
    let prescriptionItems = [];
    if (dischargeSummary.prescription_id) {
      const { data: prescriptionRow, error: prescriptionError } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('prescription_id', dischargeSummary.prescription_id)
        .maybeSingle();
      if (prescriptionError) throw prescriptionError;
      prescription = prescriptionRow || null;

      const { data: items, error: itemsError } = await supabase
        .from('prescription_items')
        .select('*')
        .eq('prescription_id', dischargeSummary.prescription_id);
      if (itemsError) throw itemsError;
      prescriptionItems = Array.isArray(items) ? items : [];
    }

    const documentMeta = {
      discharge_summary: dischargeSummary,
      prescription,
      prescription_items: prescriptionItems,
      generated_at: new Date().toISOString(),
    };

    const cleanIdFragment = (value) => {
      if (!value) return 'unknown';
      return String(value).replace(/[^a-zA-Z0-9_-]/g, '');
    };
    const storageFileName = `summary-${cleanIdFragment(dischargeSummary.summary_id || consultationId)}.pdf`;
    const storagePath = `consultation-documents/${consultationId}/summary/${storageFileName}`;

    const enrichedItems = await enrichPrescriptionItems(prescriptionItems);
    documentMeta.prescription_items = enrichedItems;

    const pdfBuffer = await buildSummaryPdf({
      consultationId,
      consultation: consultationRow,
      caseData: caseRow,
      patient: patientRow,
      doctor: doctorRow,
      dischargeSummary,
      prescription,
      items: enrichedItems,
    });

    await ensureBucket(SUMMARY_BUCKET);

    const { error: uploadError } = await supabase.storage
      .from(SUMMARY_BUCKET)
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from(SUMMARY_BUCKET)
      .getPublicUrl(storagePath);
    const publicUrl = publicUrlData?.publicUrl || null;

    documentMeta.storage_bucket = SUMMARY_BUCKET;
    documentMeta.public_url = publicUrl;

    let summaryDocument = null;
    const { data: existingDocument, error: existingDocumentError } = await supabase
      .from('consultation_documents')
      .select('*')
      .eq('consultation_id', consultationId)
      .eq('kind', 'summary_pdf')
      .maybeSingle();
    if (existingDocumentError) throw existingDocumentError;

    if (existingDocument) {
      const updatePayload = {
        meta: documentMeta,
        storage_path: storagePath,
        public_url: publicUrl,
      };
      const { data: updatedDocument, error: updateDocumentError } = await supabase
        .from('consultation_documents')
        .update(updatePayload)
        .eq('document_id', existingDocument.document_id)
        .select('*')
        .maybeSingle();
      if (updateDocumentError) throw updateDocumentError;
      summaryDocument = updatedDocument;
    } else {
      const { data: insertedDocument, error: insertDocumentError } = await supabase
        .from('consultation_documents')
        .insert({
          consultation_id: consultationId,
          kind: 'summary_pdf',
          storage_path: storagePath,
          public_url: publicUrl,
          meta: documentMeta,
        })
        .select('*')
        .maybeSingle();
      if (insertDocumentError) throw insertDocumentError;
      summaryDocument = insertedDocument;
    }

    const updates = {
      status: 'doctor_ready_conclude',
      summary_stage: 'ready',
      summary_ready_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('consultations')
      .update(updates)
      .eq('consultation_id', consultationId)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    await emitConsultationUpdate(updated);

    return res.json({
      ok: true,
      consultation: updated,
      documents: summaryDocument ? { summary_pdf: summaryDocument } : undefined,
    });
  } catch (e) {
    console.error('complete summary error', e);
    return res.status(500).json({ error: e.message });
  }
});

router.post('/:consultationId/awaiting-payment', async (req, res) => {
  try {
    const { consultationId } = req.params;
    if (!consultationId) return res.status(400).json({ error: 'Missing consultationId' });

    const updates = {
      status: 'awaiting_payment',
      awaiting_payment_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('consultations')
      .update(updates)
      .eq('consultation_id', consultationId)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    await emitConsultationUpdate(updated);

    return res.json({ ok: true, consultation: updated });
  } catch (e) {
    console.error('awaiting payment error', e);
    return res.status(500).json({ error: e.message });
  }
});

router.post('/:consultationId/paid', async (req, res) => {
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

    await emitConsultationUpdate(updated);

    return res.json({ ok: true, consultation: updated });
  } catch (e) {
    console.error('mark paid error', e);
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
