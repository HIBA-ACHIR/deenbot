import React, { useState } from 'react';
import MediaUploader from './MediaUploader';
import YouTubeInput from './YouTubeInput';
import { toast } from 'sonner';
import { useChat, Message } from '../contexts/ChatContext';

interface MediaChatProps {
  onClose: () => void;
}

const MediaChat: React.FC<MediaChatProps> = ({ onClose }) => {
  const { createTempConversation, sendMessage, currentConversation } = useChat();
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
  const [transcriptionPreview, setTranscriptionPreview] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'file' | 'youtube'>('file');

  // Handle upload success without causing navigation issues
  const handleUploadSuccess = async (id: string, preview: string, topic?: string, conversationId?: string) => {
    console.log('MediaChat - Upload success with:', { id, preview, topic, conversationId });
    
    // First update local state
    setTranscriptionId(id);
    setTranscriptionPreview(preview);
    setAnswer(null);
    
    try {
      // Create a personalized welcome message with the topic if available
      let welcomeMessage: string;
      
      if (topic) {
        // Create message with topic information
        welcomeMessage = `مرحباً، يمكنك أن تتحدث معي أو تسألني حول الدرس الحسني الذي يتمحور حول: ${topic}`;
      } else {
        // Fallback to the previous message
        welcomeMessage = "تم معالجة ونسخ المحتوى الصوتي/المرئي بنجاح. يمكنك الآن طرح أسئلة حول هذا المحتوى.";
      }
      
      try {
        // Create a temp conversation - will be properly saved when user sends first message
        const title = topic || "تحليل المحتوى"; // Use topic as title or a default
        const tempId = createTempConversation(title);
        console.log('Created temp conversation with ID:', tempId);
        
        // Send the welcome message which will create the real conversation
        await sendMessage({
          conversationId: tempId,
          content: welcomeMessage,
          role: 'assistant',
          contextId: id // Use the transcription ID as the context ID
        });
        
        console.log('Sent welcome message to temp conversation');
        
        // Close the modal after a brief delay to let state updates complete
        setTimeout(() => {
          onClose();
        }, 500);
      } catch (error) {
        console.error('Error creating conversation:', error);
        toast.error('حدث خطأ أثناء إنشاء محادثة جديدة');
        onClose();
      }
    } catch (error) {
      console.error('Error in overall upload success handler:', error);
      toast.error('حدث خطأ غير متوقع');
      onClose();
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || !transcriptionId) {
      toast.error('يرجى إدخال سؤال وتحميل ملف أو رابط يوتيوب أولاً');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/media/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question,
          context_id: transcriptionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setAnswer(data.answer as string);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="media-chat p-4 border rounded-lg bg-white shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">المحادثة حول الملفات الصوتية والفيديو</h2>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-800"
        >
          ✕
        </button>
      </div>

      <div className="tabs flex mb-4 border-b">
        <button
          className={`py-2 px-4 ${activeTab === 'file' ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`}
          onClick={() => setActiveTab('file')}
        >
          تحميل ملف
        </button>
        <button
          className={`py-2 px-4 ${activeTab === 'youtube' ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`}
          onClick={() => setActiveTab('youtube')}
        >
          رابط يوتيوب
        </button>
      </div>

      {activeTab === 'file' ? (
        <MediaUploader onUploadSuccess={handleUploadSuccess} />
      ) : (
        <YouTubeInput onProcessSuccess={handleUploadSuccess} />
      )}

      {transcriptionPreview && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md border text-sm">
          <h3 className="font-semibold mb-1">معاينة النص:</h3>
          <p className="text-gray-700 whitespace-pre-line rtl" dir="rtl" lang="ar">{transcriptionPreview}</p>
        </div>
      )}

      {transcriptionId && (
        <div className="mt-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="اسأل عن محتوى الملف الصوتي/الفيديو..."
              className="flex-1 p-2 border rounded-md"
              disabled={isLoading}
            />
            <button
              onClick={handleAskQuestion}
              disabled={isLoading || !question.trim()}
              className={`px-4 py-2 rounded-md text-white ${
                isLoading || !question.trim()
                  ? 'bg-gray-400'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? '...' : 'اسأل'}
            </button>
          </div>

          {answer && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
              <h3 className="font-semibold mb-1">الإجابة:</h3>
              <p className="text-gray-800 whitespace-pre-line rtl" dir="rtl" lang="ar">{answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaChat;
