/* eslint-env node */
const express = require('express');
const PDFDocument = require('pdfkit');
const stream = require('stream');
const { supabase } = require('../supabase');
const { emitToUser } = require('../socket');

const router = express.Router();

const CONSULTATION_DOC_BUCKET = process.env.CONSULTATION_DOCUMENT_BUCKET || 'consultation-documents';

async function emitToParticipants(consultation) {
  if (!consultation?.case_id) return;
  const { data: caseRow } = await supabase
    .from('patient_cases')
    .select('patient_id')
    .eq('case_id', consultation.case_id)
    .maybeSingle();
  const patientId = caseRow?.patient_id;
  if (patientId) {
    try {
      emitToUser(patientId, 'consultation:updated', {
        consultationId: consultation.consultation_id,
        status: consultation.status,
      });
    } catch (_) {}
  }
  if (consultation.doctor_id) {
    try {
      emitToUser(consultation.doctor_id, 'consultation:updated', {
        consultationId: consultation.consultation_id,
        status: consultation.status,
      });
    } catch (_) {}
  }
}

async function generateSummaryPdf(consultationId) {
  const { data: consultation } = await supabase
    .from('consultations')
    .select('*')
    .eq('consultation_id', consultationId)
    .maybeSingle();
  if (!consultation) {
    throw new Error('Consultation not found');
  }

  const { data: summary } = await supabase
    .from('discharge_summaries')
    .select('*')
    .eq('consultation_id', consultationId)
    .maybeSingle();

  const { data: prescription } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('consultation_id', consultationId)
    .maybeSingle();

  let prescriptionItems = [];
  if (prescription) {
    const { data: items } = await supabase
      .from('prescription_items')
      .select('*, drug_catalog(name, strength, form, unit)')
      .eq('prescription_id', prescription.prescription_id);
    prescriptionItems = items || [];
  }

  const doc = new PDFDocument();
  const bufferStream = new stream.PassThrough();
  const chunks = [];

  doc.pipe(bufferStream);
  bufferStream.on('data', (chunk) => chunks.push(chunk));

  doc.fontSize(18).text('Telemed Consultation Summary', { align: 'center' }).moveDown();
  doc.fontSize(12);
  doc.text(`Consultation ID: ${consultationId}`);
  doc.text(`Status: ${consultation.status}`);
  if (consultation.started_at) doc.text(`Started At: ${consultation.started_at}`);
  if (summary?.issued_at) doc.text(`Summary Issued: ${summary.issued_at}`);
  doc.moveDown();

  if (summary) {
    doc.fontSize(14).text('Diagnosis', { underline: true });
    doc.fontSize(12).text(summary.diagnosis || 'N/A').moveDown();

    doc.fontSize(14).text('Plan', { underline: true });
    doc.fontSize(12).text(summary.plan || 'N/A').moveDown();

    doc.fontSize(14).text('Advice', { underline: true });
    doc.fontSize(12).text(summary.advice || 'N/A').moveDown();
  } else {
    doc.text('No discharge summary recorded.');
  }

  if (prescription) {
    doc.fontSize(14).text('Prescription', { underline: true });
    doc.fontSize(12).text(`Issued By: ${prescription.issued_by || '-'}`);
    doc.text(`Issued At: ${prescription.issued_at || '-'}`);
    if (prescription.note) doc.text(`Note: ${prescription.note}`);
    doc.moveDown();

    if (prescriptionItems.length > 0) {
      prescriptionItems.forEach((item, idx) => {
        const drug = item.drug_catalog || {};
        doc.fontSize(12).text(
          `${idx + 1}. ${drug.name || '-'} ${drug.strength || ''} ${drug.form || ''}`
        );
        if (item.dose) doc.text(`   Dose: ${item.dose}`);
        if (item.route) doc.text(`   Route: ${item.route}`);
        if (item.frequency) doc.text(`   Frequency: ${item.frequency}`);
        if (item.duration) doc.text(`   Duration: ${item.duration}`);
        if (item.quantity) doc.text(`   Quantity: ${item.quantity}`);
        if (item.instruction) doc.text(`   Instruction: ${item.instruction}`);
      });
    } else {
      doc.text('No prescription items recorded.');
    }
  }

  doc.end();

  await new Promise((resolve, reject) => {
    bufferStream.on('end', resolve);
    bufferStream.on('error', reject);
  });

  const pdfBuffer = Buffer.concat(chunks);

  const fileName = `summary-${consultationId}-${Date.now()}.pdf`;
  const storagePath = `${consultationId}/${fileName}`;

  const uploadRes = await supabase.storage
    .from(CONSULTATION_DOC_BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadRes.error) {
    throw uploadRes.error;
  }

  const { data: publicUrlData } = supabase.storage
    .from(CONSULTATION_DOC_BUCKET)
    .getPublicUrl(storagePath);

  await supabase
    .from('consultation_documents')
    .upsert({
      consultation_id: consultationId,
      kind: 'summary_pdf',
      storage_path: storagePath,
      public_url: publicUrlData?.publicUrl || null,
    });

  return {
    storage_path: storagePath,
    public_url: publicUrlData?.publicUrl || null,
  };
}

// Mark consultation as started and store Twilio room SID
router.post('/:consultationId/start', async (req, res) => {
  const { consultationId } = req.params;
  const { room_id } = req.body || {};
  if (!consultationId) return res.status(400).json({ error: 'Missing consultationId' });

  try {
    // Base updates that we know exist in schema
    const updatesBase = { status: 'doctor_in_room', started_at: new Date().toISOString() };
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

// Move consultation to on-hold (patient waiting while doctor summarizes)
router.post('/:consultationId/on-hold', async (req, res) => {
  try {
    const { consultationId } = req.params;
    if (!consultationId) return res.status(400).json({ error: 'Missing consultationId' });

    const updates = {
      status: 'on_hold',
      summary_stage: 'preparing',
      on_hold_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('consultations')
      .update(updates)
      .eq('consultation_id', consultationId)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    await emitToParticipants(updated);
    return res.json({ ok: true, consultation: updated });
  } catch (e) {
    console.error('on-hold consultation error', e);
    return res.status(500).json({ error: e.message });
  }
});

// Progress to summarizing step (doctor will call patient to deliver summary)
router.post('/:consultationId/summarize', async (req, res) => {
  try {
    const { consultationId } = req.params;
    if (!consultationId) return res.status(400).json({ error: 'Missing consultationId' });
    // Schema allows 'summarizing' -> persist to DB
    const { data: updated, error } = await supabase
      .from('consultations')
      .update({ status: 'doctor_ready_conclude' })
      .eq('consultation_id', consultationId)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    await emitToParticipants(updated);
    return res.json({ ok: true, consultation: updated, clientPhase: 'summarizing' });
  } catch (e) {
    console.error('summarize consultation error', e);
    return res.status(500).json({ error: e.message });
  }
});

// Complete summary presentation, generate documents, return pdf links
router.post('/:consultationId/complete-summary', async (req, res) => {
  const { consultationId } = req.params;
  if (!consultationId) return res.status(400).json({ error: 'Missing consultationId' });

  try {

    let summaryDocument = null;
    try {
      summaryDocument = await generateSummaryPdf(consultationId);
    } catch (pdfErr) {
      console.error('generate summary pdf failed', pdfErr);
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from('consultations')
      .update({
        summary_stage: 'ready',
      summary_ready_at: nowIso,
    })
      .eq('consultation_id', consultationId)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    await emitToParticipants(updated);

    const payload = {
      ok: true,
      consultation: updated,
    };
    if (summaryDocument) {
      payload.documents = { summary_pdf: summaryDocument };
    } else {
      payload.warnings = ['Failed to generate summary PDF; please verify storage configuration or Supabase bucket.'];
    }

    return res.json(payload);
  } catch (e) {
    console.error('complete summary error', e);
    try {
      const { data: cancelledRow, error: cancelError } = await supabase
        .from('consultations')
        .update({ status: 'cancel_by_error' })
        .eq('consultation_id', consultationId)
        .select('*')
        .maybeSingle();
      if (cancelError) throw cancelError;
      if (cancelledRow) {
        await emitToParticipants(cancelledRow);
      }
    } catch (updateErr) {
      console.error('failed to mark consultation as cancel_by_error', updateErr);
    }
    return res.status(500).json({ error: e.message });
  }
});

// Move consultation to awaiting payment
router.post('/:consultationId/awaiting-payment', async (req, res) => {
  try {
    const { consultationId } = req.params;
    if (!consultationId) return res.status(400).json({ error: 'Missing consultationId' });

    const updates = {
      status: 'awaiting_payment',
      awaiting_payment_at: new Date().toISOString(),
      summary_stage: 'delivered',
      summary_delivered_at: new Date().toISOString(),
      summary_presented_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('consultations')
      .update(updates)
      .eq('consultation_id', consultationId)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    await emitToParticipants(updated);

    return res.json({ ok: true, consultation: updated });
  } catch (e) {
    console.error('awaiting payment error', e);
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

    await emitToParticipants(updated);

    return res.json({ ok: true, consultation: updated });
  } catch (e) {
    console.error('end consultation error', e);
    return res.status(500).json({ error: e.message });
  }
});

// Mark payment completed (manual flow)
router.post('/:consultationId/mark-paid', async (req, res) => {
  try {
    const { consultationId } = req.params;
    if (!consultationId) return res.status(400).json({ error: 'Missing consultationId' });
    const { amount, currency, note } = req.body || {};

    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('consultation_id', consultationId)
      .maybeSingle();

    const paymentPayload = {
      consultation_id: consultationId,
      status: 'paid',
      manual_paid_at: new Date().toISOString(),
      payment_notes: note || existingPayment?.payment_notes || null,
      amount: amount ?? existingPayment?.amount ?? 0,
      currency: currency || existingPayment?.currency || 'THB',
      method: existingPayment?.method || null,
      provider_ref: existingPayment?.provider_ref || null,
    };

    const { error: paymentError } = await supabase
      .from('payments')
      .upsert(paymentPayload, { onConflict: 'consultation_id' });
    if (paymentError) throw paymentError;

    const { data: updatedConsultation, error: consultationError } = await supabase
      .from('consultations')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('consultation_id', consultationId)
      .select('*')
      .maybeSingle();
    if (consultationError) throw consultationError;

    await emitToParticipants(updatedConsultation);

    return res.json({ ok: true, consultation: updatedConsultation });
  } catch (e) {
    console.error('mark paid error', e);
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
