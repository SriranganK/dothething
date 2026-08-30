import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  ExternalLink,
  Maximize2,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/config';
import type { ScratchBlockProperties } from '@/types/scratch';

interface ImageBlockProps {
  properties?: ScratchBlockProperties;
  onChangeProperties: (properties: ScratchBlockProperties) => void;
  onDelete?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  autoFocus?: boolean;
}

export const ImageBlock: React.FC<ImageBlockProps> = ({
  properties = {},
  onChangeProperties,
  onDelete,
  onKeyDown,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageUrl = properties.url;
  const caption = properties.caption || '';
  const originalName = properties.originalName || 'Image';

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, GIF, WebP, SVG)');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const cleanName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'image.png';
      const storageKey = `temp/scratch/${Date.now()}-${cleanName}`;
      const uploadUrl = `${API_BASE_URL}/api/attachments/upload-local?key=${encodeURIComponent(storageKey)}`;
      const publicUrl = `${API_BASE_URL}/uploads/${storageKey}`;

      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'image/png',
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
        size: file.size,
        mimeType: file.type || 'image/png',
      });
    } catch (err: any) {
      console.error('Image upload error:', err);
      setUploadError(err.message || 'Failed to upload image');
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

  const handleCaptionChange = (val: string) => {
    onChangeProperties({
      ...properties,
      caption: val,
    });
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="w-full my-3 focus:outline-none select-none group/imgblock"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />

      {!imageUrl ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/10 scale-[1.01]'
              : 'border-border hover:border-primary/50 hover:bg-muted/30 bg-card/60'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs font-semibold text-foreground">Uploading image...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-2.5">
              <div className="p-3.5 rounded-2xl bg-primary/10 text-primary">
                <ImageIcon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Add an Image</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Drag and drop, or <span className="text-primary font-medium underline">browse</span> (or paste directly via Ctrl+V)
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground/60 uppercase font-medium tracking-wider">
                PNG, JPG, GIF, WebP, SVG
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
        <div className="relative inline-block w-full max-w-3xl">
          {/* Main Image Container */}
          <div className="relative group/image overflow-hidden rounded-2xl border border-border/80 bg-muted/20 shadow-sm transition-all hover:shadow-md">
            <img
              src={imageUrl}
              alt={caption || originalName}
              loading="lazy"
              onClick={() => setLightboxOpen(true)}
              className="w-full max-h-[550px] object-contain cursor-zoom-in bg-black/5 dark:bg-white/5"
            />

            {/* Floating Image Actions (Visible on hover) */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/75 dark:bg-zinc-900/90 backdrop-blur-md px-1.5 py-1 rounded-xl shadow-lg opacity-0 group-hover/image:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                title="Zoom image"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>

              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                title="Open in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <a
                href={imageUrl}
                download={originalName}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                title="Download image"
              >
                <Download className="h-3.5 w-3.5" />
              </a>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                title="Replace image"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>

              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                  title="Delete image"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Caption Input */}
          <div className="mt-1.5 px-1">
            <input
              type="text"
              value={caption}
              onChange={(e) => handleCaptionChange(e.target.value)}
              placeholder="Write a caption..."
              className="w-full text-xs text-muted-foreground placeholder:text-muted-foreground/40 bg-transparent border-none outline-none text-center hover:placeholder:text-muted-foreground/60 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && imageUrl && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in-50 duration-150"
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer z-10"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={imageUrl}
            alt={caption || originalName}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[92vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
