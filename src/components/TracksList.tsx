import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProcessedTrack {
  type: string;
  url: string;
  name: string;
}

interface TracksListProps {
  tracks: ProcessedTrack[];
  currentPlaying: string | null;
  onPlay: (url: string) => void;
  onDownload: (url: string, filename: string) => void;
}

export default function TracksList({
  tracks,
  currentPlaying,
  onPlay,
  onDownload
}: TracksListProps) {
  const { t } = useLanguage();

  if (tracks.length === 0) return null;

  return (
    <Card className="p-8 mt-6">
      <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        <Icon name="ListMusic" size={28} />
        {t.tracks.title}
      </h3>
      <div className="space-y-4">
        {tracks.map((track, index) => (
          <div
            key={index}
            className="p-4 border rounded-lg flex items-center justify-between hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon name="Music" size={24} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold">{track.name}</p>
                <p className="text-sm text-muted-foreground">{t.tracks.ready}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPlay(track.url)}
              >
                <Icon 
                  name={currentPlaying === track.url ? "Pause" : "Play"} 
                  size={16} 
                  className="mr-2" 
                />
                {currentPlaying === track.url ? t.tracks.pause : t.tracks.play}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(track.url, `${track.name}.mp3`)}
              >
                <Icon name="Download" size={16} className="mr-2" />
                {t.tracks.download}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}