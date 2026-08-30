import React, { useState, useRef } from 'react';
import { FileText, Upload, Download, Eye, EyeOff, Trash2, RefreshCw, FileCode, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/config';
import type { ScratchBlockProperties } from '@/types/scratch';

interface FileBlockProps {
  properties?: ScratchBlockProperties;
  onChangeProperties: (properties: ScratchBlockProperties) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  autoFocus?: boolean;
}

export const FileBlock: React.FC<FileBlockProps> = ({
  properties = {},
  onChangeProperties,
  onKeyDown,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(true);
  const [showDocxViewer, setShowDocxViewer] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileUrl = properties.url;
  const originalName = properties.originalName || properties.fileName || 'Document';
  const fileSize = properties.size;
  const mimeType = properties.mimeType || '';
  const isPdf = mimeType.includes('pdf') || originalName.toLowerCase().endsWith('.pdf');
  const isDocx = mimeType.includes('word') || originalName.toLowerCase().endsWith('.docx') || originalName.toLowerCase().endsWith('.doc');
  const isImage = mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(originalName);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      // Save explicitly into backend temp/scratch folder
      const storageKey = `temp/scratch/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const uploadUrl = `${API_BASE_URL}/api/attachments/upload-local?key=${encodeURIComponent(storageKey)}`;
      const publicUrl = `${API_BASE_URL}/uploads/${storageKey}`;

      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`);
      }

      onChangeProperties({
        ...properties,
        url: publicUrl,
        storageKey,
        originalName: file.name,
        fileName: file.name,
        size: file.size,
        mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : file.name.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream'),
      });

      setShowPdfViewer(true);
      setShowDocxViewer(true);
    } catch (err: any) {
      console.error('File upload error:', err);
      setUploadError(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="w-full my-2 focus:outline-none select-none text-foreground"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.zip,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
      />

      {!fileUrl ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/10 scale-[1.01]'
              : 'border-border hover:border-primary/50 hover:bg-muted/30 bg-card'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs font-semibold text-foreground">Uploading document to backend temp folder...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-2">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Upload PDF, DOCX or Document</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Drag & drop your file here, or <span className="text-primary font-medium underline">browse</span>
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground/70 uppercase font-medium tracking-wider">
                Supports PDF, DOCX, DOC, Images & ZIP
              </p>
            </div>
          )}

          {uploadError && (
            <div className="flex items-center gap-1.5 text-xs text-destructive mt-3 bg-destructive/10 px-3 py-1.5 rounded-lg">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Notion File Card Header */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/20 transition-all shadow-xs group">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  isPdf
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    : isDocx
                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}
              >
                {isPdf ? 'PDF' : isDocx ? 'DOC' : <FileText className="h-5 w-5" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate hover:text-primary transition-colors">
                  {originalName}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{formatBytes(fileSize)}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Saved in Temp Folder
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isPdf && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPdfViewer(!showPdfViewer)}
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  title={showPdfViewer ? 'Hide PDF preview' : 'View PDF in page'}
                >
                  {showPdfViewer ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                  {showPdfViewer ? 'Hide' : 'View PDF'}
                </Button>
              )}

              {isDocx && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDocxViewer(!showDocxViewer)}
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  title={showDocxViewer ? 'Hide document viewer' : 'View document'}
                >
                  {showDocxViewer ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                  {showDocxViewer ? 'Hide' : 'View Doc'}
                </Button>
              )}

              <a
                href={fileUrl}
                download={originalName}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Download File"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Download
                </Button>
              </a>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                title="Replace File"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChangeProperties({ ...properties, url: undefined })}
                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                title="Remove File"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Embedded Image Preview */}
          {isImage && (
            <div className="rounded-xl overflow-hidden border border-border/80 bg-muted/20 shadow-xs max-w-2xl">
              <img
                src={fileUrl}
                alt={originalName}
                className="w-full max-h-[450px] object-contain"
              />
            </div>
          )}

          {/* Embedded PDF Viewer */}
          {isPdf && showPdfViewer && (
            <div className="border border-border rounded-xl overflow-hidden bg-muted/40 shadow-sm animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted border-b border-border text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5">
                  <FileCode className="h-3.5 w-3.5 text-rose-500" />
                  PDF Document Preview: {originalName}
                </span>
                <button
                  onClick={() => setShowPdfViewer(false)}
                  className="hover:text-foreground"
                >
                  Close Preview
                </button>
              </div>
              <iframe
                src={fileUrl}
                title={originalName}
                className="w-full h-[550px] border-none bg-white dark:bg-zinc-900"
              />
            </div>
          )}

          {/* Embedded DOCX Viewer / Container */}
          {isDocx && showDocxViewer && (
            <div className="border border-border rounded-xl overflow-hidden bg-muted/40 shadow-sm animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted border-b border-border text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                  Word Document (DOCX): {originalName}
                </span>
                <button
                  onClick={() => setShowDocxViewer(false)}
                  className="hover:text-foreground"
                >
                  Close Preview
                </button>
              </div>
              {fileUrl.startsWith('http://localhost') || fileUrl.startsWith('http://127.0.0.1') ? (
                <div className="p-8 flex flex-col items-center justify-center text-center bg-card">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground mb-1">{originalName}</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mb-4">
                    DOCX document stored locally in backend temp folder ({formatBytes(fileSize)}).
                  </p>
                  <div className="flex items-center gap-2">
                    <a href={fileUrl} download={originalName} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg">
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Download & Open DOCX
                      </Button>
                    </a>
                  </div>
                </div>
              ) : (
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
                  title={originalName}
                  className="w-full h-[550px] border-none bg-white"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
