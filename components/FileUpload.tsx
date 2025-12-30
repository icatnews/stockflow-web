import React, { useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, Film } from 'lucide-react';
import { MediaFile } from '../types';
import { fileToGenerativePart } from '../services/geminiService';

interface FileUploadProps {
  onFileSelect: (media: MediaFile) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const handleFileChange = useCallback(async (file: File) => {
    if (!file) return;

    // Validate size (approx 20MB limit for inline base64 safety in browser)
    if (file.size > 20 * 1024 * 1024) {
      alert("File is too large. Please upload files smaller than 20MB for this demo.");
      return;
    }

    const type = file.type.startsWith('video/') ? 'image' : 'image'; // Default to image logic, check strict mime below
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      alert("Please upload a valid image or video file.");
      return;
    }

    // Generate preview URL
    const previewUrl = URL.createObjectURL(file);
    
    // Prepare base64 data
    try {
        const { data, mimeType } = await fileToGenerativePart(file);
        
        onFileSelect({
            file,
            previewUrl,
            type: isVideo ? 'video' : 'image',
            base64Data: data,
            mimeType: mimeType
        });
    } catch (e) {
        console.error("Error processing file", e);
        alert("Failed to process file.");
    }

  }, [onFileSelect]);

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (isLoading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  return (
    <div className="w-full">
      <label
        onDrop={onDrop}
        onDragOver={onDragOver}
        htmlFor="media-upload"
        className={`
          relative group flex flex-col items-center justify-center w-full h-64 
          border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
          ${isLoading 
            ? 'border-gray-700 bg-gray-900/30 cursor-not-allowed opacity-50' 
            : 'border-gray-600 bg-gray-800/20 hover:bg-gray-800/40 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10'
          }
        `}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
          <div className={`p-4 rounded-full mb-4 transition-colors ${isLoading ? 'bg-gray-800' : 'bg-gray-800 group-hover:bg-indigo-600/20'}`}>
            <UploadCloud className={`w-8 h-8 ${isLoading ? 'text-gray-600' : 'text-gray-400 group-hover:text-indigo-400'}`} />
          </div>
          <p className="mb-2 text-lg font-medium text-gray-300">
            <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500 max-w-xs">
            Supported: JPG, PNG, WEBP, MP4, WEBM (Max 20MB)
          </p>
          <div className="flex gap-4 mt-4 text-xs font-mono text-gray-600">
            <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Images</span>
            <span className="flex items-center gap-1"><Film className="w-3 h-3" /> Videos</span>
          </div>
        </div>
        <input 
          id="media-upload" 
          type="file" 
          className="hidden" 
          accept="image/*,video/*"
          onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
          disabled={isLoading}
        />
      </label>
    </div>
  );
};

export default FileUpload;