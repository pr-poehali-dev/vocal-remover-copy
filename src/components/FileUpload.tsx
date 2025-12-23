import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { useLanguage } from "@/contexts/LanguageContext";

interface FileUploadProps {
  file: File | null;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function FileUpload({
  file,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput
}: FileUploadProps) {
  const { t } = useLanguage();

  return (
    <Card
      className={`p-12 border-2 border-dashed transition-all ${
        isDragging ? "border-primary bg-primary/5" : "border-border"
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="text-center space-y-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Icon name="FileAudio" size={48} className="text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">
            {t.upload.dragDrop}
          </h3>
          <p className="text-muted-foreground">
            {t.upload.or}
          </p>
        </div>
        <label>
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={onFileInput}
          />
          <Button size="lg" asChild>
            <span className="cursor-pointer">
              <Icon name="Upload" size={20} className="mr-2" />
              {t.upload.chooseFile}
            </span>
          </Button>
        </label>
        <p className="text-sm text-muted-foreground">{t.upload.supported}</p>
        {file && (
          <div className="mt-6 p-4 bg-secondary rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Icon name="Music" size={24} className="text-primary" />
              <span className="font-medium">{file.name}</span>
            </div>
            <Icon name="CheckCircle" size={24} className="text-green-500" />
          </div>
        )}
      </div>
    </Card>
  );
}