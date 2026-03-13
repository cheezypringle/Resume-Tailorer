import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { tailorResume } from '../api/anthropic';
import { researchCompanyAndJob } from '../api/research';
import { generateCareerCoachAdvice } from '../api/careerCoach';
import { appendToGoogleSheet, blobToBase64 } from '../api/googleSheets';
import { generateDocxBlob } from '../utils/export';
import type { JobDescription } from '../types';

export function usePipeline() {
  const { apiKey, resumeText, updateJD, googleSheetsUrl, appendixImages } = useApp();

  const runPipeline = useCallback(async (jd: JobDescription) => {
    if (!apiKey) return;

    // Step 1: Tailor resume
    try {
      updateJD(jd.id, { status: 'tailoring', pipelineError: undefined });
      const result = await tailorResume(apiKey, resumeText, jd.text);
      updateJD(jd.id, { result });

      // Step 2: Research company & job
      updateJD(jd.id, { status: 'researching' });
      const researchResult = await researchCompanyAndJob(apiKey, jd.text, jd.label);
      updateJD(jd.id, { researchResult });

      // Step 3: Career coach
      updateJD(jd.id, { status: 'coaching' });
      const advice = await generateCareerCoachAdvice(
        apiKey,
        result.tailoredResume,
        jd.text,
        researchResult,
      );
      updateJD(jd.id, { coachResult: { interviewAdvice: advice } });

      // Step 4: Export to Google Sheets (if configured)
      if (googleSheetsUrl) {
        updateJD(jd.id, { status: 'exporting' });
        try {
          // Generate .docx blob and convert to base64
          let resumeFile = '';
          const resumeFileName = `${jd.label.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'resume'}.docx`;
          if (result.structuredResume) {
            const blob = await generateDocxBlob(
              result.structuredResume,
              appendixImages.length > 0 ? appendixImages : undefined,
            );
            resumeFile = await blobToBase64(blob);
          }

          await appendToGoogleSheet(googleSheetsUrl, {
            role: jd.label,
            company: researchResult.companyName || jd.label.split(/[—\-–]/)[0]?.trim() || '',
            resumeFile,
            resumeFileName,
            companyResearch: researchResult.companyResearch,
            jobResearch: researchResult.jobResearch,
            commonQuestions: researchResult.commonQuestions.join('\n'),
            coachAdvice: advice,
            timestamp: new Date().toISOString(),
          });
        } catch {
          // Sheets export failure is non-fatal — continue to done
        }
      }

      updateJD(jd.id, { status: 'done' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      updateJD(jd.id, {
        status: 'error',
        pipelineError: { stage: 'pipeline', message },
      });
    }
  }, [apiKey, resumeText, updateJD, googleSheetsUrl, appendixImages]);

  return { runPipeline };
}
