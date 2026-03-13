import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { testSheetConnection } from '../api/googleSheets';

const APPS_SCRIPT_CODE = `function getOrCreateFolder() {
  var folders = DriveApp.getFoldersByName('Resume Tailorer');
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder('Resume Tailorer');
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);

  // Handle test connection
  if (data.test) {
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // Add headers if sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp', 'Role', 'Company', 'Resume',
      'Company Research', 'Job Research', 'Common Questions', 'Coach Advice'
    ]);
  }

  // Save resume .docx to Drive and get link
  var resumeLink = '';
  if (data.resumeFile) {
    try {
      var folder = getOrCreateFolder();
      var bytes = Utilities.base64Decode(data.resumeFile);
      var blob = Utilities.newBlob(bytes,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        data.resumeFileName || 'resume.docx');
      var file = folder.createFile(blob);
      resumeLink = file.getUrl();
    } catch (err) {
      resumeLink = 'ERROR: ' + err.message;
    }
  }

  sheet.appendRow([
    data.timestamp,
    data.role,
    data.company,
    resumeLink,
    data.companyResearch,
    data.jobResearch,
    data.commonQuestions,
    data.coachAdvice
  ]);

  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export default function Settings({ onClose }: { onClose: () => void }) {
  const { googleSheetsUrl, setGoogleSheetsUrl } = useApp();
  const [url, setUrl] = useState(googleSheetsUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    setGoogleSheetsUrl(url.trim());
    onClose();
  };

  const handleTest = async () => {
    if (!url.trim()) return;
    setTesting(true);
    setTestResult(null);
    const ok = await testSheetConnection(url.trim());
    setTestResult(ok ? 'success' : 'fail');
    setTesting(false);
  };

  const handleCopyScript = async () => {
    await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">&times;</button>
          </div>

          {/* Google Sheets Integration */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Google Sheets Tracker</h3>
            <p className="text-xs text-gray-500">
              Automatically log each processed job to a Google Sheet. Each row includes: role, company, tailored resume, research, and interview questions.
            </p>

            <div className="space-y-2">
              <label className="text-xs text-gray-600">Apps Script Web App URL</label>
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setTestResult(null); }}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleTest}
                disabled={!url.trim() || testing}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              {testResult === 'success' && <span className="text-xs text-green-600 self-center">Connected!</span>}
              {testResult === 'fail' && <span className="text-xs text-red-600 self-center">Failed — check URL</span>}
            </div>

            {/* Setup instructions */}
            <div className="border-t pt-3 mt-3">
              <button
                onClick={() => setShowScript(!showScript)}
                className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                {showScript ? 'Hide setup instructions' : 'How to set up Google Sheets integration'}
              </button>

              {showScript && (
                <div className="mt-3 space-y-2 text-xs text-gray-600">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Create a new Google Sheet</li>
                    <li>Go to <strong>Extensions &gt; Apps Script</strong></li>
                    <li>Replace the code with the script below</li>
                    <li>Click <strong>Deploy &gt; New deployment</strong></li>
                    <li>Type: <strong>Web app</strong>, Execute as: <strong>Me</strong>, Access: <strong>Anyone</strong></li>
                    <li>Copy the deployment URL and paste it above</li>
                  </ol>

                  <div className="relative">
                    <pre className="bg-gray-900 text-green-400 p-3 rounded-md overflow-x-auto text-[11px] leading-relaxed">
                      {APPS_SCRIPT_CODE}
                    </pre>
                    <button
                      onClick={handleCopyScript}
                      className="absolute top-2 right-2 text-[10px] bg-gray-700 text-gray-300 hover:text-white px-2 py-1 rounded cursor-pointer"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
