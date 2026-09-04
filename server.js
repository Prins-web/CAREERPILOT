require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'openai/gpt-oss-120b';

if (!ANTHROPIC_API_KEY) {
  console.warn('\n⚠️  API key is not set. Add it to a .env file. API calls will fail until then.\n');
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------- Groq helper (OpenAI-compatible) ----------------
async function callClaude(system, user) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANTHROPIC_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function parseJSON(text) {
  let clean = text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const firstBrace = clean.search(/[\{\[]/);
  if (firstBrace > 0) clean = clean.slice(firstBrace);
  return JSON.parse(clean);
}

function profileSummary(profile) {
  return `Education: ${profile.education}\nSkills: ${profile.skills}\nInterests: ${profile.interests || 'Not specified'}\nCareer Goal: ${profile.goal}`;
}

function requireProfile(req, res) {
  const { profile } = req.body;
  if (!profile || !profile.education || !profile.skills || !profile.goal) {
    res.status(400).json({ error: 'Missing required profile fields: education, skills, and goal are required.' });
    return null;
  }
  return profile;
}

async function handleGeneration(res, system, user) {
  try {
    const text = await callClaude(system, user);
    const parsed = parseJSON(text);
    res.json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

// ---------------- Routes ----------------
app.post('/api/generate/roadmap', async (req, res) => {
  const profile = requireProfile(req, res);
  if (!profile) return;
  const system = `You are a career advisor for students. Respond ONLY with valid JSON, no markdown fences, no preamble. Schema:
{"waypoints":[{"code":"WP1","timeframe":"short label like 'Month 1-2'","title":"short title","description":"1-2 sentences of concrete action","type":"foundation|skill|project|milestone|destination"}]}
Produce 6-8 waypoints ordered chronologically, ending with a "destination" type waypoint that represents achieving the stated career goal.`;
  const user = `Student profile:\n${profileSummary(profile)}\n\nBuild their personalised career roadmap.`;
  await handleGeneration(res, system, user);
});

app.post('/api/generate/skills', async (req, res) => {
  const profile = requireProfile(req, res);
  if (!profile) return;
  const system = `You are a career advisor for students. Respond ONLY with valid JSON, no markdown fences. Schema:
{"skills":[{"name":"skill name","priority":"high|medium|low","reason":"1-2 sentences why this matters for their goal","courses":[{"name":"course or resource name","provider":"platform or institution"}]}]}
Produce 6-8 skills, each with 1-2 course suggestions. Prioritise the skills with the biggest gap versus their stated goal.`;
  const user = `Student profile:\n${profileSummary(profile)}\n\nRecommend skills to develop and courses to learn them.`;
  await handleGeneration(res, system, user);
});

app.post('/api/generate/interview', async (req, res) => {
  const profile = requireProfile(req, res);
  if (!profile) return;
  const system = `You are a career advisor for students preparing for interviews. Respond ONLY with valid JSON, no markdown fences. Schema:
{"questions":[{"question":"the interview question","category":"behavioral|technical|situational","tip":"1-2 sentence tip on how to answer well"}]}
Produce 8-10 questions tailored to the student's career goal and current skill level, mixing categories.`;
  const user = `Student profile:\n${profileSummary(profile)}\n\nGenerate likely interview questions for their target role, with tips.`;
  await handleGeneration(res, system, user);
});

app.post('/api/generate/opportunities', async (req, res) => {
  const profile = requireProfile(req, res);
  if (!profile) return;
  const system = `You are a career advisor for students. Respond ONLY with valid JSON, no markdown fences. Schema:
{"roles":[{"title":"role title","matchScore":85,"description":"1-2 sentence description of the role","whyFit":"1-2 sentences on why this fits their profile","growthNote":"short note on growth potential or typical next step"}]}
Produce 5-7 roles ranging from immediately-attainable to aspirational stretch roles, sorted by matchScore descending.`;
  const user = `Student profile:\n${profileSummary(profile)}\n\nSuggest suitable career opportunities/roles.`;
  await handleGeneration(res, system, user);
});

app.post('/api/generate/resume', async (req, res) => {
  const profile = requireProfile(req, res);
  if (!profile) return;
  const resumeText = (req.body.resumeText || '').trim();
  if (!resumeText) {
    return res.status(400).json({ error: 'resumeText is required.' });
  }
  const system = `You are a career advisor reviewing a student's resume. Respond ONLY with valid JSON, no markdown fences. Schema:
{"score":72,"strengths":["point 1","point 2"],"improvements":["point 1","point 2"],"bullets":[{"original":"a bullet copied near-verbatim from the resume","improved":"a stronger rewritten version"}]}
score is 0-100. Provide 3-5 strengths, 3-5 improvements, and rewrite 2-4 of the weakest bullets found in the resume.`;
  const user = `Student profile:\n${profileSummary(profile)}\n\nResume text:\n${resumeText}\n\nReview this resume against their career goal.`;
  await handleGeneration(res, system, user);
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, keyConfigured: Boolean(ANTHROPIC_API_KEY) });
});

app.listen(PORT, () => {
  console.log(`\n🚀 CareerPilot AI running at http://localhost:${PORT}\n`);
});
module.exports = app;