/* eslint-env node */
const express = require('express');
const { supabase } = require('../supabase');

const router = express.Router();

const calculateTriageLevel = ({ severity, symptoms_text = '', painLevel }) => {
  const emergencyKeywords = ['chest pain', 'difficulty breathing', 'severe pain', 'bleeding'];
  const lower = (symptoms_text || '').toLowerCase();
  const hasEmergencySymptoms = emergencyKeywords.some((k) => lower.includes(k));
  if (hasEmergencySymptoms || severity === 'severe' || (painLevel || 0) >= 8) return 'urgent';
  if (severity === 'moderate' || severity === 'medium' || (painLevel || 0) >= 5) return 'semi_urgent';
  return 'standard';
};

router.post('/submit', async (req, res) => {
  try {
    const {
      userId,
      symptomsText,
      severity,
      painLevel,
      duration,
      additionalInfo,
      selectedBodyParts,
      selectedFiles, // Expect array of objects with minimal info if doing direct upload is not desired
      selectedSpecialty,
    } = req.body || {};

    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    if (!selectedSpecialty) return res.status(400).json({ error: 'Missing selectedSpecialty' });

    let combinedSymptoms = symptomsText || '';
    if (Array.isArray(selectedBodyParts) && selectedBodyParts.length > 0) {
      const painAreasText = `Pain in: ${selectedBodyParts.join(', ')}`;
      if (!combinedSymptoms.toLowerCase().includes('pain in')) {
        combinedSymptoms += combinedSymptoms ? `\n\n${painAreasText}` : painAreasText;
      }
    }
    if (painLevel) combinedSymptoms += `\nPain Level: ${painLevel}/10`;
    if (duration) combinedSymptoms += `\nDuration: ${duration}`;
    if (additionalInfo) combinedSymptoms += `\n\nAdditional Information: ${additionalInfo}`;

    const payload = {
      symptoms_text: (combinedSymptoms || '').trim(),
      severity: severity || 'medium',
      triage_level: calculateTriageLevel({ severity, symptoms_text: combinedSymptoms, painLevel }),
      status: 'open',
      // attachments: handled on frontend upload or future signed-url flow;
      attachments: Array.isArray(selectedFiles) ? selectedFiles : [],
      patient_id: userId,
      requested_specialty: selectedSpecialty?.name || selectedSpecialty?.name_th || null,
      requested_specialty_id: selectedSpecialty?.id || null,
    };

    const { data, error } = await supabase.from('patient_cases').insert(payload).select();
    if (error) throw error;

    return res.json({ case: data?.[0] || null });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to submit case', error);
    return res.status(500).json({ error: 'Failed to submit case' });
  }
});

// Get a case by caseId
router.get('/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    if (!caseId) return res.status(400).json({ error: 'Missing caseId' });
    const { data, error } = await supabase
      .from('patient_cases')
      .select('*')
      .eq('case_id', caseId)
      .single();
    if (error) throw error;
    return res.json({ case: data });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch case', error);
    return res.status(500).json({ error: 'Failed to fetch case' });
  }
});

module.exports = router;
