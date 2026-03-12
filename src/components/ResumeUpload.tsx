import { useState, useCallback, useRef } from 'react';
import mammoth from 'mammoth';
import { useApp } from '../context/AppContext';
import AppendixUpload from './AppendixUpload';

export default function ResumeUpload() {
  const { resumeText, resumeFileName, setResume, setCurrentStep } = useApp();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseDocx = useCallback(async (file: File) => {
    if (!file.name.endsWith('.docx')) {
      setError('Please upload a .docx file. Other formats are not yet supported.');
      return;
    }
    setError('');
    setParsing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (!result.value.trim()) {
        setError('The uploaded file appears to be empty.');
        return;
      }
      setResume(result.value, file.name);
    } catch {
      setError('Failed to parse the file. Please ensure it is a valid .docx document.');
    } finally {
      setParsing(false);
    }
  }, [setResume]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseDocx(file);
  }, [parseDocx]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseDocx(file);
  }, [parseDocx]);

  if (resumeText) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-green-800">Resume uploaded</p>
              <p className="text-sm text-green-600">{resumeFileName}</p>
            </div>
            <button
              onClick={() => { setResume('', ''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              className="text-sm text-green-700 hover:text-green-900 underline cursor-pointer"
            >
              Change file
            </button>
          </div>
        </div>
        <div className="bg-gray-50 border rounded-lg p-4 max-h-64 overflow-y-auto">
          <p className="text-xs text-gray-500 mb-2">Preview (extracted text):</p>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{resumeText.slice(0, 2000)}{resumeText.length > 2000 ? '\n...' : ''}</pre>
        </div>
        <AppendixUpload />
        <button
          onClick={() => setCurrentStep('queue')}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-medium cursor-pointer"
        >
          Continue to Job Descriptions
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {parsing ? (
          <p className="text-gray-500">Parsing document...</p>
        ) : (
          <>
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-600 font-medium">Drop your .docx resume here</p>
            <p className="text-sm text-gray-400 mt-1">or click to browse</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
