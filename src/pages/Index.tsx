import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";

const UPLOAD_URL = "https://functions.poehali.dev/e4c00d25-fe2e-49ea-8e53-af664e48d42f";
const PROCESS_URL = "https://functions.poehali.dev/fb2c1e89-35fa-40a6-b0fb-76d4a109f8ce";

interface ProcessedTrack {
  type: string;
  url: string;
  name: string;
}

export default function Index() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("upload");
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const [processedTracks, setProcessedTracks] = useState<ProcessedTrack[]>([]);
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("audio/")) {
      setFile(droppedFile);
      await uploadFile(droppedFile);
      setActiveTab("process");
    } else {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, загрузите аудиофайл",
        variant: "destructive",
      });
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      await uploadFile(selectedFile);
      setActiveTab("process");
    }
  };

  const uploadFile = async (fileToUpload: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const base64Data = base64.split(',')[1];
        
        const response = await fetch(UPLOAD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: base64Data,
            filename: fileToUpload.name,
            content_type: fileToUpload.type
          })
        });
        
        const data = await response.json();
        if (response.ok) {
          setUploadedUrl(data.url);
          toast({ title: "Файл загружен", description: "Готов к обработке" });
        } else {
          throw new Error(data.error);
        }
      };
      reader.readAsDataURL(fileToUpload);
    } catch (error) {
      toast({ 
        title: "Ошибка загрузки",
        description: String(error),
        variant: "destructive" 
      });
    }
  };

  const processAudio = async (type: string, name: string) => {
    if (!uploadedUrl) {
      toast({ title: "Ошибка", description: "Сначала загрузите файл", variant: "destructive" });
      return;
    }
    
    setProcessing(true);
    setProgress(0);
    
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 5, 90));
    }, 500);
    
    try {
      const response = await fetch(PROCESS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_url: uploadedUrl,
          type: type
        })
      });
      
      const data = await response.json();
      clearInterval(progressInterval);
      setProgress(100);
      
      if (response.ok && data.output) {
        const newTrack: ProcessedTrack = {
          type: type,
          url: data.output,
          name: name
        };
        setProcessedTracks(prev => [...prev, newTrack]);
        toast({ title: "Готово!", description: `${name} успешно обработан` });
      } else {
        throw new Error(data.error || 'Processing failed');
      }
    } catch (error) {
      clearInterval(progressInterval);
      toast({ 
        title: "Ошибка обработки",
        description: String(error),
        variant: "destructive" 
      });
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const playTrack = (url: string) => {
    if (audioRef.current) {
      if (currentPlaying === url) {
        audioRef.current.pause();
        setCurrentPlaying(null);
      } else {
        audioRef.current.src = url;
        audioRef.current.play();
        setCurrentPlaying(url);
      }
    }
  };

  const downloadTrack = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon name="Waveform" size={32} className="text-primary" />
            <span className="text-2xl font-bold">VocalRemover Pro</span>
          </div>
          <div className="flex items-center space-x-6">
            <a href="#home" className="hover:text-primary transition-colors">Главная</a>
            <a href="#tools" className="hover:text-primary transition-colors">Инструменты</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Тарифы</a>
            <a href="#contact" className="hover:text-primary transition-colors">Контакты</a>
            <Button size="sm">Войти</Button>
          </div>
        </div>
      </nav>

      <section id="home" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            Профессиональное разделение аудио
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Изолируйте вокал, инструменты и отдельные треки с высочайшим качеством.
            Поддержка MP3, WAV, FLAC, OGG и других форматов.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Icon name="Upload" size={20} />
              Загрузка
            </TabsTrigger>
            <TabsTrigger value="process" disabled={!file} className="flex items-center gap-2">
              <Icon name="Settings" size={20} />
              Обработка
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card
              className={`p-12 border-2 border-dashed transition-all ${
                isDragging ? "border-primary bg-primary/5" : "border-border"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="text-center space-y-6">
                <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon name="FileAudio" size={48} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">
                    {file ? file.name : "Перетащите аудиофайл сюда"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    или нажмите для выбора файла
                  </p>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-input"
                  />
                  <label htmlFor="file-input">
                    <Button asChild>
                      <span className="cursor-pointer">Выбрать файл</span>
                    </Button>
                  </label>
                </div>
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground font-mono">
                  <span className="flex items-center gap-1">
                    <Icon name="Check" size={16} className="text-primary" />
                    MP3
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="Check" size={16} className="text-primary" />
                    WAV
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="Check" size={16} className="text-primary" />
                    FLAC
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="Check" size={16} className="text-primary" />
                    OGG
                  </span>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="process" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{file?.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    {file && (file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setFile(null)}>
                  <Icon name="X" size={16} />
                </Button>
              </div>

              <div className="h-32 bg-muted rounded-lg flex items-center justify-center mb-6 overflow-hidden">
                <div className="flex items-end gap-1 h-full p-4">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div
                      key={i}
                      className="audio-wave flex-1 rounded-t"
                      style={{
                        height: `${Math.random() * 100}%`,
                        animationDelay: `${i * 0.02}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {processing && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Обработка...</span>
                    <span className="text-sm font-mono text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <Button
                  className="w-full"
                  onClick={() => processAudio("vocals", "Вокал")}
                  disabled={processing}
                >
                  <Icon name="Scissors" size={20} className="mr-2" />
                  Разделить вокал
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => processAudio("no_vocals", "Инструментал")}
                  disabled={processing}
                >
                  <Icon name="Music" size={20} className="mr-2" />
                  Инструментал
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => processAudio("bass", "Бас")}
                  disabled={processing}
                >
                  <Icon name="Guitar" size={20} className="mr-2" />
                  Изолировать бас
                </Button>
              </div>
            </Card>

            {processedTracks.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Обработанные треки</h3>
                <div className="space-y-3">
                  {processedTracks.map((track, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => playTrack(track.url)}
                        >
                          <Icon 
                            name={currentPlaying === track.url ? "Pause" : "Play"} 
                            size={20} 
                          />
                        </Button>
                        <div>
                          <p className="font-medium">{track.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{track.type}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadTrack(track.url, `${track.name}.wav`)}
                      >
                        <Icon name="Download" size={16} className="mr-2" />
                        Скачать
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <audio ref={audioRef} onEnded={() => setCurrentPlaying(null)} />

            <Card className="p-6" id="tools">
              <h3 className="text-lg font-semibold mb-4">Настройки обработки</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Качество разделения</label>
                    <span className="text-sm font-mono text-muted-foreground">Высокое</span>
                  </div>
                  <Slider defaultValue={[80]} max={100} step={1} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Подавление шума</label>
                    <span className="text-sm font-mono text-muted-foreground">60%</span>
                  </div>
                  <Slider defaultValue={[60]} max={100} step={1} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Эквалайзер</label>
                    <span className="text-sm font-mono text-muted-foreground">Стандартный</span>
                  </div>
                  <Slider defaultValue={[50]} max={100} step={1} />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <section id="pricing" className="container mx-auto px-4 py-16 border-t border-border">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Тарифные планы</h2>
          <p className="text-muted-foreground">Выберите подходящий план для ваших задач</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="p-8 hover:border-primary transition-colors">
            <div className="text-center mb-6">
              <Icon name="Star" size={48} className="mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-2xl font-bold mb-2">Базовый</h3>
              <div className="text-4xl font-bold mb-2">
                $9<span className="text-lg text-muted-foreground">/мес</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <Icon name="Check" size={20} className="text-primary shrink-0 mt-0.5" />
                <span>5 файлов в день</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Check" size={20} className="text-primary shrink-0 mt-0.5" />
                <span>MP3, WAV форматы</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Check" size={20} className="text-primary shrink-0 mt-0.5" />
                <span>Базовое качество</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full">Выбрать план</Button>
          </Card>

          <Card className="p-8 border-2 border-primary relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
              Популярный
            </div>
            <div className="text-center mb-6">
              <Icon name="Zap" size={48} className="mx-auto mb-4 text-primary" />
              <h3 className="text-2xl font-bold mb-2">Профессиональный</h3>
              <div className="text-4xl font-bold mb-2">
                $29<span className="text-lg text-muted-foreground">/мес</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <Icon name="Check" size={20} className="text-primary shrink-0 mt-0.5" />
                <span>Безлимит файлов</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Check" size={20} className="text-primary shrink-0 mt-0.5" />
                <span>Все форматы</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Check" size={20} className="text-primary shrink-0 mt-0.5" />
                <span>Высокое качество</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Check" size={20} className="text-primary shrink-0 mt-0.5" />
                <span>Приоритетная обработка</span>
              </li>
            </ul>
            <Button className="w-full">Выбрать план</Button>
          </Card>

          <Card className="p-8 hover:border-primary transition-colors">
            <div className="text-center mb-6">
              <Icon name="Crown" size={48} className="mx-auto mb-4 text-secondary" />
              <h3 className="text-2xl font-bold mb-2">Студийный</h3>
              <div className="text-4xl font-bold mb-2">
                $99<span className="text-lg text-muted-foreground">/мес</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <Icon name="Check" size={20} className="text-primary shrink-0 mt-0.5" />
                <span>Всё из Pro</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Check" size={20} className="text-primary shrink-0 mt-0.5" />
                <span>API доступ</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Check" size={20} className="text-primary shrink-0 mt-0.5" />
                <span>Командная работа</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Check" size={20} className="text-primary shrink-0 mt-0.5" />
                <span>Персональная поддержка</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full">Выбрать план</Button>
          </Card>
        </div>
      </section>

      <section id="contact" className="container mx-auto px-4 py-16 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Свяжитесь с нами</h2>
          <p className="text-muted-foreground mb-8">
            Есть вопросы? Мы всегда рады помочь профессионалам
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 text-center hover:border-primary transition-colors">
              <Icon name="Mail" size={32} className="mx-auto mb-3 text-primary" />
              <h4 className="font-semibold mb-2">Email</h4>
              <p className="text-sm text-muted-foreground">support@vocalremover.pro</p>
            </Card>
            <Card className="p-6 text-center hover:border-primary transition-colors">
              <Icon name="MessageCircle" size={32} className="mx-auto mb-3 text-primary" />
              <h4 className="font-semibold mb-2">Чат</h4>
              <p className="text-sm text-muted-foreground">24/7 онлайн поддержка</p>
            </Card>
            <Card className="p-6 text-center hover:border-primary transition-colors">
              <Icon name="Phone" size={32} className="mx-auto mb-3 text-primary" />
              <h4 className="font-semibold mb-2">Телефон</h4>
              <p className="text-sm text-muted-foreground">+7 (800) 555-35-35</p>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icon name="Waveform" size={24} className="text-primary" />
              <span className="font-semibold">VocalRemover Pro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 VocalRemover Pro. Все права защищены.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}