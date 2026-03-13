import type { ResearchResult } from '../types';
import { callOpenRouter } from './openrouter';

const RESEARCH_MODEL = 'perplexity/sonar';

const RESEARCH_SYSTEM_PROMPT = `You are a job application research assistant with web search capabilities. Given a job description, research the company and role thoroughly.

Your output must be valid JSON (NO markdown code fences, NO backticks) matching this schema:

{
  "companyName": "The company name",
  "companySummary": "One sentence describing what the company does",
  "companyResearch": "Bullet points (each starting with •) covering: company overview, recent news/developments, company culture and values, size and industry position. One fact per bullet, 8-12 bullets total.",
  "jobResearch": "Bullet points (each starting with •) focused on the SPECIFIC domain and processes mentioned in the JD. For example, if the JD mentions private banking, explain private banking processes, workflows, and terminology. Always ground the research in the exact technical/business areas the role requires — not generic career advice. One insight per bullet, 8-12 bullets total.",
  "commonQuestions": [
    "Interview question 1 specific to this role/company",
    "Interview question 2",
    "Interview question 3",
    "Interview question 4",
    "Interview question 5",
    "Interview question 6"
  ]
}

Rules:
1. Use your web search to find current, accurate information about the company.
2. The companySummary must be exactly ONE concise sentence.
3. Generate 5-8 interview questions that are SPECIFIC to this company and role — not generic questions.
4. Include behavioral, technical, and situational questions relevant to the job requirements.
5. The JSON must be valid and parseable. Start your response directly with the opening { character.`;

export async function researchCompanyAndJob(
  apiKey: string,
  jdText: string,
  jdLabel: string,
): Promise<ResearchResult> {
  const fullText = await callOpenRouter(
    apiKey,
    RESEARCH_MODEL,
    [
      { role: 'system', content: RESEARCH_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Here is the job listing (label: "${jdLabel}"):\n\n${jdText}\n\nPlease research this company and role. Output valid JSON as specified.`,
      },
    ],
    4096,
  );

  // Try to extract JSON from response (handle potential markdown wrapping)
  let jsonStr = fullText.trim();
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      companyName: parsed.companyName || '',
      companySummary: parsed.companySummary || '',
      companyResearch: parsed.companyResearch || '',
      jobResearch: parsed.jobResearch || '',
      commonQuestions: Array.isArray(parsed.commonQuestions) ? parsed.commonQuestions : [],
    };
  } catch {
    // If JSON parse fails, return a basic result from the raw text
    return {
      companyName: jdLabel.split(/[—\-–]/)[0]?.trim() || 'Unknown',
      companySummary: '',
      companyResearch: fullText,
      jobResearch: '',
      commonQuestions: [],
    };
  }
}
