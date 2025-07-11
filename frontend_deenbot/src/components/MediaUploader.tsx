import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { FileAudio, FileVideo, Upload, File } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

interface MediaUploaderProps {
  onUploadSuccess: (transcriptionId: string, preview: string, topic?: string, conversationId?: string) => void;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({ onUploadSuccess }) => {
  const navigate = useNavigate();
  const MAX_FILE_SIZE_MB = 200; // Max file size in MB
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  
  // Détecter la langue active
  useEffect(() => {
    const handleLanguageChange = () => {
      const docLang = document.documentElement.lang || 'ar';
      setLanguage(docLang === 'en' ? 'en' : 'ar');
    };
    
    // Initialiser avec la langue actuelle
    handleLanguageChange();
    
    // Observer les changements de langue
    const observer = new MutationObserver(handleLanguageChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    console.log('MediaUploader mounted'); // Test log
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Check file size
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(
        language === 'ar'
          ? `حجم الملف يتجاوز الحد الأقصى (${MAX_FILE_SIZE_MB} ميغابايت)`
          : `File size exceeds the maximum limit (${MAX_FILE_SIZE_MB}MB)`
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
      }
      return;
    }
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav', 'video/mp4'];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error(language === 'ar' ? 'يسمح فقط بملفات الصوت (MP3, WAV) والفيديو (MP4)' : 'Only audio (MP3, WAV) and video (MP4) files are allowed');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Create controller to abort request if needed
      const controller = new AbortController();
      // Increase timeout to 30 minutes (1800000ms) for very large audio files
      const timeoutId = setTimeout(() => controller.abort(), 1800000); // Timeout after 30 minutes
      
      // Show progress animation with more realistic speed for large files
      // For large files, we'll slow down the progress increment
      let lastIncrementTime = Date.now();
      let isLargeFile = file.size > 50 * 1024 * 1024; // Files larger than 50MB
      
      // Show periodic updates to the user for large files
      if (isLargeFile) {
        toast.info(language === 'ar' ? 'ملف كبير - قد يستغرق الأمر بضع دقائق' : 'Large file - this may take a few minutes');
      }
      
      const progressInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - lastIncrementTime;
        lastIncrementTime = now;
        
        setUploadProgress(prev => {
          // For large files, progress more slowly
          let increment = isLargeFile ? 1 : 5;
          
          // Different stages of processing
          if (prev < 20) {
            // Upload phase
            return Math.min(prev + increment, 20);
          } else if (prev < 40) {
            // Initial processing
            return Math.min(prev + (increment * 0.8), 40);
          } else if (prev < 75) {
            // Transcription - slowest part for large files
            return Math.min(prev + (increment * 0.4), 75);
          } else if (prev < 90) {
            // Final processing
            return Math.min(prev + (increment * 0.3), 90);
          }
          return prev; // Stay at 90% until we get completion
        });
        
        // Periodically show a toast to reassure the user the upload is still processing
        if (isLargeFile && elapsed > 30000) { // Every 30s for large files
          const messagesAr = [
            'جاري معالجة الملف الكبير. يرجى الانتظار...',
            'ما زلنا نعمل على استخراج النص من الملف الصوتي الكبير',
            'يستغرق تحويل الملفات الكبيرة وقتًا أطول. شكرًا لصبرك.'
          ];
          const messagesEn = [
            'Processing large file. Please wait...',
            'Still extracting text from the large audio file',
            'Converting large files takes longer. Thanks for your patience.'
          ];
          const messages = language === 'ar' ? messagesAr : messagesEn;
          toast.info(messages[Math.floor(Math.random() * messages.length)]);
          lastIncrementTime = now; // Reset the timer
        }
      }, isLargeFile ? 3000 : 1000); // slower updates for large files

      // Make request with fetch and progress tracking
      // Note: Don't set Content-Type header for FormData - browser will set it with boundary
      const response = await fetch('http://localhost:8006/api/v1/media/upload-media', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json; charset=utf-8'
          // Let the browser set the Content-Type header with proper boundary for FormData
        }
      });

      clearInterval(progressInterval);
      clearTimeout(timeoutId);
      
      // Complete progress to 100%
      setUploadProgress(100);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.success) {
        toast.success('تم رفع الملف وتحويله بنجاح');
        
        // Keep local reference to data to prevent any race conditions
        const transcriptionId = data.transcription_id;
        const transcriptionPreview = data.transcription_preview;
        const topic = data.topic; // Extract the topic from the response
        
        // Use simple timeout instead of RAF to avoid React hook context issues
        // First show success toast
        toast.success('تم رفع الملف وتحويله بنجاح');
        
        // Delay callback to ensure it happens after current render cycle
        setTimeout(() => {
          // Call success handler with topic and conversationId
          onUploadSuccess(transcriptionId, transcriptionPreview, topic, data.conversation_id);
          if (data.conversation_id) {
            navigate(`/chat/${data.conversation_id}`);
          }
        }, 300);
        
        // Continue to finally block to reset the upload state
      } else {
        setUploadError(data.error || 'حدث خطأ أثناء رفع الملف');
        toast.error(data.error || 'حدث خطأ أثناء رفع الملف');
      }
    } catch (error) {
      setUploadError('خطأ في الاتصال بالخادم');
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // Provide more helpful message for timeout errors
          const timeoutMessage = 'انتهت مهلة معالجة الملف. قد يستغرق تحويل الملفات الصوتية الكبيرة وقتًا أطول. يرجى المحاولة بملف أقصر.';
          toast.error(timeoutMessage);
          setUploadError(timeoutMessage);
        } else {
          const errorMsg = 'خطأ في الاتصال بالخادم: ' + error.message;
          toast.error(errorMsg);
          setUploadError(errorMsg);
        }
      } else {
        const genericError = 'خطأ في الاتصال بالخادم';
        toast.error(genericError);
        setUploadError(genericError);
      }
      
      console.error('Upload error:', error);
    } finally {
      // Even if there's an error, we want to clear the uploading state
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000); // Small delay to show completion
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const cancelUpload = () => {
    if (!isUploading) return;
    
    setIsUploading(false);
    setUploadProgress(0);
    setUploadError(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    toast.info('تم إلغاء التحميل');
  };

  return (
    <div className="relative group overflow-hidden">
      {/* Fond subtil islamique */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="text-primary">
          <pattern id="islamic-media-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M10,0 L12,8 L20,10 L12,12 L10,20 L8,12 L0,10 L8,8 z" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#islamic-media-pattern)" />
        </svg>
      </div>
      
      <div className="border-0 rounded-md mb-2">
        
        <div className="relative">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept="audio/mpeg,audio/wav,audio/wave,audio/x-wav,video/mp4"
            disabled={isUploading}
            className="hidden"
            id="media-upload"
          />

          <div className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center hover:border-primary/40 transition-colors cursor-pointer bg-primary/5 hover:bg-primary/10">
            {!isUploading ? (
              <label htmlFor="media-upload" className="cursor-pointer w-full h-full flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10 mb-2">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <span className="text-primary font-medium" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  {language === 'ar' ? 'اختر ملف صوت أو فيديو' : 'Choose an audio or video file'}
                </span>
                <span className="text-xs text-muted-foreground max-w-xs" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  {language === 'ar' ? 'اسحب وأفلت أو انقر لتصفح ملفاتك' : 'Drag and drop or click to browse your files'}
                </span>
              </label>
            ) : (
              <div className="flex flex-col items-center justify-center py-2">
                <div 
                  className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full mb-3 animate-spin"
                  style={{ animationDuration: '2s' }}
                />
                <p className="text-primary font-medium mb-1" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  {language === 'ar' ? 'جاري معالجة الملف' : 'Processing file'}
                </p>
                <p className="text-xs text-muted-foreground" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  {language === 'ar' ? 'يرجى الانتظار أثناء معالجة المحتوى الخاص بك' : 'Please wait while your content is being processed'}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {isUploading && (
          <div className="mt-4 bg-primary/5 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="text-xs text-primary/80 font-medium" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  {language === 'ar' ? 'جاري معالجة المحتوى الإسلامي' : 'Processing Islamic content'}
                </span>
                <span className={`${language === 'ar' ? 'mr-2' : 'ml-2'} text-xs text-primary/60 font-medium`}>{uploadProgress}%</span>
              </div>
              <Button variant="ghost" size="sm" onClick={cancelUpload} className="h-7 text-xs text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
            <div className="w-full h-2 bg-primary/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                title={language === 'ar' ? 'جاري الرفع...' : 'Uploading...'}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              {language === 'ar' ? 
                (uploadProgress < 30 ? "جاري رفع الملف..." :
                uploadProgress < 60 ? "جاري معالجة الصوت..." :
                uploadProgress < 90 ? "جاري تحويل المحتوى..." :
                "جاري الانتهاء...") :
                (uploadProgress < 30 ? "Uploading file..." :
                uploadProgress < 60 ? "Processing audio..." :
                uploadProgress < 90 ? "Converting content..." :
                "Finishing...")
              }
            </p>
          </div>
        )}
        
        {uploadError && (
          <div className="mt-3 text-sm text-destructive bg-destructive/10 p-2 rounded-lg">
            <div className="flex items-start gap-2">
              <span>⚠️</span>
              <span>{uploadError}</span>
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground mt-4 flex flex-wrap items-center gap-x-3 gap-y-1" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <span className="font-medium">{language === 'ar' ? 'الصيغ المدعومة:' : 'Supported formats:'}</span>
          <span className="flex items-center gap-1"><FileAudio className="h-3 w-3" /> MP3, WAV</span>
          <span className="flex items-center gap-1"><FileVideo className="h-3 w-3" /> MP4</span>
        </div>
      </div>
    </div>
  );
};

export default MediaUploader;
