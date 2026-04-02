// api/calendly-webhook.js
// Vercel Serverless Function — receives Calendly booking events
// and upserts the invitee as a HubSpot contact via the Forms API.
//
// Calendly fires: POST /api/calendly-webhook
// Payload type handled: invitee.created
//
// No HubSpot API key required — uses the public Forms submission endpoint.

const PORTAL_ID  = '245764803';
const FORM_GUID  = '317f6811-5a01-4443-8770-42f2d739c806';
const HS_ENDPOINT = `https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}/${FORM_GUID}`;

// Optional: verify the Calendly webhook signature so only real Calendly
// events are accepted.  Set CALENDLY_WEBHOOK_SECRET in Vercel env vars.
// If not set, signature verification is skipped (acceptable for low-risk MVP).
async function verifySignature(req, body) {
  const secret = process.env.CALENDLY_WEBHOOK_SECRET;
  if (!secret) return true; // skip verification if secret not configured

  const crypto = await import('crypto');
  const sigHeader = req.headers['calendly-webhook-signature'] || '';
  const [, ts, sig] = sigHeader.match(/t=(\d+),v1=([a-f0-9]+)/) || [];
  if (!ts || !sig) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${ts}.${body}`)
    .digest('hex');

  return expected === sig;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse body (Vercel provides it as an object for JSON content-type)
  const raw = JSON.stringify(req.body);

  // Signature check
  const valid = await verifySignature(req, raw);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;

  // Only process booking creation events
  if (event.event !== 'invitee.created') {
    return res.status(200).json({ ok: true, skipped: event.event });
  }

  const payload = event.payload || {};
  const invitee  = payload.invitee || {};
  const tracking = payload.tracking || {};

  // Split name into first / last
  const fullName  = (invitee.name || '').trim();
  const spaceIdx  = fullName.indexOf(' ');
  const firstName = spaceIdx >= 0 ? fullName.substring(0, spaceIdx) : fullName;
  const lastName  = spaceIdx >= 0 ? fullName.substring(spaceIdx + 1) : '';

  // Map UTM source → how_did_they_hear_about_us (best-effort)
  const utmSourceMap = {
    linkedin: 'linkedin',
    google:   'google_search',
    referral: 'referral',
  };
  const utmSource = (tracking.utm_source || '').toLowerCase();
  const referralValue = utmSourceMap[utmSource] || '';

  // Build HubSpot fields — only include non-empty values
  const rawFields = [
    { name: 'email',                      value: invitee.email   || '' },
    { name: 'firstname',                  value: firstName               },
    { name: 'lastname',                   value: lastName                },
    { name: 'how_did_they_hear_about_us', value: referralValue           },
  ];
  const fields = rawFields.filter(f => f.value.trim() !== '');

  // Submit to HubSpot Forms API
  const hsRes = await fetch(HS_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields,
      context: {
        pageUri:  'https://calendly.com/erickgrosa/30min',
        pageName: 'EGR Consulting — 30 Minute Meeting (Calendly)',
      },
    }),
  });

  if (!hsRes.ok) {
    const err = await hsRes.text();
    console.error('HubSpot error:', err);
    return res.status(500).json({ error: 'HubSpot submission failed', detail: err });
  }

  return res.status(200).json({ ok: true, contact: invitee.email });
}
