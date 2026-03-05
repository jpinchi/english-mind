export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(500).json({ error: 'Resend API key not configured' });

  try {
    const { to, subject, examTitle, examType, level, estimatedMinutes, instructions, questions, tip } = req.body;
    if (!to || !subject) return res.status(400).json({ error: 'Missing required fields' });

    // Build questions HTML
    const questionsHTML = (questions || []).map((q, i) => `
      <div style="margin-bottom:20px;padding:16px;background:#f8f9fa;border-radius:10px;border-left:4px solid #D4AF37;">
        <p style="font-weight:700;color:#1a1a2e;margin-bottom:10px;font-size:15px;">${i + 1}. ${q.text}</p>
        ${q.options
          ? q.options.map(opt => `<p style="color:#555;margin:5px 0;padding-left:12px;font-size:14px;">• ${opt}</p>`).join('')
          : '<p style="color:#888;font-style:italic;font-size:13px;">Open-ended — write your answer in your notebook.</p>'
        }
      </div>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#0f1724;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#1a2235;border-radius:18px;overflow:hidden;border:1px solid #2d3a52;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a2235,#0f1724);padding:36px 32px;text-align:center;border-bottom:2px solid #D4AF37;">
      <div style="width:60px;height:60px;background:linear-gradient(135deg,#D4AF37,#b8860b);border-radius:14px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:28px;">🎓</div>
      <p style="color:#D4AF37;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin:0 0 8px">DAILY ENGLISH PRACTICE</p>
      <h1 style="color:#E8E8F0;font-size:24px;margin:0 0 6px;font-weight:700;">${examTitle}</h1>
      <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:12px;">
        <span style="background:rgba(212,175,55,.15);color:#D4AF37;border:1px solid rgba(212,175,55,.3);border-radius:20px;padding:3px 12px;font-size:12px;font-weight:600;">${examType}</span>
        <span style="background:rgba(96,165,250,.15);color:#60a5fa;border:1px solid rgba(96,165,250,.3);border-radius:20px;padding:3px 12px;font-size:12px;font-weight:600;">${level}</span>
        <span style="background:rgba(167,139,250,.15);color:#a78bfa;border:1px solid rgba(167,139,250,.3);border-radius:20px;padding:3px 12px;font-size:12px;font-weight:600;">~${estimatedMinutes} min</span>
      </div>
    </div>

    <!-- Instructions -->
    <div style="padding:24px 32px 0;">
      <div style="background:#111827;border-radius:12px;padding:16px 20px;margin-bottom:24px;border:1px solid #2d3a52;">
        <p style="color:#D4AF37;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px">📋 Instructions</p>
        <p style="color:#D1D5DB;margin:0;line-height:1.6;font-size:14px;">${instructions}</p>
      </div>

      <!-- Questions -->
      ${questionsHTML}

      <!-- Tip -->
      ${tip ? `
      <div style="background:#111827;border-radius:12px;padding:16px 20px;margin:8px 0 24px;border:1px solid #2d3a52;">
        <p style="color:#22C55E;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px">💡 Tip of the Day</p>
        <p style="color:#D1D5DB;margin:0;font-style:italic;line-height:1.6;font-size:14px;">${tip}</p>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #2d3a52;text-align:center;">
      <p style="color:#4B5563;font-size:12px;margin:0;">Sent by <strong style="color:#D4AF37;">EnglishMind AI Tutor</strong> 🎓</p>
      <p style="color:#4B5563;font-size:11px;margin:6px 0 0;">Consistency is the key to fluency. Keep going! 💪</p>
    </div>
  </div>
</body>
</html>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'EnglishMind <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
