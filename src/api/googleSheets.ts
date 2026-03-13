export interface SheetRowData {
  role: string;
  company: string;
  resumeFile: string;       // base64-encoded .docx
  resumeFileName: string;   // e.g. "Stripe Senior PM.docx"
  companyResearch: string;
  jobResearch: string;
  commonQuestions: string;
  coachAdvice: string;
  timestamp: string;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g. "data:application/octet-stream;base64,")
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function appendToGoogleSheet(
  scriptUrl: string,
  data: SheetRowData,
): Promise<void> {
  // Google Apps Script redirects on POST (302), causing CORS issues.
  // mode: 'no-cors' lets the request go through — we get an opaque response
  // but the script still executes server-side.
  await fetch(scriptUrl, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify(data),
  });
}

export async function testSheetConnection(scriptUrl: string): Promise<boolean> {
  try {
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        test: true,
        timestamp: new Date().toISOString(),
      }),
    });
    // With no-cors we can't read the response, so if fetch didn't throw, assume success
    return true;
  } catch {
    return false;
  }
}
