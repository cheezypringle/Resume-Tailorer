import { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { generateCoverLetter } from '../api/anthropic';
import { exportToDocx, generateDocxBlob } from '../utils/export';
import { usePipeline } from '../hooks/usePipeline';
import { appendToGoogleSheet, blobToBase64 } from '../api/googleSheets';
import type { JDStatus } from '../types';

const PIPELINE_STEPS: { status: JDStatus; label: string }[] = [
  { status: 'tailoring', label: 'Tailoring' },
  { status: 'researching', label: 'Researching' },
  { status: 'coaching', label: 'Coaching' },
  { status: 'exporting', label: 'Exporting' },
  { status: 'done', label: 'Done' },
];

const STEP_ORDER: JDStatus[] = ['pending', 'tailoring', 'researching', 'coaching', 'exporting', 'done'];

function isResumeReady(status: JDStatus): boolean {
  const idx = STEP_ORDER.indexOf(status);
  return idx >= STEP_ORDER.indexOf('researching');
}


export default function ResultView() {
  const { apiKey, jobDescriptions, selectedJDId, updateJD, setCurrentStep, setSelectedJDId, appendixImages, googleSheetsUrl } = useApp();
  const { runPipeline } = usePipeline();
  const jd = jobDescriptions.find(j => j.id === selectedJDId);

  const [error, setError] = useState('');
  const [coverLetterStream, setCoverLetterStream] = useState('');
  const [generatingCL, setGeneratingCL] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [copied, setCopied] = useState<'resume' | 'cover' | null>(null);
  const [activeTab, setActiveTab] = useState<'resume' | 'notes' | 'research' | 'coach'>('resume');
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const startPipeline = useCallback(async () => {
    if (!jd || !apiKey) return;
    setError('');
    try {
      await runPipeline(jd);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    }
  }, [jd, apiKey, runPipeline]);

  useEffect(() => {
    if (jd && jd.status === 'pending') {
      startPipeline();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jd?.id, jd?.status]);

  const handleGenerateCoverLetter = async () => {
    if (!jd?.result || !apiKey) return;
    setGeneratingCL(true);
    setCoverLetterStream('');
    setShowCoverLetter(true);

    try {
      const cl = await generateCoverLetter(apiKey, jd.result.tailoredResume, jd.text, (text) => {
        setCoverLetterStream(text);
      });
      updateJD(jd.id, { coverLetter: cl });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setGeneratingCL(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'resume' | 'cover') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownloadDocx = () => {
    if (!jd?.result?.structuredResume) return;
    exportToDocx(
      jd.result.structuredResume,
      jd.label,
      appendixImages.length > 0 ? appendixImages : undefined,
    );
  };

  const handleProcessNext = () => {
    const next = jobDescriptions.find(j => j.status === 'pending');
    if (next) {
      setShowCoverLetter(false);
      setActiveTab('resume');
      setSelectedJDId(next.id);
    }
  };

  const handleRetry = () => {
    if (!jd) return;
    setError('');
    updateJD(jd.id, { status: 'pending', pipelineError: undefined, result: undefined, researchResult: undefined, coachResult: undefined });
  };

  const goBackToQueue = () => {
    setShowCoverLetter(false);
    setCurrentStep('queue');
  };

  if (!jd) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No job description selected.</p>
        <button onClick={goBackToQueue} className="mt-4 text-blue-600 hover:text-blue-800 cursor-pointer">
          Back to Queue
        </button>
      </div>
    );
  }

  const isPipelineRunning = ['tailoring', 'researching', 'coaching', 'exporting'].includes(jd.status);
  const nextPending = jobDescriptions.find(j => j.status === 'pending');
  const coverLetterText = jd.coverLetter || coverLetterStream;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={goBackToQueue} className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer">
          &larr; Back to Queue
        </button>
        <h2 className="text-sm font-medium text-gray-700 truncate max-w-xs">{jd.label}</h2>
      </div>

      {/* Pipeline Progress */}
      {(isPipelineRunning || jd.status === 'done') && (
        <div className="flex items-center gap-1">
          {PIPELINE_STEPS.map((step, idx) => {
            const currentIdx = STEP_ORDER.indexOf(jd.status);
            const stepIdx = STEP_ORDER.indexOf(step.status);
            const isActive = jd.status === step.status;
            const isComplete = currentIdx > stepIdx || (jd.status === 'done' && step.status === 'done');
            const showStep = step.status !== 'exporting' || googleSheetsUrl;

            if (!showStep) return null;

            return (
              <div key={step.status} className="flex items-center gap-1 flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-full h-1.5 rounded-full transition-colors ${
                    isComplete ? 'bg-green-500' :
                    isActive ? 'bg-blue-500 animate-pulse' :
                    'bg-gray-200'
                  }`} />
                  <span className={`text-[10px] mt-1 ${
                    isActive ? 'text-blue-600 font-medium' :
                    isComplete ? 'text-green-600' :
                    'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {idx < PIPELINE_STEPS.length - 1 && (
                  <div className="w-1" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Error */}
      {(error || jd.pipelineError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-red-600">{error || jd.pipelineError?.message}</p>
            {jd.pipelineError?.stage && (
              <p className="text-xs text-red-400 mt-0.5">Failed at: {jd.pipelineError.stage}</p>
            )}
          </div>
          <button onClick={handleRetry} className="text-sm text-red-700 hover:text-red-900 underline ml-4 cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Processing spinner */}
      {isPipelineRunning && !isResumeReady(jd.status) && (
        <div className="flex items-center gap-2 py-4 justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-600">Tailoring your resume...</p>
        </div>
      )}

      {/* Tabs + Content — show as soon as resume is ready */}
      {(isResumeReady(jd.status) || jd.status === 'done' || (jd.status === 'error' && jd.result)) && jd.result && (
        <>
          {/* Tabs */}
          <div className="flex border-b overflow-x-auto">
            {(['resume', 'notes', 'research', 'coach'] as const).map((tab) => {
              const hasContent =
                (tab === 'research' && !!jd.researchResult) ||
                (tab === 'coach' && !!jd.coachResult) ||
                tab === 'resume' || tab === 'notes';
              const isLoading =
                (tab === 'research' && !jd.researchResult && isPipelineRunning) ||
                (tab === 'coach' && !jd.coachResult && isPipelineRunning);

              const labels: Record<string, string> = {
                resume: 'Tailored Resume',
                notes: 'Tailoring Notes',
                research: 'Research',
                coach: 'Coach',
              };

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap cursor-pointer ${
                    activeTab === tab
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : !hasContent && !isLoading
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {labels[tab]}
                  {isLoading && !hasContent && (
                    <span className="ml-1 inline-block animate-pulse">...</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="bg-white border rounded-lg p-4 max-h-[28rem] overflow-y-auto">
            {activeTab === 'resume' && (
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                {jd.result.tailoredResume}
              </pre>
            )}
            {activeTab === 'notes' && (
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                {jd.result.tailoringNotes}
              </pre>
            )}
            {activeTab === 'research' && jd.researchResult && (
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <h4 className="font-semibold text-gray-900">{jd.researchResult.companyName}</h4>
                  <p className="text-gray-500 italic">{jd.researchResult.companySummary}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-1">Company Research</h4>
                  <p className="whitespace-pre-wrap">{jd.researchResult.companyResearch}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-1">Job/Role Research</h4>
                  <p className="whitespace-pre-wrap">{jd.researchResult.jobResearch}</p>
                </div>
                {jd.researchResult.commonQuestions.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-1">Common Interview Questions</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {jd.researchResult.commonQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'research' && !jd.researchResult && (
              <div className="flex items-center gap-2 py-8 justify-center">
                {isPipelineRunning ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                    <p className="text-sm text-gray-400">Researching company & role...</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">No research data available.</p>
                )}
              </div>
            )}
            {activeTab === 'coach' && jd.coachResult && (
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                {jd.coachResult.interviewAdvice}
              </pre>
            )}
            {activeTab === 'coach' && !jd.coachResult && (
              <div className="flex items-center gap-2 py-8 justify-center">
                {isPipelineRunning ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                    <p className="text-sm text-gray-400">Generating interview prep...</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">No coaching data available.</p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => copyToClipboard(jd.result!.tailoredResume, 'resume')}
              className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md text-sm transition cursor-pointer"
            >
              {copied === 'resume' ? 'Copied!' : 'Copy Resume'}
            </button>
            <button
              onClick={handleDownloadDocx}
              disabled={!jd.result?.structuredResume}
              className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md text-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title={!jd.result?.structuredResume ? 'Structured data not available — copy text instead' : ''}
            >
              {appendixImages.length > 0 ? 'Download .docx + Appendix' : 'Download .docx'}
            </button>
            {!showCoverLetter && !jd.coverLetter && (
              <button
                onClick={handleGenerateCoverLetter}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition cursor-pointer"
              >
                Generate Cover Letter
              </button>
            )}
            {googleSheetsUrl && jd.result && jd.status === 'done' && (
              <button
                onClick={async () => {
                  setExporting(true);
                  setExported(false);
                  try {
                    let resumeFile = '';
                    const resumeFileName = `${jd.label.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'resume'}.docx`;
                    if (jd.result!.structuredResume) {
                      const blob = await generateDocxBlob(
                        jd.result!.structuredResume,
                        appendixImages.length > 0 ? appendixImages : undefined,
                      );
                      resumeFile = await blobToBase64(blob);
                      console.log('[Export] resumeFile length:', resumeFile.length, 'first 50 chars:', resumeFile.slice(0, 50));
                    } else {
                      console.log('[Export] No structuredResume available');
                    }
                    const payload = {
                      role: jd.label,
                      company: jd.researchResult?.companyName || jd.label.split(/[—\-–]/)[0]?.trim() || '',
                      resumeFile,
                      resumeFileName,
                      companyResearch: jd.researchResult?.companyResearch || '',
                      jobResearch: jd.researchResult?.jobResearch || '',
                      commonQuestions: jd.researchResult?.commonQuestions.join('\n') || '',
                      coachAdvice: jd.coachResult?.interviewAdvice || '',
                      timestamp: new Date().toISOString(),
                    };
                    console.log('[Export] Total payload size:', JSON.stringify(payload).length, 'bytes');
                    await appendToGoogleSheet(googleSheetsUrl, payload);
                    setExported(true);
                    setTimeout(() => setExported(false), 3000);
                  } catch {
                    setError('Failed to export to Google Sheets');
                  } finally {
                    setExporting(false);
                  }
                }}
                disabled={exporting}
                className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md text-sm transition cursor-pointer disabled:opacity-40"
              >
                {exported ? 'Exported!' : exporting ? 'Exporting...' : 'Export to Sheets'}
              </button>
            )}
            {nextPending && (
              <button
                onClick={handleProcessNext}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 transition cursor-pointer"
              >
                Process Next
              </button>
            )}
          </div>
        </>
      )}

      {/* Cover Letter */}
      {(showCoverLetter || jd.coverLetter) && (
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Cover Letter</h3>
            {generatingCL && (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full" />
                <span className="text-xs text-gray-500">Generating...</span>
              </div>
            )}
          </div>
          {coverLetterText && (
            <>
              <div className="bg-white border rounded-lg p-4 max-h-80 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{coverLetterText}</pre>
              </div>
              <button
                onClick={() => copyToClipboard(coverLetterText, 'cover')}
                className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md text-sm transition cursor-pointer"
              >
                {copied === 'cover' ? 'Copied!' : 'Copy Cover Letter'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
