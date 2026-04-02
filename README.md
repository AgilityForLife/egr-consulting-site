# EGR Consulting Website
**Owner:** Erick G. Rosa, PMP, PMI-ACP, SPC6
**Business:** EGR Consulting — PM · Agile · Training
**Built:** Pure HTML / CSS / JS — no framework, deployable anywhere

---

## 🚀 Deployment

### Option 1 — Netlify (Recommended, Free)
1. Go to [netlify.com](https://netlify.com) and sign up
2. Drag and drop the `consulting-website/` folder onto the Netlify dashboard
3. Done — you'll get a free `.netlify.app` subdomain instantly
4. Add your custom domain in Site Settings → Domain Management

### Option 2 — Vercel
1. Go to [vercel.com](https://vercel.com) and sign up
2. Install Vercel CLI: `npm i -g vercel`
3. Run `vercel` from inside the `consulting-website/` directory
4. Follow prompts to deploy

### Option 3 — GitHub Pages
1. Push the `consulting-website/` folder to a GitHub repo
2. Go to Settings → Pages → Deploy from branch → `main` → `/root`
3. Add a custom domain in Settings → Pages → Custom domain

### Option 4 — Traditional Web Host (GoDaddy, Bluehost, etc.)
1. Upload all files via FTP/cPanel File Manager to the `public_html/` folder
2. Ensure `index.html` is in the root

---

## 🔧 Placeholder Swap Guide

Before going live, replace all placeholder values:

### 1. Google Analytics 4 (GA4)
- **File:** All 8 HTML files (in `<head>`)
- **Find:** `G-XXXXXXXXXX`
- **Replace with:** Your GA4 Measurement ID (format: `G-ABC123XYZ`)
- **Get it at:** https://analytics.google.com → Admin → Data Streams → Web Stream

### 2. Google Tag Manager (GTM)
- **File:** All 8 HTML files (in `<head>` and `<body>` noscript)
- **Find:** `GTM-XXXXXXX`
- **Replace with:** Your GTM Container ID (format: `GTM-XXXXXX`)
- **Get it at:** https://tagmanager.google.com → Create Account → Web

### 3. Meta (Facebook) Pixel
- **File:** All 8 HTML files (in `<head>`)
- **Find:** `XXXXXXXXXXXXXXXX` (in the fbq('init', ...) call)
- **Replace with:** Your 16-digit Meta Pixel ID
- **Get it at:** https://business.facebook.com → Events Manager → Add Pixel

### 4. Calendly Scheduling Link
- **File:** `js/main.js` (line ~80) and `book.html` (comment near bottom)
- **Find:** `YOUR_CALENDLY_URL_HERE`
- **Replace with:** Your Calendly URL (e.g., `https://calendly.com/ericgrosa/30min`)
- **Get it at:** https://calendly.com → + New Event Type → 30 min → Copy Link

### 5. Formspree — Intake Form (Book a Call)
- **File:** `book.html` (form action attribute)
- **Find:** `https://formspree.io/f/YOUR_FORM_ID`
- **Replace with:** Your Formspree endpoint
- **Get it at:** https://formspree.io → + New Form → Copy form action URL

### 6. Formspree — Contact Form
- **File:** `contact.html` (form action attribute)
- **Find:** `https://formspree.io/f/YOUR_CONTACT_FORM_ID`
- **Replace with:** A second Formspree endpoint (create a separate form for contact)

### 7. Domain / URL References
- **File:** `sitemap.xml`, `robots.txt`
- **Find:** `https://egrconsulting.com`
- **Replace with:** Your actual domain (e.g., `https://www.egrconsulting.com`)

---

## 📸 Adding Your Headshot

1. Save your professional photo as `assets/erick-rosa.jpg`
   (Recommended: 600×700px, JPEG, ≤ 200KB)
2. In `about.html`, find the `bio-photo-placeholder` div and replace it with:
   ```html
   <img src="assets/erick-rosa.jpg" alt="Erick G. Rosa, PMP, SPC6" loading="lazy" />
   ```

### OG Image (Social Share Preview)
1. Create a 1200×630px image (your logo + tagline on navy background)
2. Save as `assets/og-image.png`
3. All pages already reference `assets/og-image.png` in their `<head>`

---

## ✅ Pre-Launch Checklist

- [ ] Swap GA4 Measurement ID (`G-XXXXXXXXXX`)
- [ ] Swap GTM Container ID (`GTM-XXXXXXX`)
- [ ] Swap Meta Pixel ID (`XXXXXXXXXXXXXXXX`)
- [ ] Set Calendly URL in `js/main.js` and uncomment in `book.html`
- [ ] Create Formspree intake form and paste endpoint in `book.html`
- [ ] Create Formspree contact form and paste endpoint in `contact.html`
- [ ] Add professional headshot to `assets/erick-rosa.jpg`
- [ ] Create OG image and save as `assets/og-image.png`
- [ ] Update `sitemap.xml` and `robots.txt` with your real domain
- [ ] Replace placeholder testimonials in `index.html` with real client quotes
- [ ] Test all forms (submit → confirm redirect to `thankyou.html`)
- [ ] Test on mobile (iPhone Safari, Android Chrome)
- [ ] Submit sitemap to Google Search Console

---

## 📂 File Structure

```
consulting-website/
├── index.html          ← Home Page
├── about.html          ← About Erick
├── services.html       ← Three Ways to Work Together
├── training.html       ← Certification Courses
├── consulting.html     ← PM & Agile Consulting
├── book.html           ← Book a Call (primary CTA)
├── contact.html        ← Contact Form
├── thankyou.html       ← Post-form confirmation
├── css/
│   └── style.css       ← Full design system & all styles
├── js/
│   └── main.js         ← Nav, forms, analytics, Calendly
├── assets/             ← Add erick-rosa.jpg + og-image.png here
├── sitemap.xml
├── robots.txt
└── README.md
```

---

## 🎨 Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--navy` | `#0A2540` | Primary brand color, nav, headings |
| `--teal` | `#00A878` | Accent, CTAs, highlights |
| `--bg` | `#F4F7FB` | Section backgrounds |
| `--text` | `#1A1A2E` | Body text |
| Font | Inter + DM Sans | Google Fonts (loaded in each page) |

---

## 📞 Contact

**Erick G. Rosa**
📧 ErickRosa01@gmail.com
📞 347-754-4463
🔗 linkedin.com/in/erickgrosa
🏅 credly.com/users/erick-rosa
📍 West Orange / Jersey City, NJ
ervices by Erick G. Rosa.
