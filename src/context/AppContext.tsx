import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { JobDescription, AppStep } from '../types';

export interface AppendixImage {
  id: string;
  data: ArrayBuffer;
  name: string;
}

interface AppState {
  apiKey: string;
  setApiKey: (key: string) => void;
  resumeText: string;
  resumeFileName: string;
  setResume: (text: string, fileName: string) => void;
  jobDescriptions: JobDescription[];
  addJD: (label: string, text: string) => void;
  removeJD: (id: string) => void;
  updateJD: (id: string, updates: Partial<JobDescription>) => void;
  moveJD: (id: string, direction: 'up' | 'down') => void;
  currentStep: AppStep;
  setCurrentStep: (step: AppStep) => void;
  selectedJDId: string | null;
  setSelectedJDId: (id: string | null) => void;
  appendixImages: AppendixImage[];
  addAppendixImage: (data: ArrayBuffer, name: string) => void;
  removeAppendixImage: (id: string) => void;
  moveAppendixImage: (id: string, direction: 'up' | 'down') => void;
  clearAppendixImages: () => void;
  googleSheetsUrl: string;
  setGoogleSheetsUrl: (url: string) => void;
  resetAll: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem('rt_apiKey') || '');
  const [resumeText, setResumeText] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [currentStep, setCurrentStep] = useState<AppStep>('upload');
  const [selectedJDId, setSelectedJDId] = useState<string | null>(null);
  const [appendixImages, setAppendixImages] = useState<AppendixImage[]>([]);
  const [googleSheetsUrl, setGoogleSheetsUrlState] = useState(() => localStorage.getItem('rt_sheetsUrl') || '');

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    localStorage.setItem('rt_apiKey', key);
  }, []);

  const setGoogleSheetsUrl = useCallback((url: string) => {
    setGoogleSheetsUrlState(url);
    localStorage.setItem('rt_sheetsUrl', url);
  }, []);

  const setResume = useCallback((text: string, fileName: string) => {
    setResumeText(text);
    setResumeFileName(fileName);
  }, []);

  const addAppendixImage = useCallback((data: ArrayBuffer, name: string) => {
    setAppendixImages(prev => [...prev, { id: crypto.randomUUID(), data, name }]);
  }, []);

  const removeAppendixImage = useCallback((id: string) => {
    setAppendixImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const moveAppendixImage = useCallback((id: string, direction: 'up' | 'down') => {
    setAppendixImages(prev => {
      const idx = prev.findIndex(img => img.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }, []);

  const clearAppendixImages = useCallback(() => {
    setAppendixImages([]);
  }, []);

  const addJD = useCallback((label: string, text: string) => {
    const jd: JobDescription = {
      id: crypto.randomUUID(),
      label: label || 'Untitled Role',
      text,
      status: 'pending',
    };
    setJobDescriptions(prev => [...prev, jd]);
  }, []);

  const removeJD = useCallback((id: string) => {
    setJobDescriptions(prev => prev.filter(jd => jd.id !== id));
  }, []);

  const updateJD = useCallback((id: string, updates: Partial<JobDescription>) => {
    setJobDescriptions(prev =>
      prev.map(jd => (jd.id === id ? { ...jd, ...updates } : jd))
    );
  }, []);

  const moveJD = useCallback((id: string, direction: 'up' | 'down') => {
    setJobDescriptions(prev => {
      const idx = prev.findIndex(jd => jd.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setResumeText('');
    setResumeFileName('');
    setJobDescriptions([]);
    setCurrentStep('upload');
    setSelectedJDId(null);
    setAppendixImages([]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        apiKey, setApiKey,
        resumeText, resumeFileName, setResume,
        jobDescriptions, addJD, removeJD, updateJD, moveJD,
        currentStep, setCurrentStep,
        selectedJDId, setSelectedJDId,
        appendixImages, addAppendixImage, removeAppendixImage, moveAppendixImage, clearAppendixImages,
        googleSheetsUrl, setGoogleSheetsUrl,
        resetAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
