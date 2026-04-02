// api/submit-intake.js
// Vercel Serverless Function - receives EGR Consulting intake form data
// and creates/updates a contact in HubSpot via the Contacts API v3.
// Requires env var: HUBSPOT_TOKEN (HubSpot Private App access token)

const HS_API = 'https://api.hubapi.com';

export default async function handler(req, res) {
  // CORS headers so book.html can POST from the browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.HUBSPOT_TOKEN;
  if (!token) return res.status(500).json({ error: 'Server misconfiguration: missing HUBSPOT_TOKEN' });

  const body = req.body || {};

  // Split full name into firstname / lastname
  const fullName  = (body.name || '').trim();
  const spaceIdx  = fullName.indexOf(' ');
  const firstName = spaceIdx >= 0 ? fullName.substring(0, spaceIdx) : fullName;
  const lastName  = spaceIdx >= 0 ? fullName.substring(spaceIdx + 1) : '';

  // Build HubSpot contact properties object (only include non-empty values)
  const allProps = {
    email:                      body.email          || '',
    firstname:                  firstName,
    lastname:                   lastName,
    phone:                      body.phone          || '',
    company:                    body.company        || '',
    jobtitle:                   body.role           || '',
    primary_need:               body.primary_need   || '',
    agile_maturity_level:       body.agile_maturity || '',
    team__org_size:             body.org_size       || '',
    n90day_goal:                body.goal_90        || '',
    how_did_they_hear_about_us: body.referral_source|| '',
  };
  const properties = Object.fromEntries(
    Object.entries(allProps).filter(([, v]) => v.trim && v.trim() !== '')
  );

  if (!properties.email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  };

  try {
    // Try to create contact first
    let hsRes = await fetch(`${HS_API}/crm/v3/objects/contacts`, {
      method:  'POST',
      headers,
      body: JSON.stringify({ properties }),
    });

    // 409 = contact already exists — update instead
    if (hsRes.status === 409) {
      const conflict = await hsRes.json();
      // Extract existing contact ID from error message or search by email
      const searchRes = await fetch(`${HS_API}/crm/v3/objects/contacts/search`, {
        method:  'POST',
        headers,
        body: JSON.stringify({
          filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: properties.email }] }],
          properties: ['email'],
          limit: 1,
        }),
      });
      const searchData = await searchRes.json();
      const contactId  = searchData.results && searchData.results[0] && searchData.results[0].id;

      if (contactId) {
        hsRes = await fetch(`${HS_API}/crm/v3/objects/contacts/${contactId}`, {
          method:  'PATCH',
          headers,
          body: JSON.stringify({ properties }),
        });
      }
    }

    if (!hsRes.ok) {
      const err = await hsRes.text();
      console.error('HubSpot error:', err);
      return res.status(500).json({ error: 'HubSpot API error', detail: err });
    }

    const contact = await hsRes.json();
    return res.status(200).json({ ok: true, id: contact.id });

  } catch (err) {
    console.error('submit-intake error:', err);
    return res.status(500).json({ error: err.message });
  }
}
