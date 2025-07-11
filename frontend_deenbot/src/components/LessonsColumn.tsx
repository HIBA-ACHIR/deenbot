import React from "react"; // Removed useState as it's no longer used directly here
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  ClipboardCopyIcon,
} from "lucide-react";

interface Lesson {
  id: string;
  titleAr: string;
  titleEn: string;
  videoUrl?: string;
  originalVideoUrl: string; // Added for the direct YouTube link
  categoryAr?: string;
  categoryEn?: string;
}

// Helper to convert YouTube URL to embed URL
const getEmbedUrl = (url: string): string | undefined => {
  let videoId;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === "youtu.be") {
      videoId = urlObj.pathname.slice(1).split("?")[0];
    } else if (
      urlObj.hostname === "www.youtube.com" ||
      urlObj.hostname === "youtube.com"
    ) {
      if (urlObj.pathname === "/watch") {
        videoId = urlObj.searchParams.get("v");
      } else if (urlObj.pathname.startsWith("/live/")) {
        videoId = urlObj.pathname.split("/live/")[1]?.split("?")[0];
      } else if (urlObj.pathname.startsWith("/embed/")) {
        videoId = urlObj.pathname.split("/embed/")[1]?.split("?")[0];
        if (videoId) return `https://www.youtube.com/embed/${videoId}`; // Already an embed URL or can be reconstructed
      }
    }
  } catch (error) {
    console.error("Error parsing YouTube URL:", url, error);
    return undefined;
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : undefined;
};

const mockLessons: Lesson[] = [
  {
    id: "1",
    titleAr:
      "أمير المؤمنين يترأس اليوم الجمعة الدرس الأول من سلسلة الدروس الحسنية الرمضانية",
    titleEn: "The Status of Knowledge and Scholars in Islam",
    videoUrl: getEmbedUrl(
      "https://www.youtube.com/live/GlEeak8rGP4?si=iJ8Oj7D3J28blBdC"
    ),
    originalVideoUrl:
      "https://www.youtube.com/live/GlEeak8rGP4?si=iJ8Oj7D3J28blBdC",
    categoryAr: "الدرس الحسني الأول",
    categoryEn: "First Hassani Lesson",
  },
  {
    id: "2",
    titleAr:
      "أمير المؤمنين يترأس الدرس الثاني من سلسلة الدروس الحسنية الرمضانية",
    titleEn: "Exegesis of Surah Al-Fatiha and beginning of Al-Baqarah",
    videoUrl: getEmbedUrl(
      "https://www.youtube.com/live/KbqHTOqgWUU?si=jCEOAqkv8PL1ZT-i"
    ),
    originalVideoUrl:
      "https://www.youtube.com/live/KbqHTOqgWUU?si=jCEOAqkv8PL1ZT-i",
    categoryAr: "الدرس الحسني الثاني",
    categoryEn: "Second Hassani Lesson",
  },
  {
    id: "3",
    titleAr: "جهود مسلمي الهند في خدمة الحديث الشريف",
    titleEn: "The Family in Islam: Rights and Responsibilities",
    videoUrl: getEmbedUrl("https://youtu.be/MS7_R5fycl4?si=HhrHfhRIPybyVl7f"),
    originalVideoUrl: "https://youtu.be/MS7_R5fycl4?si=HhrHfhRIPybyVl7f",
    categoryAr: "الدرس الحسني الثالث",
    categoryEn: "Third Hassani Lesson",
  },
  {
    id: "4",
    titleAr: "اختلاف الفقهاء في اجتهاداتهم وطرق الاستفادة منه",
    titleEn: "Objectives of Islamic Law and the Five Necessities",
    videoUrl: getEmbedUrl("https://youtu.be/ilWqeOoDoz4?si=pAD7XVqSAEqihHxC"),
    originalVideoUrl: "https://youtu.be/ilWqeOoDoz4?si=pAD7XVqSAEqihHxC",
    categoryAr: "الدرس الحسني الرابع",
    categoryEn: "Fourth Hassani Lesson",
  },
  {
    id: "5",
    titleAr: "ثوابت الهوية الإسلامية في افريقيا وتحديات المحافظة عليها",
    titleEn: "Mercy in the Life of Prophet Muhammad (PBUH)",
    videoUrl: getEmbedUrl("https://youtu.be/GcFfN1vJ8xY?si=PRJHLCAoHgDYLGMQ"),
    originalVideoUrl: "https://youtu.be/GcFfN1vJ8xY?si=PRJHLCAoHgDYLGMQ",
    categoryAr: "الدرس الحسني الخامس",
    categoryEn: "Fifth Hassani Lesson",
  },
  {
    id: "6",
    titleAr: "الإيضاح والبيان في أن حب الأوطان من الإيمان",
    titleEn: "The Importance and Investment of Time in a Muslim's Life",
    videoUrl: getEmbedUrl("https://www.youtube.com/watch?v=qAzk21YTEfQ"),
    originalVideoUrl: "https://www.youtube.com/watch?v=qAzk21YTEfQ",
    categoryAr: "الدرس الحسني السادس",
    categoryEn: "Sixth Hassani Lesson",
  },
  {
    id: "7",
    titleAr: "أخلاق المحافظة على البيئة في الإسلام",
    titleEn: "The Ethics of Environmental Preservation in Islam",
    videoUrl: getEmbedUrl("https://youtu.be/6cEPkJ19PEk?si=gYClb_Tor-YHsBaK"),
    originalVideoUrl: "https://youtu.be/6cEPkJ19PEk?si=gYClb_Tor-YHsBaK",
    categoryAr: "الدرس الحسني السابع",
    categoryEn: "Seventh Hassani Lesson",
  },
];

// ... (Lesson interface and mockLessons remain the same) ...

interface LessonsColumnProps {
  language: "ar" | "en";
  expandedLessonId: string | null;
  onToggleExpand: (lessonId: string) => void;
  onUseVideo: (originalUrl: string) => void; // Added callback for using video URL
}

const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const listItemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      duration: 0.4,
    },
  },
};

const LessonsColumn: React.FC<LessonsColumnProps> = ({
  language,
  expandedLessonId,
  onToggleExpand,
  onUseVideo,
}) => {
  return (
    <div
      className="bg-white p-4 md:p-6 rounded-xl shadow-2xl relative overflow-hidden min-h-[400px] border border-[#00695C]/20"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2300695C' fill-opacity='0.03' fill-rule='evenodd'%3E%3Cpath d='M0 0h40v40H0zM20 5a15 15 0 100 30 15 15 0 000-30zm0 5a10 10 0 100 20 10 10 0 000-20z'/%3E%3C/g%3E%3C/svg%3E\")",
      }}
    >
      <h2
        className="text-3xl md:text-4xl font-bold text-[#00695C] mb-8 pb-3 border-b-2 border-[#8cc63f]/60 tracking-tight"
        style={{
          fontFamily:
            language === "ar"
              ? '"Reem Kufi", "Amiri", serif'
              : '"Poppins", sans-serif',
        }}
      >
        {language === "ar"
          ? "الدروس والمحاضرات الحسنية"
          : "Hassani Lessons & Lectures"}
      </h2>

      <motion.div // New: Container for stagger animation
        className="space-y-6"
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {mockLessons.map((lesson) => {
          const isExpanded = expandedLessonId === lesson.id;
          const title = language === "ar" ? lesson.titleAr : lesson.titleEn;
          const category =
            language === "ar" ? lesson.categoryAr : lesson.categoryEn;

          return (
            <motion.div
              key={lesson.id}
              variants={listItemVariants} // Apply item variants
              layout // Keep layout for expand/collapse
              // initial={{ borderRadius: '0.75rem' }} // Removed as variants handle initial state
              className={`bg-gradient-to-br from-white to-gray-50 p-4 md:p-5 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out border border-gray-200/70 overflow-hidden cursor-pointer ${
                isExpanded ? "ring-2 ring-[#8cc63f]" : ""
              }`}
              onClick={() => onToggleExpand(lesson.id)}
            >
              <motion.div layout className="flex justify-between items-center">
                <div
                  className={`flex items-center gap-3 ${
                    language === "ar" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg bg-[#00695C]/10 text-[#00695C]`}
                  >
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <h3
                      className={`text-lg md:text-xl font-semibold text-[#004d40] font-sans ${
                        language === "ar" ? "text-right" : "text-left"
                      }`}
                    >
                      {title}
                    </h3>
                    {category && (
                      <p
                        className={`text-xs text-gray-500 font-sans ${
                          language === "ar" ? "text-right" : "text-left"
                        }`}
                      >
                        {category}
                      </p>
                    )}
                  </div>
                </div>
                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                  {isExpanded ? (
                    <ChevronUp size={24} className="text-[#00695C]" />
                  ) : (
                    <ChevronDown size={24} className="text-[#00695C]" />
                  )}
                </motion.div>
              </motion.div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: "1rem" }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    {lesson.videoUrl && (
                      <div className="aspect-video rounded-lg overflow-hidden shadow-inner border border-gray-200">
                        <iframe
                          width="100%"
                          height="100%"
                          src={lesson.videoUrl}
                          title={title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (lesson.originalVideoUrl) {
                          onUseVideo(lesson.originalVideoUrl);
                        }
                      }}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#00796B] hover:bg-[#00695C] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00695C] transition-colors duration-150"
                    >
                      <ClipboardCopyIcon size={16} />
                      {language === "ar"
                        ? "استخدم هذا الرابط للتحويل"
                        : "Use this Link for Conversion"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default LessonsColumn;
