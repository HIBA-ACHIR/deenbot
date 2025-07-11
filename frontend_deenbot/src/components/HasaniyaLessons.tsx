import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Video, AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

// Lesson interface for both numbered and thematic videos
interface HasaniyaLesson {
  id: string;
  label: string;
  title: string;
  youtubeLink: string;
}

// Numbered lessons as specified
const NUMBERED_LESSONS: HasaniyaLesson[] = [
  {
    id: "lesson-1",
    label: "الدرس الأول",
    title: "أمير المؤمنين يترأس الدرس الأول من سلسلة الدروس الحسنية الرمضانية",
    youtubeLink: "https://www.youtube.com/watch?v=GlEeak8rGP4"
  },
  {
    id: "lesson-2",
    label: "الدرس الثاني",
    title: "الدرس الثاني من الدروس الحسنية الرمضانية",
    youtubeLink: "https://www.youtube.com/watch?v=KbqHTOqgWUU"
  },
  {
    id: "lesson-3",
    label: "الدرس الثالث",
    title: "الدرس الثالث من الدروس الحسنية",
    youtubeLink: "https://www.youtube.com/watch?v=j4oR06MTPms"
  },
  {
    id: "lesson-4",
    label: "الدرس الرابع",
    title: "أسرار القلب بين الإشارات الدينية والمتغيرات العلمية",
    youtubeLink: "https://www.youtube.com/watch?v=xChxxbPcMPo"
  },
  {
    id: "lesson-5",
    label: "الدرس الخامس",
    title: "دور العلماء المغاربة في حماية الهوية الوطنية",
    youtubeLink: "https://www.youtube.com/watch?v=50ioKM2wiI8"
  }
];

// Thematic lessons as specified
const THEMATIC_LESSONS: HasaniyaLesson[] = [
  {
    id: "theme-ramadan",
    label: "رمضان",
    title: "أمير المؤمنين يترأس الدرس الأول من سلسلة الدروس الحسنية الرمضانية",
    youtubeLink: "https://www.youtube.com/watch?v=GlEeak8rGP4"
  },
  {
    id: "theme-quran",
    label: "القرآن الكريم",
    title: "القرآن الكريم - روح الكون ومعارج التعرف إلى الله - د. فريد الأنصاري",
    youtubeLink: "https://www.youtube.com/watch?v=Rm3rZzicbB8"
  },
  {
    id: "theme-identity",
    label: "ثوابت الهوية الإسلامية",
    title: "الثوابت الدينية المشتركة عامل وحدة بين المغرب والدول الإفريقية",
    youtubeLink: "https://www.youtube.com/watch?v=E9lz8uFObtw"
  },
  {
    id: "theme-ethics",
    label: "الأخلاق",
    title: "أهمية الحديث الشريف في معرفة الأحكام والأخلاق - د. أبو بكر دوكوري",
    youtubeLink: "https://www.youtube.com/watch?v=sF1lG2vjZSo"
  }
];

// Helper function to extract video ID from YouTube URL
const extractVideoId = (url: string): string => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : "";
};

interface HasaniyaLessonsProps {
  isVisible: boolean;
}

const HasaniyaLessons: React.FC<HasaniyaLessonsProps> = ({ isVisible }) => {
  const [currentVideoId, setCurrentVideoId] = useState(extractVideoId(NUMBERED_LESSONS[0].youtubeLink));
  const [currentVideoTitle, setCurrentVideoTitle] = useState(NUMBERED_LESSONS[0].title);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [activeItemId, setActiveItemId] = useState<string>(NUMBERED_LESSONS[0].id);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Handle lesson selection with loading state
  const handleLessonSelect = (lesson: HasaniyaLesson) => {
    setIsLoading(true);
    setVideoError(false);
    setCurrentVideoId(extractVideoId(lesson.youtubeLink));
    setCurrentVideoTitle(lesson.title);
    setActiveItemId(lesson.id);
    
    // Simulate a slight loading delay for better UX
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  // Handle video error
  const handleVideoError = () => {
    setVideoError(true);
  };

  // Open direct YouTube link in a new tab
  const openYoutubeLink = () => {
    const url = `https://www.youtube.com/watch?v=${currentVideoId}`;
    window.open(url, '_blank');
  };

  if (!isVisible) {
    return null;
  }

  // Toutes les leçons disponibles, organisées par catégories
  const allLessons = [...NUMBERED_LESSONS, ...THEMATIC_LESSONS];

  // Effect to handle horizontal scrolling for topic buttons
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="flex flex-col h-full relative bg-white">
      <div className="px-4 py-2 bg-white z-10 sticky top-0 border-b border-gray-100">
        {/* Section des catégories combinées */}
        <div>
          <h3 className="text-xl font-bold mb-2 text-right text-green-500" dir="rtl" style={{fontFamily: 'Arial, sans-serif'}}>الدروس الحسنية</h3>
          <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto pb-2 mb-1 hide-scrollbar snap-x"
            dir="rtl"
          >
            <div className="flex space-x-3 rtl:space-x-reverse">
              {/* Afficher tous les boutons sur une même ligne */}
              {NUMBERED_LESSONS.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => handleLessonSelect(lesson)}
                  className={cn(
                    "px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 snap-start text-sm font-medium",
                    activeItemId === lesson.id
                      ? "bg-[#d1f7e4] text-primary font-semibold shadow-sm border border-primary/20"
                      : "bg-[#f1f5f9] text-gray-600 hover:bg-[#e2e8f0] hover:text-primary border border-transparent"
                  )}
                >
                  {lesson.label}
                </button>
              ))}
              
              {/* Afficher les thèmes sur la même ligne */}
              {THEMATIC_LESSONS.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => handleLessonSelect(lesson)}
                  className={cn(
                    "px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 snap-start text-sm font-medium",
                    activeItemId === lesson.id
                      ? "bg-[#d1f7e4] text-primary font-semibold shadow-sm border border-primary/20"
                      : "bg-[#f1f5f9] text-gray-600 hover:bg-[#e2e8f0] hover:text-primary border border-transparent"
                  )}
                >
                  {lesson.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden p-4 pt-2 relative min-h-[calc(100vh-56px-80px-64px)]">
        {currentVideoId ? (
          <div className="h-full flex flex-col">
            <div className="aspect-video w-full max-w-3xl mx-auto bg-primary/5 rounded-lg overflow-hidden shadow-md relative">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : videoError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/10 p-4 text-center">
                  <div className="text-red-500 mb-2 text-5xl">⚠️</div>
                  <h4 className="text-lg font-semibold mb-2">خطأ في تحميل الفيديو</h4>
                  <p className="text-muted-foreground">يرجى التحقق من الرابط والمحاولة مرة أخرى.</p>
                </div>
              ) : (
                <iframe
                  src={`https://www.youtube.com/embed/${currentVideoId}?rel=0`}
                  title={currentVideoTitle || 'فيديو درس حسني'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                  onLoad={() => setIsLoading(false)}
                  onError={() => setVideoError(true)}
                />
              )}
            </div>
            
            {currentVideoTitle && (
              <div className="my-4 text-center max-w-3xl mx-auto px-4">
                <h3 
                  className="font-[600] text-[18px] text-[#111827] leading-[1.6] font-['Tajawal',_sans-serif]" 
                  dir="rtl"
                  style={{ 
                    fontFamily: "'Tajawal', 'Cairo', 'Noto Naskh Arabic', sans-serif", 
                    letterSpacing: "normal",
                    maxWidth: "100%",
                    overflowWrap: "break-word"
                  }}
                >
                  {currentVideoTitle}
                </h3>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="p-6 bg-primary/5 rounded-lg border border-primary/10 shadow-sm">
              <h3 className="font-semibold text-lg mb-2" dir="rtl">اختر درساً للبدء</h3>
              <p className="text-muted-foreground" dir="rtl">يرجى اختيار درس من القائمة أعلاه لعرض المحتوى</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HasaniyaLessons;
