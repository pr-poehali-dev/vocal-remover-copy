import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Icon from "@/components/ui/icon";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProcessingPanelProps {
  processing: boolean;
  progress: number;
  onProcess: (type: string, name: string) => void;
}

export default function ProcessingPanel({
  processing,
  progress,
  onProcess
}: ProcessingPanelProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <Card className="p-8">
        <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <Icon name="Waveform" size={28} />
          {t.processing.title}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            size="lg"
            className="h-auto py-6 flex flex-col items-center gap-3"
            disabled={processing}
            onClick={() => onProcess('vocals', t.processing.vocals)}
          >
            <Icon name="Mic2" size={32} />
            <span className="font-semibold">{t.processing.vocals}</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-auto py-6 flex flex-col items-center gap-3"
            disabled={processing}
            onClick={() => onProcess('accompaniment', t.processing.instrumental)}
          >
            <Icon name="Music2" size={32} />
            <span className="font-semibold">{t.processing.instrumental}</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-auto py-6 flex flex-col items-center gap-3"
            disabled={processing}
            onClick={() => onProcess('bass', t.processing.bass)}
          >
            <Icon name="Radio" size={32} />
            <span className="font-semibold">{t.processing.bass}</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-auto py-6 flex flex-col items-center gap-3"
            disabled={processing}
            onClick={() => onProcess('drums', t.processing.drums)}
          >
            <Icon name="Drum" size={32} />
            <span className="font-semibold">{t.processing.drums}</span>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          {t.processing.description}
        </p>
      </Card>

      {processing && (
        <Card className="p-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Icon name="Loader2" size={24} className="animate-spin text-primary" />
              <span className="text-lg font-medium">{t.processing.processing}</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        </Card>
      )}
    </div>
  );
}