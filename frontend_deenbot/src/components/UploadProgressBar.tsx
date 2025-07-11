import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadProgressBarProps {
  visible: boolean;
  progress: number;
  status: string;
}

const UploadProgressBar: React.FC<UploadProgressBarProps> = ({
  visible,
  progress,
  status
}) => {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
    >
      <div className="flex flex-col items-center">
        {/* Main progress bar */}
        <div className="relative w-full h-1 bg-gray-100">
          <motion.div
            className="absolute top-0 left-0 h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        
        {/* Status message with Islamic styling */}
        <div className="bg-white shadow-md py-2 px-6 rounded-b-lg border-x border-b border-primary/10 flex items-center gap-2">
          <div className="relative">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
            
            {/* Islamic accent */}
            <div className="absolute -inset-1 opacity-10">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="text-primary">
                <pattern id="progress-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M10,0 L12,8 L20,10 L12,12 L10,20 L8,12 L0,10 L8,8 z" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#progress-pattern)" />
              </svg>
            </div>
          </div>
          
          <span className="text-sm text-primary font-medium">{status}</span>
          
          {/* Progress percentage */}
          <span className="text-xs text-primary/70 font-medium ml-2">{Math.round(progress)}%</span>
        </div>
      </div>
    </motion.div>
  );
};

export default UploadProgressBar;
