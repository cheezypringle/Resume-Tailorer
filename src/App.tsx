import { AppProvider, useApp } from './context/AppContext';
import ResumeUpload from './components/ResumeUpload';
import JDQueue from './components/JDQueue';
import ResultView from './components/ResultView';

function ApiKeyInput() {
  const { apiKey, setApiKey } = useApp();
  if (apiKey) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Resume Tailor</h1>
        <p className="text-sm text-gray-500">
          Enter your OpenRouter API key to get started. Your key stays in your browser and is never stored.
        </p>
        <input
          type="password"
          placeholder="sk-or-..."
          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = (e.target as HTMLInputElement).value.trim();
              if (val) setApiKey(val);
            }
          }}
        />
        <button
          onClick={() => {
            const input = document.querySelector('input[type="password"]') as HTMLInputElement;
            if (input?.value.trim()) setApiKey(input.value.trim());
          }}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition text-sm cursor-pointer"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const { apiKey, currentStep, resetAll } = useApp();

  if (!apiKey) return <ApiKeyInput />;

  const steps = [
    { key: 'upload', label: '1. Upload Resume' },
    { key: 'queue', label: '2. Job Descriptions' },
    { key: 'results', label: '3. Results' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Resume Tailor</h1>
          <button
            onClick={resetAll}
            className="text-xs text-gray-400 hover:text-red-500 cursor-pointer"
          >
            Reset All
          </button>
        </div>
      </header>

      {/* Step indicator */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-6">
          {steps.map((step) => (
            <div
              key={step.key}
              className={`flex-1 text-center text-xs py-1.5 rounded-full ${
                currentStep === step.key
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {step.label}
            </div>
          ))}
        </div>

        {currentStep === 'upload' && <ResumeUpload />}
        {currentStep === 'queue' && <JDQueue />}
        {currentStep === 'results' && <ResultView />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
