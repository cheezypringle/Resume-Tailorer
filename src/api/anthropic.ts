import type { StructuredResume } from '../types';
import { OPENROUTER_URL, streamFromOpenRouter } from './openrouter';

const TAILORING_SYSTEM_PROMPT = `You are an expert resume tailor. Your job is to customize a resume for a specific job description.

CRITICAL RULE: The base resume is your ONLY source of truth. Every single fact — company names, roles, dates, metrics, achievements, skills, tools — must come directly from the base resume. If something is not in the base resume, it MUST NOT appear in the output. When in doubt, leave it out.

You must follow these rules strictly:
1. NEVER fabricate, infer, or add skills, experience, titles, dates, metrics, tools, or achievements that are not explicitly present in the base resume. Do NOT add skills just because the JD asks for them.
2. NEVER upgrade or inflate metrics (e.g., don't change "10%" to "15%", don't change "200+ hours" to "500+ hours").
3. NEVER invent new bullet points. You may only reword, merge, or reorganize existing bullets.
4. Extract critical keywords from the JD and weave them in ONLY where the candidate's existing experience genuinely supports the claim.
5. Rewrite bullet points to mirror the JD's language and priorities, but the underlying facts must remain unchanged.
6. Reorder sections and bullets so the most JD-relevant content appears first.
7. Preserve standard section names (Experience, Education, Skills, etc.) for ATS compatibility.
8. Keep the chronological order within each section (most recent first).
9. Limit each experience item to 3–5 bullets, depending on importance.
10. Do NOT remove bullet points. The base resume is already concise. Instead, reword existing bullets to incorporate JD keywords where the candidate's experience genuinely supports the terminology. Reorder bullets within each role so the most JD-relevant ones appear first.
11. For the Skills section: only list skills that are explicitly mentioned in or clearly demonstrated by the base resume. Do NOT add JD-required skills the candidate doesn't have.
12. NEVER drop or leave blank the "role" field for any experience item. Every job/project in the base resume has a title — preserve it exactly.
13. NEVER drop skills, tools, or technologies from the Skills section that exist in the base resume. You may reorganize or relabel skill categories to match the JD, but the actual skills listed must be a superset of what the base resume contains.
14. If the job description is vague or lacks specific technical requirements, focus on improving clarity, impact, and conciseness of the existing resume rather than trying to keyword-match.

Your output must be in EXACTLY this format:

1. First, output valid JSON (NO markdown code fences, NO backticks) matching this schema:

{
  "name": "Candidate Full Name",
  "contact": "M: +65 12345678 | E: email@example.com | LI: https://linkedin.com/in/...",
  "sections": [
    {
      "type": "education",
      "title": "EDUCATION",
      "items": [
        {
          "institution": "University Name",
          "location": "City",
          "degree": "Bachelor of ...",
          "dates": "Sep 22 - May 26",
          "bullets": ["Honors: ...", "Focus: ..."]
        }
      ]
    },
    {
      "type": "experience",
      "title": "WORK EXPERIENCE",
      "items": [
        {
          "company": "Company Name (parent company if applicable)",
          "dates": "Jan 25 - Jun 25",
          "role": "Job Title",
          "location": "City",
          "bullets": [
            "Led X resulting in Y...",
            "Built Z improving W by N%..."
          ]
        }
      ]
    },
    {
      "type": "certifications",
      "title": "CERTIFICATIONS",
      "items": [
        { "name": "Certification Name", "date": "Jan 2025" }
      ]
    },
    {
      "type": "skills",
      "title": "TECHNICAL SKILLS",
      "categories": [
        { "label": "Programming Languages", "values": "Python, R, SQL" },
        { "label": "Tools & Technologies", "values": "Power BI, Tableau, Excel" },
        { "label": "Databases", "values": "MySQL, PostgreSQL" }
      ]
    }
  ]
}

2. Then output this exact delimiter on its own line:
---TAILORING_NOTES---

3. Then output the tailoring notes:
**Keywords Matched:** [list of JD keywords successfully incorporated]

**Changes Made:**
- [bullet list of specific changes]

**Gaps Identified:**
- [skills or requirements from the JD that the resume does not support]

IMPORTANT: The JSON must be valid and parseable. Do not wrap it in code fences. Start your response directly with the opening { character.`;

const COVER_LETTER_SYSTEM_PROMPT = `You are an expert cover letter writer. Write a concise, specific cover letter that maps the candidate's strongest relevant experience to the role's top requirements.

Rules:
1. NEVER fabricate experience, projects, or achievements. Only reference what exists in the resume.
2. Avoid generic filler like "I'm excited to apply" or "I believe I would be a great fit." Lead with a concrete value proposition.
3. Reference specific JD requirements and how the candidate's experience maps to them.
4. Keep it under 100 words. Be extremely concise — every word must earn its place.
5. Use a professional but direct tone.
6. Output plain text only — no markdown formatting, no headers, no bullet points unless natural in a letter.`;

const MODEL = 'anthropic/claude-sonnet-4';

function structuredToPlainText(resume: StructuredResume): string {
  const lines: string[] = [];
  lines.push(resume.name);
  lines.push(resume.contact);
  lines.push('');

  for (const section of resume.sections) {
    lines.push(section.title);
    switch (section.type) {
      case 'education':
        for (const item of section.items) {
          lines.push(`${item.institution}    ${item.location}`);
          lines.push(`${item.degree}    ${item.dates}`);
          for (const b of item.bullets) lines.push(`  • ${b}`);
          lines.push('');
        }
        break;
      case 'experience':
        for (const item of section.items) {
          lines.push(`${item.company}    ${item.dates}`);
          lines.push(`${item.role}    ${item.location}`);
          for (const b of item.bullets) lines.push(`  • ${b}`);
          lines.push('');
        }
        break;
      case 'certifications':
        for (const item of section.items) {
          lines.push(`${item.name}    ${item.date}`);
        }
        lines.push('');
        break;
      case 'skills':
        for (const cat of section.categories) {
          lines.push(`${cat.label}: ${cat.values}`);
        }
        lines.push('');
        break;
    }
  }
  return lines.join('\n').trim();
}

export async function tailorResume(
  apiKey: string,
  resumeText: string,
  jdText: string,
  onProgress?: (text: string) => void
): Promise<{ tailoredResume: string; structuredResume?: StructuredResume; tailoringNotes: string }> {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      stream: true,
      messages: [
        { role: 'system', content: TAILORING_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Here is my master resume:\n\n${resumeText}\n\n---\n\nHere is the job description I want to tailor it for:\n\n${jdText}\n\nPlease tailor my resume for this role. Output valid JSON followed by tailoring notes, exactly as specified.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as Record<string, Record<string, string>>)?.error?.message || `API error: ${response.status}`);
  }

  const fullText = await streamFromOpenRouter(response.body!.getReader(), onProgress);

  const delimiter = '---TAILORING_NOTES---';
  const delimIdx = fullText.indexOf(delimiter);

  if (delimIdx === -1) {
    return { tailoredResume: fullText.trim(), tailoringNotes: 'No tailoring notes generated.' };
  }

  const jsonPart = fullText.slice(0, delimIdx).trim();
  const notesPart = fullText.slice(delimIdx + delimiter.length).trim();

  // Try to parse structured JSON (with repair for truncated output)
  const tryParseJSON = (raw: string): StructuredResume | null => {
    try {
      return JSON.parse(raw);
    } catch {
      // Attempt to repair truncated JSON by closing open braces/brackets
      let repaired = raw;
      // Remove any trailing incomplete key-value pair (e.g., `"label": "Dat`)
      repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, '');
      // Count unclosed brackets
      const opens = (repaired.match(/[{[]/g) || []).length;
      const closes = (repaired.match(/[}\]]/g) || []).length;
      const missing = opens - closes;
      if (missing > 0) {
        // Heuristically close: scan from end to determine bracket order
        const stack: string[] = [];
        for (const ch of repaired) {
          if (ch === '{' || ch === '[') stack.push(ch);
          else if (ch === '}' || ch === ']') stack.pop();
        }
        while (stack.length > 0) {
          const open = stack.pop();
          repaired += open === '{' ? '}' : ']';
        }
        try {
          return JSON.parse(repaired);
        } catch {
          return null;
        }
      }
      return null;
    }
  };

  const structured = tryParseJSON(jsonPart);
  if (structured?.name && structured?.sections && Array.isArray(structured.sections)) {
    return {
      tailoredResume: structuredToPlainText(structured),
      structuredResume: structured,
      tailoringNotes: notesPart,
    };
  }

  return {
    tailoredResume: jsonPart,
    tailoringNotes: notesPart,
  };
}

export async function generateCoverLetter(
  apiKey: string,
  tailoredResume: string,
  jdText: string,
  onProgress?: (text: string) => void
): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      stream: true,
      messages: [
        { role: 'system', content: COVER_LETTER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Here is my tailored resume:\n\n${tailoredResume}\n\n---\n\nHere is the job description:\n\n${jdText}\n\nPlease write a cover letter for this role.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as Record<string, Record<string, string>>)?.error?.message || `API error: ${response.status}`);
  }

  const fullText = await streamFromOpenRouter(response.body!.getReader(), onProgress);
  return fullText.trim();
}
