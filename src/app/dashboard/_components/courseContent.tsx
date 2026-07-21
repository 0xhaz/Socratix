import { BookIcon, CheckCircle } from "lucide-react";
import { LessonContentType } from "../actions/get-lesson-content";
import { Button } from "@/components/ui/button";
import { RenderDescription } from "@/components/rich-text-editor/renderDescription";
import { useConstructUrl } from "@/hooks/use-construct-url";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import { SocratesQuestion } from "./socratesQuestion";

interface LessonContentProps {
  lesson: LessonContentType;
}

export default function LessonContent({ lesson }: LessonContentProps) {

  function VideoPlayer({ thumbnailKey, videoKey, youtubeUrl }: { thumbnailKey: string, videoKey: string, youtubeUrl?: string | null }) {
    const youtubeEmbedUrl = youtubeUrl ? getYouTubeEmbedUrl(youtubeUrl) : null;
    const videoUrl = useConstructUrl(videoKey);
    const thumbnailUrl = useConstructUrl(thumbnailKey);

    if (youtubeEmbedUrl) {
      return (
        <div className="aspect-video bg-black rounded-lg relative overflow-hidden">
          <iframe
            src={youtubeEmbedUrl}
            title="Lesson video"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    if (!videoUrl) {
      return (
        <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center">
          <BookIcon className="size-22 mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">No video available for this lesson yet.</p>
        </div>
      );
    }

    return (
      <div className="aspect-video bg-black rounded-lg relative overflow-hidden">
        <video
          poster={thumbnailUrl}
          controls
          className="w-full h-full object-cover"
        >
          <source src={videoUrl} type="video/mp4" />
          <source src={videoUrl} type="video/bebm" />
          <source src={videoUrl} type="video/ogg" />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-full bg-background pl-6">
      <VideoPlayer thumbnailKey={lesson.thumbnailkey ?? ""} videoKey={lesson.videokey ?? ""} youtubeUrl={lesson.youtubeUrl} />
      <div className="py-4 border-b">
        <Button variant={"outline"}>
          <CheckCircle className="size-4 mr-2 text-green-500" />
          Mark as Complete
        </Button>
      </div>

      <div className="space-y-6 pt-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{lesson.title}</h1>
        {lesson.description && (
          <RenderDescription json={JSON.parse(lesson.description)} />
        )}
        <SocratesQuestion question={lesson.questions[0] ?? null} />
      </div>
    </div>
  );
}
