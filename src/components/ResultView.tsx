import { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { tailorResume, generateCoverLetter } from '../api/anthropic';
import { exportToDocx } from '../utils/export';

export default function ResultView() {
  const { apiKey, resumeText, jobDescriptions, selectedJDId, updateJD, setCurrentStep, setSelectedJDId, appendixImages } = useApp();
  const jd = jobDescriptions.find(j => j.id === selectedJDId);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [coverLetterStream, setCoverLetterStream] = useState('');
  const [generatingCL, setGeneratingCL] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [copied, setCopied] = useState<'resume' | 'cover' | null>(null);
  const [activeTab, setActiveTab] = useState<'resume' | 'notes'>('resume');

  const runTailoring = useCallback(async () => {
    if (!jd || !apiKey) return;
    setProcessing(true);
    setError('');
    updateJD(jd.id, { status: 'processing' });

    try {
      const result = await tailorResume(apiKey, resumeText, jd.text);
      updateJD(jd.id, { status: 'done', result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      updateJD(jd.id, { status: 'error' });
    } finally {
      setProcessing(false);
    }
  }, [jd, apiKey, resumeText, updateJD]);

  useEffect(() => {
    if (jd && jd.status === 'pending') {
      runTailoring();
    }
  }, [jd, runTailoring]);

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
      setSelectedJDId(next.id);
    }
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

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={runTailoring} className="text-sm text-red-700 hover:text-red-900 underline ml-4 cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Processing */}
      {processing && (
        <div className="flex items-center gap-2 py-8 justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-600">Tailoring your resume...</p>
        </div>
      )}

      {/* Result */}
      {jd.result && !processing && (
        <>
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('resume')}
              className={`px-4 py-2 text-sm font-medium cursor-pointer ${activeTab === 'resume' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Tailored Resume
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 text-sm font-medium cursor-pointer ${activeTab === 'notes' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Tailoring Notes
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-white border rounded-lg p-4 max-h-[28rem] overflow-y-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
              {activeTab === 'resume' ? jd.result.tailoredResume : jd.result.tailoringNotes}
            </pre>
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
