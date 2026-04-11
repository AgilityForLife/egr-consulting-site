#!/usr/bin/env node
/**
 * ============================================================
 *  EGR Consulting — Monthly Insights Content Generator
 * ============================================================
 *
 *  Generates new thought-leadership article pages and updates
 *  the insights hub (insights.html) and sitemap.xml automatically.
 *
 *  USAGE
 *  ─────
 *  1. Set your Anthropic API key:
 *       export ANTHROPIC_API_KEY=sk-ant-...
 *
 *  2. Run the generator:
 *       node scripts/generate-insights.js
 *
 *     Options:
 *       --count <n>     Number of articles to generate (default: 3)
 *       --dry-run       Preview topics without writing files
 *       --category <c>  Focus on a specific category
 *
 *  3. Review the generated files, then commit & push:
 *       git add insights/ insights.html sitemap.xml
 *       git commit -m "Add monthly insights — $(date +%B\ %Y)"
 *       git push
 *
 *  SCHEDULING (cron / GitHub Actions)
 *  ───────────────────────────────────
 *  Run on the 1st of every month:
 *    0 9 1 * * cd /path/to/egr-consulting-site && node scripts/generate-insights.js
 *
 *  Or use the included GitHub Actions workflow:
 *    .github/workflows/monthly-insights.yml
 *
 * ============================================================
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ── Configuration ──────────────────────────────────────────
const CONFIG = {
  siteUrl:       'https://egrconsultingservices.com',
  insightsDir:   path.resolve(__dirname, '..', 'insights'),
  hubPage:       path.resolve(__dirname, '..', 'insights.html'),
  sitemapPath:   path.resolve(__dirname, '..', 'sitemap.xml'),
  articlesCount: 3,
  anthropicModel: 'claude-sonnet-4-20250514',
  categories: [
    { name: 'Project Management', slug: 'pm',         color: '#0A2540', bg: 'rgba(10,37,64,.08)' },
    { name: 'Agile & SAFe',      slug: 'agile-safe',  color: '#1a5276', bg: 'rgba(26,82,118,.08)' },
    { name: 'AI & Technology',    slug: 'ai-tech',     color: '#00A878', bg: 'rgba(0,168,120,.08)' },
    { name: 'Analytics',          slug: 'analytics',   color: '#6C3483', bg: 'rgba(108,52,131,.08)' },
    { name: 'Talent Strategy',    slug: 'talent',      color: '#E67E22', bg: 'rgba(230,126,34,.08)' },
  ],
  servicePages: {
    'Project Management': ['consulting.html', 'training.html'],
    'Agile & SAFe':       ['training.html', 'services.html'],
    'AI & Technology':    ['services.html', 'consulting.html'],
    'Analytics':          ['training.html', 'classes.html'],
    'Talent Strategy':    ['services.html', 'consulting.html'],
  },
  keywords: {
    'Project Management': ['PMP', 'project management', 'PMO', 'risk management', 'schedule management', 'stakeholder engagement'],
    'Agile & SAFe':       ['SAFe', 'agile transformation', 'scrum', 'PI Planning', 'ART', 'lean portfolio management'],
    'AI & Technology':    ['generative AI', 'machine learning', 'AI governance', 'prompt engineering', 'AI integration'],
    'Analytics':          ['Power BI', 'data analytics', 'business intelligence', 'dashboard', 'KPI', 'data visualization'],
    'Talent Strategy':    ['staff augmentation', 'talent acquisition', 'hybrid workforce', 'consulting teams', 'capability building'],
  }
};

// ── Arg Parsing ────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun     = args.includes('--dry-run');
const countIdx   = args.indexOf('--count');
const catIdx     = args.indexOf('--category');
const articleCount = countIdx !== -1 ? parseInt(args[countIdx + 1], 10) : CONFIG.articlesCount;
const focusCategory = catIdx !== -1 ? args[catIdx + 1] : null;

// ── Anthropic API Call ─────────────────────────────────────
function callAnthropic(prompt, maxTokens = 4096) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      reject(new Error('ANTHROPIC_API_KEY environment variable is required.\n  export ANTHROPIC_API_KEY=sk-ant-...'));
      return;
    }

    const body = JSON.stringify({
      model: CONFIG.anthropicModel,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) reject(new Error(json.error.message));
          else resolve(json.content[0].text);
        } catch (e) {
          reject(new Error(`API parse error: ${e.message}\nResponse: ${data.slice(0, 500)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Slug Generator ─────────────────────────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

// ── Date Helpers ───────────────────────────────────────────
function getPublishDate() {
  const d = new Date();
  return {
    iso: d.toISOString().split('T')[0],
    display: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    full: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  };
}

// ── Step 1: Generate Topics ────────────────────────────────
async function generateTopics(count) {
  const categories = focusCategory
    ? CONFIG.categories.filter(c => c.name.toLowerCase().includes(focusCategory.toLowerCase()))
    : CONFIG.categories;

  const catNames = categories.map(c => c.name).join(', ');
  const existingArticles = fs.existsSync(CONFIG.insightsDir)
    ? fs.readdirSync(CONFIG.insightsDir).filter(f => f.endsWith('.html')).map(f => f.replace('.html', ''))
    : [];

  const prompt = `You are a content strategist for EGR Consulting, a PMP & SPC6 certified project management consulting firm.

Generate ${count} trending thought-leadership article topics for their website's Insights section.

Categories to choose from: ${catNames}

Existing articles (avoid duplicating): ${existingArticles.join(', ') || 'none yet'}

Keywords to target: ${JSON.stringify(CONFIG.keywords)}

For each article, return a JSON array with objects containing:
- "title": compelling headline (50-70 chars)
- "category": one of [${catNames}]
- "slug": URL-friendly slug
- "excerpt": 1-2 sentence teaser (120-160 chars)
- "keywords": array of 3-5 SEO keywords
- "readTime": estimated read time (e.g., "7 min read")
- "metaDescription": SEO meta description (150-160 chars)
- "sections": array of 4-5 section objects with "heading" and "brief" (1-sentence description)

Return ONLY the JSON array, no markdown fencing.`;

  console.log('🔍 Generating article topics...');
  const response = await callAnthropic(prompt);

  try {
    // Strip any markdown code fencing if present
    const cleaned = response.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse topics JSON:', e.message);
    console.error('Raw response:', response.slice(0, 500));
    process.exit(1);
  }
}

// ── Step 2: Generate Article Content ───────────────────────
async function generateArticleContent(topic) {
  const date = getPublishDate();
  const category = CONFIG.categories.find(c => c.name === topic.category) || CONFIG.categories[0];
  const relatedServices = CONFIG.servicePages[topic.category] || ['services.html', 'consulting.html'];

  const prompt = `Write a complete thought-leadership article for EGR Consulting's website.

ARTICLE DETAILS:
- Title: ${topic.title}
- Category: ${topic.category}
- Target keywords: ${topic.keywords.join(', ')}
- Sections: ${JSON.stringify(topic.sections)}

REQUIREMENTS:
- Write 1500-2000 words of substantive, expert-level content
- Use the section headings provided
- Include specific data points, statistics, and examples where relevant
- Write from EGR Consulting's perspective as certified PMP & SPC6 consultants
- Reference real frameworks, tools, and methodologies
- Include 2-3 pull quotes (mark with [PULLQUOTE]...[/PULLQUOTE])
- Include 1-2 data callouts (mark with [DATACALLOUT stat="..." label="..."/])
- End with a practical "Getting Started" or actionable takeaway section
- Do NOT use markdown formatting — return plain text with section headings marked as [H2]...[/H2]
- Paragraphs separated by blank lines

Return ONLY the article body text.`;

  console.log(`  ✍️  Writing: "${topic.title}"...`);
  return await callAnthropic(prompt, 6000);
}

// ── Step 3: Build Article HTML ─────────────────────────────
function buildArticleHTML(topic, content, date) {
  const category = CONFIG.categories.find(c => c.name === topic.category) || CONFIG.categories[0];
  const relatedServices = CONFIG.servicePages[topic.category] || ['services.html', 'consulting.html'];

  // Parse content into structured HTML
  let htmlContent = content
    .replace(/\[H2\](.*?)\[\/H2\]/g, '</p>\n<h2>$1</h2>\n<p>')
    .replace(/\[PULLQUOTE\](.*?)\[\/PULLQUOTE\]/gs, '</p>\n<blockquote class="pull-quote"><p>$1</p></blockquote>\n<p>')
    .replace(/\[DATACALLOUT stat="(.*?)" label="(.*?)"\/\]/g,
      '</p>\n<div class="data-callout"><div class="data-callout-stat">$1</div><div class="data-callout-label">$2</div></div>\n<p>')
    .replace(/\n\n/g, '</p>\n<p>')
    .replace(/<p><\/p>/g, '');

  // Wrap in opening/closing p tags
  if (!htmlContent.startsWith('<')) htmlContent = '<p>' + htmlContent;
  if (!htmlContent.endsWith('>')) htmlContent += '</p>';

  // Get other articles for "More Insights" section
  const otherArticles = fs.existsSync(CONFIG.insightsDir)
    ? fs.readdirSync(CONFIG.insightsDir)
        .filter(f => f.endsWith('.html') && f !== `${topic.slug}.html`)
        .slice(0, 3)
    : [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${topic.title} | EGR Consulting Insights</title>
  <meta name="description" content="${topic.metaDescription}" />
  <meta property="og:title" content="${topic.title}" />
  <meta property="og:description" content="${topic.metaDescription}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${CONFIG.siteUrl}/insights/${topic.slug}" />
  <link rel="canonical" href="${CONFIG.siteUrl}/insights/${topic.slug}" />

  <!-- GTM -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-XXXXXXX');</script>

  <!-- GA4 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-1XK6ZKRGHD"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-1XK6ZKRGHD');
  </script>

  <!-- FB Pixel -->
  <script>
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '1527706744681600');
    fbq('track', 'PageView');
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.css" />
  <link rel="stylesheet" href="../css/style.css" />

  <!-- BlogPosting Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "${topic.title}",
    "description": "${topic.metaDescription}",
    "author": { "@type": "Organization", "name": "EGR Consulting", "url": "${CONFIG.siteUrl}" },
    "publisher": { "@type": "Organization", "name": "EGR Consulting Services", "url": "${CONFIG.siteUrl}" },
    "datePublished": "${date.iso}",
    "dateModified": "${date.iso}",
    "mainEntityOfPage": "${CONFIG.siteUrl}/insights/${topic.slug}",
    "keywords": "${topic.keywords.join(', ')}",
    "articleSection": "${topic.category}"
  }
  </script>

  <style>
    .article-hero { background: linear-gradient(135deg, #0A2540 0%, #0d3159 100%); padding: 140px 0 60px; }
    .breadcrumb { display: flex; gap: 8px; align-items: center; font-size: .85rem; color: rgba(255,255,255,.5); margin-bottom: 24px; }
    .breadcrumb a { color: rgba(255,255,255,.6); transition: color .2s; }
    .breadcrumb a:hover { color: var(--teal); }
    .breadcrumb .sep { color: rgba(255,255,255,.3); }
    .article-category { display: inline-block; padding: 5px 14px; border-radius: 100px; font-size: .75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; background: ${category.bg || 'rgba(0,168,120,.08)'}; color: ${category.color || '#00A878'}; margin-bottom: 16px; }
    .article-hero h1 { color: #fff; font-size: clamp(1.8rem, 4vw, 2.8rem); max-width: 800px; margin-bottom: 20px; }
    .article-meta { display: flex; gap: 20px; align-items: center; color: rgba(255,255,255,.5); font-size: .9rem; }
    .article-meta .author { font-weight: 600; color: rgba(255,255,255,.8); }
    .article-body { max-width: 760px; margin: 0 auto; padding: 64px 24px; }
    .article-body h2 { margin: 48px 0 20px; font-size: 1.5rem; }
    .article-body p { margin-bottom: 20px; font-size: 1.05rem; line-height: 1.8; }
    .pull-quote { border-left: 4px solid var(--teal); margin: 40px 0; padding: 20px 28px; background: var(--bg); border-radius: 0 var(--radius-md) var(--radius-md) 0; }
    .pull-quote p { font-size: 1.15rem; font-style: italic; color: var(--navy); line-height: 1.7; margin: 0; }
    .data-callout { background: var(--teal-light); border-radius: var(--radius-md); padding: 32px; text-align: center; margin: 40px 0; }
    .data-callout-stat { font-size: 2.4rem; font-weight: 900; color: var(--teal); font-family: 'DM Sans', sans-serif; }
    .data-callout-label { font-size: .9rem; color: var(--text-muted); margin-top: 8px; }
    .related-services { background: var(--bg); padding: 48px 0; }
    .related-services h3 { text-align: center; margin-bottom: 32px; }
    .service-links { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
    .service-link { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: var(--white); border: 1px solid var(--border); border-radius: var(--radius-md); font-weight: 600; font-size: .9rem; transition: all .2s; }
    .service-link:hover { border-color: var(--teal); color: var(--teal); box-shadow: var(--shadow-sm); }
    .article-cta { background: linear-gradient(135deg, #0A2540 0%, #0d3159 100%); padding: 80px 0; text-align: center; }
    .article-cta h2 { color: #fff; margin-bottom: 16px; }
    .article-cta p { color: rgba(255,255,255,.6); margin-bottom: 32px; max-width: 500px; margin-left: auto; margin-right: auto; }
  </style>
</head>
<body>

<nav class="nav" role="navigation" aria-label="Main navigation">
  <div class="nav-inner">
    <a href="../index.html" class="nav-logo" aria-label="EGR Consulting Home">
      <span class="nav-logo-text">EGR Consulting</span>
      <span class="nav-logo-sub">PM &middot; Agile &middot; Training</span>
    </a>
    <div class="nav-links">
      <a href="../services.html">Services</a>
      <a href="../training.html">Training</a>
      <a href="../classes.html">Classes</a>
      <a href="../consulting.html">Consulting</a>
      <a href="../insights.html" class="active">Insights</a>
      <a href="../contact.html">Contact</a>
    </div>
    <a href="../book.html" class="btn btn-primary btn-sm nav-cta book-cta">Book a Call <i class="fa fa-arrow-right"></i></a>
    <button class="hamburger" aria-label="Toggle mobile menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>
<div class="mobile-menu" role="dialog" aria-modal="true" aria-label="Mobile navigation">
  <a href="../services.html">Services</a>
  <a href="../training.html">Training</a>
  <a href="../classes.html">Classes</a>
  <a href="../consulting.html">Consulting</a>
  <a href="../insights.html">Insights</a>
  <a href="../contact.html">Contact</a>
  <a href="../book.html" class="btn btn-primary mt-6 book-cta">Book a Free Call</a>
</div>

<section class="article-hero">
  <div class="container">
    <div class="breadcrumb">
      <a href="../index.html">Home</a> <span class="sep">/</span>
      <a href="../insights.html">Insights</a> <span class="sep">/</span>
      <span style="color:rgba(255,255,255,.7);">${topic.title}</span>
    </div>
    <span class="article-category">${topic.category}</span>
    <h1>${topic.title}</h1>
    <div class="article-meta">
      <span class="author">EGR Consulting</span>
      <span><i class="fa fa-calendar" style="margin-right:6px;"></i>${date.full}</span>
      <span><i class="fa fa-clock" style="margin-right:6px;"></i>${topic.readTime}</span>
    </div>
  </div>
</section>

<article class="article-body" data-aos="fade-up">
  ${htmlContent}
</article>

<section class="related-services">
  <div class="container">
    <h3>Related EGR Services</h3>
    <div class="service-links">
      ${relatedServices.map(s => {
        const names = { 'services.html': 'Agile Transformation', 'training.html': 'Training & Certification', 'consulting.html': 'PM Consulting', 'classes.html': 'Weekend Classes' };
        return `<a href="../${s}" class="service-link"><i class="fa fa-arrow-right"></i> ${names[s] || s}</a>`;
      }).join('\n      ')}
      <a href="../book.html" class="service-link"><i class="fa fa-calendar-check"></i> Book a Consultation</a>
    </div>
  </div>
</section>

<section class="article-cta">
  <div class="container">
    <h2>Ready to Transform Your Delivery?</h2>
    <p>Our PMP &amp; SPC6 certified consultants are ready to help your organization achieve delivery excellence.</p>
    <a href="../book.html" class="btn btn-primary btn-lg book-cta">Book a Free Consultation <i class="fa fa-calendar-check"></i></a>
  </div>
</section>

<footer class="footer" role="contentinfo">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <div class="footer-logo-text">EGR Consulting</div>
        <div class="footer-logo-sub">PM &middot; Agile &middot; Training</div>
        <p>Enterprise-grade project management consulting, agile transformation, and AI integration for teams serious about delivery excellence.</p>
        <div class="footer-social">
          <a href="https://www.linkedin.com/in/erickgrosa" target="_blank" rel="noopener" class="social-icon" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
          <a href="https://github.com/AgilityForLife" target="_blank" rel="noopener" class="social-icon" aria-label="GitHub"><i class="fab fa-github"></i></a>
          <a href="https://www.credly.com/users/erick-rosa" target="_blank" rel="noopener" class="social-icon" aria-label="Credly"><i class="fa fa-medal"></i></a>
          <a href="mailto:info@egrconsultingservices.com" class="social-icon" aria-label="Email"><i class="fa fa-envelope"></i></a>
        </div>
      </div>
      <div class="footer-col">
        <h5>Services</h5>
        <ul>
          <li><a href="../training.html">PMP Exam Prep</a></li>
          <li><a href="../training.html">SAFe Certification</a></li>
          <li><a href="../training.html">Power BI Training</a></li>
          <li><a href="../consulting.html">PM Consulting</a></li>
          <li><a href="../services.html">Agile Transformation</a></li>
          <li><a href="../services.html">Staff Augmentation</a></li>
          <li><a href="../services.html">AI Integration</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h5>Company</h5>
        <ul>
          <li><a href="../classes.html">Weekend Classes</a></li>
          <li><a href="../insights.html">Insights</a></li>
          <li><a href="../about.html">About Us</a></li>
          <li><a href="../book.html">Book a Call</a></li>
          <li><a href="../contact.html">Contact</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h5>Connect</h5>
        <ul>
          <li><a href="tel:3477544463"><i class="fa fa-phone" style="width:14px;margin-right:6px;"></i>347-754-4463</a></li>
          <li><a href="mailto:info@egrconsultingservices.com"><i class="fa fa-envelope" style="width:14px;margin-right:6px;"></i>info@egrconsultingservices.com</a></li>
          <li><a href="#"><i class="fa fa-location-dot" style="width:14px;margin-right:6px;"></i>Bloomfield, NJ</a></li>
          <li><a href="https://www.linkedin.com/in/erickgrosa" target="_blank" rel="noopener"><i class="fab fa-linkedin" style="width:14px;margin-right:6px;"></i>LinkedIn</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; <script>document.write(new Date().getFullYear())<\/script> EGR Consulting &middot; Erick G. Rosa, PMP, PMI-ACP, SPC6 &middot; Bloomfield, NJ</p>
      <div class="footer-legal">
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
      </div>
    </div>
  </div>
</footer>

<script src="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js"></script>
<script src="../js/main.js"></script>
</body>
</html>`;
}

// ── Step 4: Update Insights Hub ────────────────────────────
function addToInsightsHub(topics, date) {
  let hub = fs.readFileSync(CONFIG.hubPage, 'utf8');

  // Build new card HTML for each topic
  const newCards = topics.map(topic => {
    const category = CONFIG.categories.find(c => c.name === topic.category) || CONFIG.categories[0];
    return `
        <article class="insight-card" data-category="${category.slug}" data-aos="fade-up">
          <div class="insight-card-inner">
            <span class="insight-tag" style="background:${category.bg};color:${category.color};">${topic.category}</span>
            <h3><a href="insights/${topic.slug}.html">${topic.title}</a></h3>
            <p>${topic.excerpt}</p>
            <div class="insight-card-footer">
              <span class="insight-date"><i class="fa fa-calendar"></i> ${date.display}</span>
              <a href="insights/${topic.slug}.html" class="insight-read-more">Read Article <i class="fa fa-arrow-right"></i></a>
            </div>
          </div>
        </article>`;
  }).join('\n');

  // Insert before closing </div> of .insights-grid
  const gridClose = '</div><!-- /.insights-grid -->';
  if (hub.includes(gridClose)) {
    hub = hub.replace(gridClose, newCards + '\n      ' + gridClose);
  } else {
    // Fallback: try to find the grid container end
    const altClose = '<!-- /insights-grid -->';
    if (hub.includes(altClose)) {
      hub = hub.replace(altClose, newCards + '\n      ' + altClose);
    } else {
      console.warn('⚠️  Could not find insights grid marker in hub page. Adding cards manually may be needed.');
    }
  }

  fs.writeFileSync(CONFIG.hubPage, hub, 'utf8');
  console.log('  📄 Updated insights.html hub page');
}

// ── Step 5: Update Sitemap ─────────────────────────────────
function updateSitemap(topics, date) {
  let sitemap = fs.readFileSync(CONFIG.sitemapPath, 'utf8');

  const newEntries = topics.map(topic => `  <url>
    <loc>${CONFIG.siteUrl}/insights/${topic.slug}</loc>
    <lastmod>${date.iso}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n');

  sitemap = sitemap.replace('</urlset>', newEntries + '\n</urlset>');
  fs.writeFileSync(CONFIG.sitemapPath, sitemap, 'utf8');
  console.log('  🗺️  Updated sitemap.xml');
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  EGR Consulting — Monthly Insights Generator');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Articles: ${articleCount}`);
  console.log(`  Category: ${focusCategory || 'All'}`);
  console.log(`  Dry run:  ${dryRun}`);
  console.log('');

  // Ensure insights directory exists
  if (!fs.existsSync(CONFIG.insightsDir)) {
    fs.mkdirSync(CONFIG.insightsDir, { recursive: true });
  }

  // Step 1: Generate topics
  const topics = await generateTopics(articleCount);
  console.log(`\n📋 Generated ${topics.length} article topics:\n`);
  topics.forEach((t, i) => {
    console.log(`  ${i + 1}. [${t.category}] ${t.title}`);
    console.log(`     → ${t.slug}`);
    console.log(`     ${t.excerpt}\n`);
  });

  if (dryRun) {
    console.log('🏁 Dry run complete. No files written.');
    return;
  }

  const date = getPublishDate();

  // Step 2 & 3: Generate content and build HTML for each article
  for (const topic of topics) {
    const content = await generateArticleContent(topic);
    const html = buildArticleHTML(topic, content, date);
    const filePath = path.join(CONFIG.insightsDir, `${topic.slug}.html`);
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`  ✅ Created: insights/${topic.slug}.html`);
  }

  // Step 4: Update the insights hub page
  addToInsightsHub(topics, date);

  // Step 5: Update sitemap
  updateSitemap(topics, date);

  console.log('\n═══════════════════════════════════════════════');
  console.log('  ✅ Monthly insights generation complete!');
  console.log('');
  console.log('  Next steps:');
  console.log('    1. Review generated articles in insights/');
  console.log('    2. git add insights/ insights.html sitemap.xml');
  console.log('    3. git commit -m "Add monthly insights"');
  console.log('    4. git push');
  console.log('═══════════════════════════════════════════════');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
