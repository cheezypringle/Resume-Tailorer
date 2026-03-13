import type { ResearchResult } from '../types';
import { callOpenRouter } from './openrouter';

const MODEL = 'anthropic/claude-sonnet-4';

const CAREER_COACH_SYSTEM_PROMPT = `You are an expert career coach preparing a candidate for a specific job interview. You have access to their tailored resume, the job description, company research, and common interview questions.

Provide actionable, specific interview preparation advice. Structure your response as follows:

## Key Talking Points
- For each major experience on the resume, explain how to frame it for THIS specific role
- Connect resume achievements to the company's needs and values

## Addressing Gaps
- Identify any gaps between the resume and JD requirements
- Suggest how to address each gap honestly and positively in an interview

## Company-Specific Insights
- Things to mention that show you've researched the company
- Recent news or developments to reference
- Culture fit signals to highlight

## Interview Question Prep
For each common question provided, suggest:
- A framework for answering
- Which resume experiences to draw from
- Key points to hit

Rules:
1. Be specific — reference actual items from the resume and JD, not generic advice.
2. NEVER suggest fabricating or exaggerating experience.
3. Focus on framing existing experience in the most relevant way.
4. Keep advice practical and actionable.`;

export async function generateCareerCoachAdvice(
  apiKey: string,
  tailoredResume: string,
  jdText: string,
  researchResult: ResearchResult,
): Promise<string> {
  const questionsBlock = researchResult.commonQuestions.length > 0
    ? `\n\nCommon Interview Questions:\n${researchResult.commonQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : '';

  const fullText = await callOpenRouter(
    apiKey,
    MODEL,
    [
      { role: 'system', content: CAREER_COACH_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Here is my tailored resume:\n\n${tailoredResume}\n\n---\n\nJob Description:\n\n${jdText}\n\n---\n\nCompany Research:\n${researchResult.companyResearch}\n\nJob/Role Research:\n${researchResult.jobResearch}${questionsBlock}\n\nPlease provide interview preparation advice for this specific role.`,
      },
    ],
    4096,
  );

  return fullText.trim();
}
