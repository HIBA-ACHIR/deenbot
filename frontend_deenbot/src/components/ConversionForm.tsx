import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, FileUp, Youtube, FileAudio } from "lucide-react";
import DirectYouTubeProcessor from "./DirectYouTubeProcessor"; // Assuming this is correctly set up for this context
import MediaUploader from "./MediaUploader"; // Assuming this is correctly set up for this context
import { useChat } from "../contexts/ChatContext"; // For potential conversation creation
import { toast } from "sonner";
import { ConversionFormTab } from "./AddourousHassanyaPage"; // Import the type
import { getVideoInfo } from "yt-get-info";
interface ConversionFormProps {
  language: "ar" | "en";
  activeTab: ConversionFormTab;
  onTabChange: (tab: ConversionFormTab) => void;
  selectedYoutubeUrl?: string | null; // Added to receive URL from parent
  onUrlProcessed?: () => void; // Added callback to notify parent when URL is processed
}

const ConversionForm: React.FC<ConversionFormProps> = ({
  language,
  activeTab,
  onTabChange,
  selectedYoutubeUrl,
  onUrlProcessed,
}) => {
  const { fetchConversationById } = useChat();

  const handleProcessingSuccess = (
    transcriptionId: string,
    preview: string,
    topic?: string,
    conversationId?: string
  ) => {
    toast.success(
      language === "ar"
        ? "اكتملت المعالجة بنجاح!"
        : "Processing completed successfully!"
    );
    if (conversationId) {
      toast.info(
        language === "ar"
          ? `جاري تحميل المحادثة: ${topic || "محتوى جديد"}`
          : `Loading conversation: ${topic || "New Content"}`
      );
      fetchConversationById(conversationId); // This will select and load the conversation
      // Potentially navigate to the chat page or update UI if already on a page that shows conversations
    } else {
      // Handle cases where no conversation is directly created by the processor
      // Maybe the new page will handle creating a context/conversation from the transcriptionId
      console.log(
        "Processing success, Transcription ID:",
        transcriptionId,
        "Preview:",
        preview,
        "Topic:",
        topic
      );
      toast.info(
        language === "ar"
          ? "تم إنشاء السياق. يمكنك الآن طرح الأسئلة."
          : "Context created. You can now ask questions."
      );
    }
    // Further actions can be taken here, e.g., updating a list of processed items on the AddourousHassanyaPage
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-2xl border border-[#8cc63f]/40 min-h-[400px]">
      <h2
        className="text-2xl md:text-3xl font-bold text-[#00695C] mb-6 pb-3 border-b-2 border-[#8cc63f]/60 tracking-tight"
        style={{
          fontFamily:
            language === "ar"
              ? '"Reem Kufi", "Amiri", serif'
              : '"Poppins", sans-serif',
        }}
      >
        {language === "ar"
          ? "تحويل المحتوى الحسني"
          : "Hassani Content Conversion"}
      </h2>

      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as ConversionFormTab)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 bg-[#00695C]/5 p-1 rounded-lg border border-[#00695C]/10 mb-6">
          <TabsTrigger
            value="youtube"
            className="group data-[state=active]:bg-[#00695C] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-md py-2.5 font-semibold text-sm transition-all duration-200 text-[#00695C] hover:bg-[#00695C]/10"
            dir={language === "ar" ? "rtl" : "ltr"}
          >
            <Youtube
              className={`h-5 w-5 ${
                language === "ar" ? "ml-2" : "mr-2"
              } text-[#00695C] group-data-[state=active]:text-white transition-colors`}
            />
            {language === "ar" ? "رابط يوتيوب" : "YouTube Link"}
          </TabsTrigger>
          <TabsTrigger
            value="file"
            className="group data-[state=active]:bg-[#00695C] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-md py-2.5 font-semibold text-sm transition-all duration-200 text-[#00695C] hover:bg-[#00695C]/10"
            dir={language === "ar" ? "rtl" : "ltr"}
          >
            <FileUp
              className={`h-5 w-5 ${
                language === "ar" ? "ml-2" : "mr-2"
              } text-[#00695C] group-data-[state=active]:text-white transition-colors`}
            />
            {language === "ar" ? "تحميل ملف" : "Upload File"}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="youtube"
          className="focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="border border-[#00695C]/10 rounded-lg p-4 bg-white/50 shadow-inner">
            <div className="flex items-center gap-2 mb-3">
              <Youtube className="h-6 w-6 text-[#c4302b]" />
              <h3
                className="text-lg font-medium text-[#004d40] font-sans"
                dir={language === "ar" ? "rtl" : "ltr"}
              >
                {language === "ar"
                  ? "معالجة فيديو من يوتيوب"
                  : "Process YouTube Video"}
              </h3>
            </div>
            <p
              className="text-xs text-gray-600 mb-4"
              dir={language === "ar" ? "rtl" : "ltr"}
            >
              {language === "ar"
                ? "أدخل رابط فيديو الدرس الحسني من يوتيوب ليتم تحويله إلى نص."
                : "Enter the YouTube link of the Hassani lesson video to convert it to text."}
            </p>
            <DirectYouTubeProcessor
              onSuccess={handleProcessingSuccess}
              initialYoutubeUrl={selectedYoutubeUrl}
              onUrlProcessed={onUrlProcessed}
            />
          </div>
        </TabsContent>

        <TabsContent
          value="file"
          className="focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="border border-[#00695C]/10 rounded-lg p-4 bg-white/50 shadow-inner">
            <div className="flex items-center gap-2 mb-3">
              <FileAudio className="h-6 w-6 text-[#00695C]" />
              <h3
                className="text-lg font-medium text-[#004d40] font-sans"
                dir={language === "ar" ? "rtl" : "ltr"}
              >
                {language === "ar"
                  ? "تحميل ملف صوتي أو فيديو"
                  : "Upload Audio/Video File"}
              </h3>
            </div>
            <p
              className="text-xs text-gray-600 mb-4"
              dir={language === "ar" ? "rtl" : "ltr"}
            >
              {language === "ar"
                ? "قم بتحميل ملف الدرس الحسني (صوت أو فيديو) لتحويله."
                : "Upload the Hassani lesson file (audio or video) for conversion."}
            </p>
            <MediaUploader onUploadSuccess={handleProcessingSuccess} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConversionForm;
