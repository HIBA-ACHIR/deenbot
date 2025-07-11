import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Link2,
  Youtube,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button"; // Assuming shadcn/ui Button
import { Input } from "@/components/ui/input"; // Assuming shadcn/ui Input

interface DirectYouTubeProcessorProps {
  onSuccess: (
    transcriptionId: string,
    preview: string,
    topic?: string,
    conversationId?: string
  ) => void;
  initialYoutubeUrl?: string | null;
  onUrlProcessed?: () => void;
}

const youtubeUrlSchema = z.object({
  url: z
    .string()
    .min(1, {
      message: "ar:الرجاء إدخال رابط يوتيوب|en:Please enter a YouTube link",
    })
    .regex(new RegExp("^(https?://)?(www\\.)?(youtube\\.com|youtu\\.be)/.+"), {
      message:
        "ar:الرجاء إدخال رابط يوتيوب صحيح|en:Please enter a valid YouTube link",
    }),
});

type YouTubeFormValues = z.infer<typeof youtubeUrlSchema>;

const DirectYouTubeProcessor: React.FC<DirectYouTubeProcessorProps> = ({
  onSuccess,
  initialYoutubeUrl,
  onUrlProcessed,
}) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [language, setLanguage] = useState<"ar" | "en">("ar");

  useEffect(() => {
    const handleLanguageChange = () => {
      const docLang = document.documentElement.lang || "ar";
      setLanguage(docLang === "en" ? "en" : "ar");
    };
    handleLanguageChange();
    const observer = new MutationObserver(handleLanguageChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    console.log("DirectYouTubeProcessor mounted"); // Test log
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<YouTubeFormValues>({
    resolver: zodResolver(youtubeUrlSchema),
  });

  useEffect(() => {
    if (initialYoutubeUrl) {
      setValue("url", initialYoutubeUrl); // Set the form value
      onUrlProcessed?.(); // Notify parent that URL has been processed
    }
  }, [initialYoutubeUrl, setValue, onUrlProcessed]);

  const getLocalizedMessage = (messageKey: string) => {
    const parts = messageKey.split("|");
    if (parts.length === 2) {
      const arMsg = parts[0].replace("ar:", "");
      const enMsg = parts[1].replace("en:", "");
      return language === "ar" ? arMsg : enMsg;
    }
    return messageKey; // Fallback
  };

  const onSubmit: SubmitHandler<YouTubeFormValues> = async (data) => {
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage(
      getLocalizedMessage("ar:جاري التهيئة...|en:Initializing...")
    );
    toast.info(
      getLocalizedMessage(
        "ar:جاري معالجة فيديو يوتيوب...|en:Processing YouTube video..."
      )
    );
    console.log("🎬 Processing YouTube URL:", data.url);

    let progressInterval: NodeJS.Timeout;

    // Simulate initial progress quickly
    setProgress(10);
    setProgressMessage(
      getLocalizedMessage("ar:جاري تحميل الفيديو...|en:Downloading video...")
    );
    console.log("⬇️ Starting download phase for YouTube video...");

    // More realistic progress simulation
    progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 30) return prev + 5; // Downloading
        if (prev < 60) {
          setProgressMessage(
            getLocalizedMessage(
              "ar:جاري استخراج الصوت...|en:Extracting audio..."
            )
          );
          return prev + 3;
        } // Extracting
        if (prev < 90) {
          setProgressMessage(
            getLocalizedMessage(
              "ar:جاري تحويل المحتوى...|en:Converting content..."
            )
          );
          return prev + 2;
        } // Converting
        setProgressMessage(
          getLocalizedMessage("ar:جاري الانتهاء...|en:Finishing up...")
        );
        return prev < 95 ? prev + 1 : prev; // Finishing up, cap at 95%
      });
    }, 800);

    try {
      const apiUrls = [
        "http://localhost:8006/api/v1/media/process-youtube",
        "http://192.168.100.63:8006/api/v1/media/process-youtube",
      ];
      let responseOk = false;
      let resultData: any;

      for (const apiUrl of apiUrls) {
        try {
          console.log(
            `🌐 Calling API: ${apiUrl} with YouTube URL: ${data.url}`
          );
          const getYouTubeTitle = async (videoUrl: string) => {
            const response = await fetch(
              `https://noembed.com/embed?url=${data.url}`
            );
            const embeddata = await response.json();

            console.log(`🌐 getYouTubeTitle : ${embeddata.title}`);
            return embeddata.title; // if valid
          };

          console.log(
            `🌐 getYouTubeTitle state : ${await getYouTubeTitle(data.url)}`
          );
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              youtube_url: data.url,
              youtubeurltitle: await getYouTubeTitle(data.url),
            }),
            signal: AbortSignal.timeout(1800000), // 30 minutes
            credentials: "include",
          });

          console.log(
            `📡 API Response Status: ${response.status} ${response.statusText}`
          );

          if (response.ok) {
            resultData = await response.json();
            responseOk = true;
            break; // Success, exit loop
          }
          if (response.status === 404 && apiUrl === apiUrls[0]) {
            console.warn(`API not found at ${apiUrl}, trying next...`);
            continue; // Try next URL if first one is 404
          }
          // For other errors on the first URL, or any error on the second, throw to be caught by outer catch
          const errorText = await response.text();
          throw new Error(`API Error ${response.status}: ${errorText}`);
        } catch (fetchError: any) {
          if (apiUrl === apiUrls[apiUrls.length - 1]) {
            // If this was the last URL to try
            throw fetchError; // Re-throw to be caught by the main catch block
          }
          console.warn(
            `Fetch error for ${apiUrl}: ${fetchError.message}. Trying next...`
          );
        }
      }

      clearInterval(progressInterval);

      if (responseOk && resultData) {
        setProgress(100);
        setProgressMessage(
          getLocalizedMessage("ar:اكتمل بنجاح!|en:Completed successfully!")
        );
        console.log(
          "✅ YouTube processing completed successfully:",
          resultData
        );

        if (onSuccess && resultData.conversation_id) {
          // Use the intelligently generated title if available, fallback to topic, then default
          const title =
            resultData.title ||
            resultData.topic ||
            getLocalizedMessage("ar:درس جديد من يوتيوب|en:New YouTube Lesson");
          console.log("📝 Using title for conversation:", title);

          onSuccess(
            resultData.context_id,
            resultData.preview || "",
            title,
            resultData.conversation_id
          );

          console.log(
            "🔀 Navigating to conversation:",
            `/chat/${resultData.conversation_id}`
          );
          navigate(`/chat/${resultData.conversation_id}`); // Navigate to the new chat
        }
        reset(); // Reset form on success
      } else {
        // This case should ideally be handled by errors thrown above
        throw new Error(
          getLocalizedMessage(
            "ar:فشل معالجة الفيديو بعد عدة محاولات.|en:Video processing failed after multiple attempts."
          )
        );
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      setProgress(0); // Reset progress on error
      let errorMessage = getLocalizedMessage(
        "ar:حدث خطأ أثناء معالجة الفيديو.|en:An error occurred while processing the video."
      );
      if (error.name === "TimeoutError") {
        errorMessage = getLocalizedMessage(
          "ar:استغرقت المعالجة وقتًا طويلاً جدًا. قد يكون الفيديو طويلاً جدًا أو هناك مشكلة في الخادم.|en:Processing took too long. The video might be too long or there is a server issue."
        );
      } else if (error.message) {
        // Try to parse API error if available
        try {
          const parsedError = JSON.parse(
            error.message.substring(error.message.indexOf("{"))
          );
          errorMessage =
            parsedError.detail || parsedError.error || error.message;
        } catch (e) {
          errorMessage = error.message.includes("API Error")
            ? error.message.split(": ")[1]
            : error.message;
        }
      }
      toast.error(errorMessage);
      console.error("YouTube processing error:", error);
    } finally {
      setIsProcessing(false);
      // Keep progress at 100 if successful, otherwise reset after a delay for user to see message
      if (progress !== 100) {
        setTimeout(() => {
          setProgress(0);
          setProgressMessage("");
        }, 3000);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="relative">
        <div
          className={`absolute top-1/2 transform -translate-y-1/2 ${
            language === "ar" ? "right-3" : "left-3"
          } text-gray-400`}
        >
          <Link2 className="h-5 w-5" />
        </div>
        <Input
          type="text"
          {...register("url")}
          placeholder={getLocalizedMessage(
            "ar:الصق رابط يوتيوب هنا...|en:Paste YouTube link here..."
          )}
          className={`w-full rounded-lg border bg-gray-50 px-10 py-3 text-sm shadow-sm transition-colors
            focus:border-[#00695C] focus:ring-1 focus:ring-[#00695C] focus:outline-none
            ${
              errors.url
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300"
            }
            ${
              language === "ar"
                ? "text-right pr-10 pl-4"
                : "text-left pl-10 pr-4"
            }`}
          disabled={isProcessing}
          dir={language === "ar" ? "rtl" : "ltr"}
        />
      </div>
      {errors.url && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-600 flex items-center gap-1"
          dir={language === "ar" ? "rtl" : "ltr"}
        >
          <AlertTriangle size={14} /> {getLocalizedMessage(errors.url.message!)}
        </motion.p>
      )}

      <Button
        type="submit"
        disabled={isProcessing || isSubmitting}
        className="w-full bg-[#00695C] hover:bg-[#00564d] text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-base"
        dir={language === "ar" ? "rtl" : "ltr"}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {getLocalizedMessage("ar:جاري المعالجة...|en:Processing...")}
          </>
        ) : (
          <>
            <Youtube className="h-5 w-5" />
            {getLocalizedMessage("ar:معالجة الفيديو|en:Process Video")}
          </>
        )}
      </Button>

      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 bg-[#00695C]/5 p-3.5 rounded-lg border border-[#00695C]/20 space-y-2 shadow-sm"
          >
            <div className="flex justify-between items-center mb-1">
              <span
                className="text-sm text-[#004d40] font-medium"
                dir={language === "ar" ? "rtl" : "ltr"}
              >
                {progressMessage ||
                  (language === "ar"
                    ? "جاري معالجة المحتوى..."
                    : "Processing content...")}
              </span>
              <span
                className={`text-sm font-semibold ${
                  progress === 100 ? "text-green-600" : "text-[#00695C]"
                }`}
              >
                {progress === 100 && (
                  <CheckCircle size={16} className="inline mr-1 mb-0.5" />
                )}
                {progress}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#00695C]/20 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  progress === 100 ? "bg-green-500" : "bg-[#8cc63f]"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
};

export default DirectYouTubeProcessor;
