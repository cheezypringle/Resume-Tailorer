import type { StructuredResume } from '../types';

const TAILORING_SYSTEM_PROMPT = `You are an expert resume tailor. Your job is to customize a resume for a specific job description.

You must follow these rules strictly:
1. NEVER fabricate skills, experience, titles, dates, metrics, or achievements. Only reframe, reword, and reorganize what exists.
2. Extract critical keywords (hard skills, tools, certifications, domain terms) from the job description.
3. Weave matched keywords into the resume naturally where the candidate's experience supports the claim.
4. Rewrite bullet points to mirror the JD's language, priorities, and metric style. Strengthen action verbs and surface quantified achievements.
5. Reorder sections and bullets so the most JD-relevant content appears first.
6. Preserve standard section names (Experience, Education, Skills, etc.) for ATS compatibility.
7. Keep the chronological order within each section (most recent first).
8. Keep content concise enough to fit on ONE page. Cut or consolidate weaker bullets if needed.

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
4. Keep it 250-400 words.
5. Use a professional but direct tone.
6. Output plain text only — no markdown formatting, no headers, no bullet points unless natural in a letter.`;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4';

function streamFromOpenRouter(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onProgress?: (text: string) => void,
): Promise<string> {
  const decoder = new TextDecoder();
  let fullText = '';

  return (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              onProgress?.(fullText);
            }
          } catch {
            // skip non-JSON lines
          }
        }
      }
    }
    return fullText;
  })();
}

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
      max_tokens: 4096,
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

  // Try to parse structured JSON
  try {
    const structured: StructuredResume = JSON.parse(jsonPart);
    // Validate minimal structure
    if (structured.name && structured.sections && Array.isArray(structured.sections)) {
      return {
        tailoredResume: structuredToPlainText(structured),
        structuredResume: structured,
        tailoringNotes: notesPart,
      };
    }
  } catch {
    // JSON parse failed — fall back to plain text
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
