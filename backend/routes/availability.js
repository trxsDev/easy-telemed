/* eslint-env node */
const express = require('express');
const { supabase } = require('../supabase');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Load specialization.json from frontend for consistent IDs/names
function loadSpecializations() {
  try {
    const filePath = path.resolve(__dirname, '../../easy-telemed/src/specialization.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to load specialization.json', e);
    return [];
  }
}

const NORMALIZE = (value = '') => value.trim().toLowerCase();

function normalizeSpecialtyList(specialtyValue) {
  if (!specialtyValue) return [];
  if (Array.isArray(specialtyValue)) {
    return specialtyValue
      .filter(Boolean)
      .map((item) => (typeof item === 'string' ? NORMALIZE(item) : item?.name && NORMALIZE(item.name)))
      .filter(Boolean);
  }
  if (typeof specialtyValue === 'string') {
    const trimmedValue = specialtyValue.trim();
    if ((trimmedValue.startsWith('{') && trimmedValue.endsWith('}'))) {
      const inner = trimmedValue.slice(1, -1);
      return inner
        .split(',')
        .map((item) => item.replace(/^[[\]"']|[[\]"']$/g, ''))
        .map(NORMALIZE)
        .filter(Boolean);
    }
    // attempt JSON
    try {
      const parsed = JSON.parse(trimmedValue);
      if (Array.isArray(parsed)) {
        return parsed.map((it) => (typeof it === 'string' ? NORMALIZE(it) : it?.name && NORMALIZE(it.name))).filter(Boolean);
      }
    } catch (_) {}
    return [NORMALIZE(trimmedValue)];
  }
  return [];
}

router.get('/specialty-availability', async (req, res) => {
  try {
    const specializations = loadSpecializations();
    const SPEC_BY_NAME = specializations.reduce((acc, spec) => {
      acc[spec.name.toLowerCase()] = spec;
      if (spec.name_th) acc[spec.name_th.toLowerCase()] = spec;
      return acc;
    }, {});
    const SPECIALTY_BY_ID = new Map(specializations.map((s) => [s.id, s]));

    const parseSpecialtiesToSpecs = (value) => {
      const specs = [];

      const pushByName = (name) => {
        const found = SPEC_BY_NAME[NORMALIZE(String(name))];
        if (found) specs.push(found);
      };
      const pushById = (id) => {
        const num = typeof id === 'string' ? Number(id) : id;
        if (Number.isFinite(num) && SPECIALTY_BY_ID.has(num)) {
          specs.push(SPECIALTY_BY_ID.get(num));
        }
      };

      const handleItem = (item) => {
        if (item == null) return;
        if (typeof item === 'number') return pushById(item);
        if (typeof item === 'string') {
          const trimmed = item.trim();
          if (!trimmed) return;
          // JSON array/object
          if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
            try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) return parsed.forEach(handleItem);
              if (parsed && typeof parsed === 'object') {
                if (parsed.id != null) return pushById(parsed.id);
                if (parsed.name) return pushByName(parsed.name);
              }
            } catch (_) {
              // fall through
            }
          }
          // Postgres array {a,b,c}
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            const inner = trimmed.slice(1, -1);
            inner.split(',').map((v) => v.replace(/^\s*["']?|["']?\s*$/g, '')).forEach(handleItem);
            return;
          }
          // numeric string id
          if (/^\d+$/.test(trimmed)) return pushById(Number(trimmed));
          return pushByName(trimmed);
        }
        if (typeof item === 'object') {
          if (item.id != null) return pushById(item.id);
          if (item.name) return pushByName(item.name);
        }
      };

      if (Array.isArray(value)) {
        value.forEach(handleItem);
      } else {
        handleItem(value);
      }

      // dedupe by id
      const seen = new Set();
      return specs.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
    };

    const { data: statusData, error: statusError } = await supabase
      .from('doctor_status')
      .select('doctor_id, is_active, last_seen_at, updated_at')
      .eq('is_active', true);
    console.log("cona")
    console.log("re :",statusData)
      if (statusError) {
      console.error('[availability] doctor_status query failed:', statusError);
      return res.status(500).json({ error: 'doctor_status query failed', details: statusError.message });
    }
    if (!statusData?.length) return res.json({ doctors: [], stats: {} });

    const ids = statusData.map((s) => s.doctor_id);
    const [{ data: providerData, error: providerError }, { data: userData, error: userError }] = await Promise.all([
      supabase
        .from('provider_applications')
        .select('applicant_user_id, specialties, hospital, license_no, full_name, status, role_requested, decided_at, updated_at')
        .in('applicant_user_id', ids)
        .eq('role_requested', 'doctor')
        .eq('status', 'approved'),
      supabase.from('app_users').select('user_id, display_name,  role').in('user_id', ids),
    ]);
    if (providerError) {
      console.error('[availability] provider_applications query failed:', providerError);
      return res.status(500).json({ error: 'provider_applications query failed', details: providerError.message });
    }
    if (userError) {
      console.error('[availability] app_users query failed:', userError);
      return res.status(500).json({ error: 'app_users query failed', details: userError.message });
    }

    // If multiple approved applications exist, pick the latest by decided_at or updated_at
    const profilesById = new Map();
    (providerData || []).forEach((p) => {
      const key = p.applicant_user_id;
      const existing = profilesById.get(key);
      if (!existing) {
        profilesById.set(key, p);
      } else {
        const a = new Date(p.decided_at || p.updated_at || 0).getTime();
        const b = new Date(existing.decided_at || existing.updated_at || 0).getTime();
        if (a >= b) profilesById.set(key, p);
      }
    });
    const usersById = new Map((userData || []).map((u) => [u.user_id, u]));

    const debugMode = String(req.query.debug || '').toLowerCase() === '1';
    const doctors = statusData
      .map((status) => {
        const profile = profilesById.get(status.doctor_id);
        const user = usersById.get(status.doctor_id);
        if (!profile || !user) return null;
        const specialtyRefs = parseSpecialtiesToSpecs(profile.specialties);
        if (debugMode) {
          console.log('[availability] doctor', status.doctor_id, 'specialties parsed ->', specialtyRefs.map(s=>s.id));
        }
        return {
          id: status.doctor_id,
          displayName: user.display_name || profile.full_name || 'Unnamed Doctor',
          isActive: status.is_active,
          lastSeenAt: status.last_seen_at || status.updated_at,
          hospital: profile.hospital || null,
          licenseNo: profile.license_no || null,
          specialties: specialtyRefs,
          rawSpecialties: profile.specialties,
        };
      })
      .filter(Boolean);

    const stats = specializations.reduce((acc, spec) => {
      acc[spec.id] = { specialty: spec, activeCount: 0, doctors: [] };
      return acc;
    }, {});

    doctors.forEach((doc) => {
      doc.specialties.forEach((spec) => {
        const bucket = stats[spec.id];
        if (bucket) {
          bucket.activeCount += 1;
          bucket.doctors.push({ id: doc.id, displayName: doc.displayName, lastSeenAt: doc.lastSeenAt });
        }
      });
    });

    // console.log(`[availability] Found ${doctors.length} active doctors across ${Object.keys(stats).length} specialties`);

    return res.json({ doctors, stats });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch specialty availability', error);
    return res.status(500).json({ error: 'Failed to fetch specialty availability' });
  }
});

module.exports = router;
