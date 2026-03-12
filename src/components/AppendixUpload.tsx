import { useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';

export default function AppendixUpload() {
  const { appendixImages, addAppendixImage, removeAppendixImage, moveAppendixImage } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const addImageFromBlob = useCallback(async (blob: Blob, name: string) => {
    if (!blob.type.startsWith('image/')) return;
    const buffer = await blob.arrayBuffer();
    addAppendixImage(buffer, name);
  }, [addAppendixImage]);

  const handleFiles = async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (/\.(png|jpe?g)$/i.test(file.name)) {
        await addImageFromBlob(file, file.name);
      }
    }
  };

  // Global paste handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            const ext = item.type.split('/')[1] || 'png';
            await addImageFromBlob(blob, `pasted-image-${Date.now()}.${ext}`);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addImageFromBlob]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-sm text-gray-500 hover:text-gray-700 underline cursor-pointer"
        >
          + Attach appendix images
        </button>
        <span className="text-xs text-gray-400">or paste from clipboard (Ctrl+V)</span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Drop zone */}
      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add('border-blue-400', 'bg-blue-50'); }}
        onDragLeave={() => dropRef.current?.classList.remove('border-blue-400', 'bg-blue-50')}
        onDrop={async (e) => {
          e.preventDefault();
          dropRef.current?.classList.remove('border-blue-400', 'bg-blue-50');
          if (e.dataTransfer.files) await handleFiles(e.dataTransfer.files);
        }}
        className="border border-dashed border-gray-300 rounded-md p-3 text-center text-xs text-gray-400 transition"
      >
        Drop images here
      </div>

      {appendixImages.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Appendix pages ({appendixImages.length}):</p>
          {appendixImages.map((img, idx) => (
            <div key={img.id} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded px-3 py-1.5">
              <span className="text-xs text-blue-700 truncate">{idx + 1}. {img.name}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => moveAppendixImage(img.id, 'up')}
                  disabled={idx === 0}
                  className="text-blue-400 hover:text-blue-600 disabled:opacity-30 px-1 text-xs cursor-pointer disabled:cursor-not-allowed"
                >&#9650;</button>
                <button
                  onClick={() => moveAppendixImage(img.id, 'down')}
                  disabled={idx === appendixImages.length - 1}
                  className="text-blue-400 hover:text-blue-600 disabled:opacity-30 px-1 text-xs cursor-pointer disabled:cursor-not-allowed"
                >&#9660;</button>
                <button
                  onClick={() => removeAppendixImage(img.id)}
                  className="text-red-400 hover:text-red-600 px-1 text-xs cursor-pointer"
                >&times;</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
