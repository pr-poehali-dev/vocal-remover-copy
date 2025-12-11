import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Icon from "@/components/ui/icon";

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
  return (
    <div className="space-y-6">
      <Card className="p-8">
        <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <Icon name="Waveform" size={28} />
          Выберите тип обработки
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            size="lg"
            className="h-auto py-6 flex flex-col items-center gap-3"
            disabled={processing}
            onClick={() => onProcess('vocals', 'Вокал')}
          >
            <Icon name="Mic2" size={32} />
            <span className="font-semibold">Изолировать вокал</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-auto py-6 flex flex-col items-center gap-3"
            disabled={processing}
            onClick={() => onProcess('accompaniment', 'Инструментал')}
          >
            <Icon name="Music2" size={32} />
            <span className="font-semibold">Инструментал</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-auto py-6 flex flex-col items-center gap-3"
            disabled={processing}
            onClick={() => onProcess('bass', 'Бас')}
          >
            <Icon name="Disc" size={32} />
            <span className="font-semibold">Изолировать бас</span>
          </Button>
        </div>
      </Card>

      {processing && (
        <Card className="p-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Icon name="Loader2" size={24} className="animate-spin text-primary" />
              <span className="text-lg font-medium">Обработка аудио...</span>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-muted-foreground">
              Это может занять несколько минут в зависимости от длины трека
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
