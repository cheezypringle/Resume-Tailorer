import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function JDQueue() {
  const { jobDescriptions, addJD, removeJD, moveJD, setCurrentStep, setSelectedJDId, updateJD } = useApp();
  const [label, setLabel] = useState('');
  const [text, setText] = useState('');

  const handleAdd = () => {
    if (!text.trim()) return;
    addJD(label.trim(), text.trim());
    setLabel('');
    setText('');
  };

  const handleProcess = (id: string) => {
    setSelectedJDId(id);
    setCurrentStep('results');
  };

  const handleProcessNext = () => {
    const next = jobDescriptions.find(jd => jd.status === 'pending');
    if (next) handleProcess(next.id);
  };

  const pendingCount = jobDescriptions.filter(jd => jd.status === 'pending').length;
  const doneCount = jobDescriptions.filter(jd => jd.status === 'done').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep('upload')}
          className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          &larr; Back to Resume
        </button>
        {jobDescriptions.length > 0 && (
          <p className="text-sm text-gray-500">
            {doneCount} done, {pendingCount} pending
          </p>
        )}
      </div>

      {/* Add JD Form */}
      <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
        <input
          type="text"
          placeholder="Label (e.g. Stripe — Senior PM)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <textarea
          placeholder="Paste the full job description here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
        <button
          onClick={handleAdd}
          disabled={!text.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
        >
          Add to Queue
        </button>
      </div>

      {/* Queue List */}
      {jobDescriptions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Queue</h3>
          {jobDescriptions.map((jd, idx) => (
            <div
              key={jd.id}
              className="flex items-center justify-between bg-white border rounded-lg p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                  jd.status === 'done' ? 'bg-green-500' :
                  jd.status === 'processing' ? 'bg-yellow-500' :
                  jd.status === 'error' ? 'bg-red-500' :
                  'bg-gray-300'
                }`} />
                <span className="text-sm truncate">{jd.label}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {jd.status === 'done' && (
                  <button
                    onClick={() => handleProcess(jd.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 cursor-pointer"
                  >
                    View
                  </button>
                )}
                {jd.status === 'pending' && (
                  <button
                    onClick={() => handleProcess(jd.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 cursor-pointer"
                  >
                    Tailor
                  </button>
                )}
                {jd.status === 'error' && (
                  <button
                    onClick={() => { updateJD(jd.id, { status: 'pending' }); handleProcess(jd.id); }}
                    className="text-xs text-orange-600 hover:text-orange-800 px-2 py-1 cursor-pointer"
                  >
                    Retry
                  </button>
                )}
                <button
                  onClick={() => moveJD(jd.id, 'up')}
                  disabled={idx === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-1 cursor-pointer disabled:cursor-not-allowed"
                  title="Move up"
                >&#9650;</button>
                <button
                  onClick={() => moveJD(jd.id, 'down')}
                  disabled={idx === jobDescriptions.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-1 cursor-pointer disabled:cursor-not-allowed"
                  title="Move down"
                >&#9660;</button>
                <button
                  onClick={() => removeJD(jd.id)}
                  className="text-red-400 hover:text-red-600 px-1 cursor-pointer"
                  title="Remove"
                >&times;</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Process Next Button */}
      {pendingCount > 0 && (
        <button
          onClick={handleProcessNext}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition font-medium cursor-pointer"
        >
          Process Next ({pendingCount} pending)
        </button>
      )}
    </div>
  );
}
