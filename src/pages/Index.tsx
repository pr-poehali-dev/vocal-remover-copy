import { useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import FileUpload from "@/components/FileUpload";
import ProcessingPanel from "@/components/ProcessingPanel";
import TracksList from "@/components/TracksList";

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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("upload");
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const [processedTracks, setProcessedTracks] = useState<ProcessedTrack[]>([]);
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string>("");
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

  const uploadFile = async (fileToUpload: File): Promise<void> => {
    try {
      console.log('[UPLOAD] Starting upload for:', fileToUpload.name, 'Size:', fileToUpload.size);
      
      setUploading(true);
      setUploadProgress(5);
      
      const initResponse = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'init',
          filename: fileToUpload.name,
          content_type: fileToUpload.type
        })
      });
      
      if (!initResponse.ok) throw new Error('Init failed');
      const { upload_id } = await initResponse.json();
      
      setUploadProgress(10);
      
      const arrayBuffer = await fileToUpload.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      const CHUNK_SIZE = 2 * 1024 * 1024;
      const totalChunks = Math.ceil(bytes.length / CHUNK_SIZE);
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, bytes.length);
        const chunkBytes = bytes.slice(start, end);
        
        let chunkBase64 = '';
        const convertChunkSize = 8192;
        for (let j = 0; j < chunkBytes.length; j += convertChunkSize) {
          const miniChunk = chunkBytes.slice(j, j + convertChunkSize);
          chunkBase64 += String.fromCharCode.apply(null, Array.from(miniChunk));
        }
        chunkBase64 = btoa(chunkBase64);
        
        const chunkResponse = await fetch(UPLOAD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'chunk',
            upload_id,
            chunk_data: chunkBase64,
            chunk_index: i
          })
        });
        
        if (!chunkResponse.ok) throw new Error(`Chunk ${i} failed`);
        
        const progress = 10 + Math.floor(((i + 1) / totalChunks) * 80);
        setUploadProgress(progress);
      }
      
      const finalizeResponse = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'finalize',
          upload_id,
          total_chunks: totalChunks
        })
      });
      
      if (!finalizeResponse.ok) throw new Error('Finalize failed');
      
      const responseData = await finalizeResponse.json();
      console.log('[UPLOAD] Success! CDN URL:', responseData.url);
      setUploadProgress(100);
      setUploadedUrl(responseData.url);
      setOriginalAudioUrl(responseData.url);
      toast({ title: "✓ Файл загружен", description: "Готов к обработке" });
      
    } catch (error) {
      console.error('[UPLOAD] Error:', error);
      toast({ 
        title: "Ошибка загрузки",
        description: String(error),
        variant: "destructive" 
      });
      throw error;
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 1000);
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
        audioRef.current.play().catch(error => {
          console.error('Playback error:', error);
          toast({ title: "Ошибка", description: "Не удалось воспроизвести трек", variant: "destructive" });
        });
        setCurrentPlaying(url);
      }
    }
  };

  const handleAudioEnded = () => {
    setCurrentPlaying(null);
  };

  const downloadTrack = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

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
            <FileUpload
              file={file}
              isDragging={isDragging}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onFileInput={handleFileInput}
            />
            {uploading && (
              <div className="mt-6 bg-card p-6 rounded-xl border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Загрузка файла...</span>
                  <span className="text-sm font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2.5">
                  <div 
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="process">
            {originalAudioUrl && (
              <div className="bg-card border rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icon name="Disc" size={24} />
                  Оригинальный файл
                </h3>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => playTrack(originalAudioUrl)}
                  >
                    <Icon 
                      name={currentPlaying === originalAudioUrl ? "Pause" : "Play"} 
                      size={20} 
                      className="mr-2" 
                    />
                    {currentPlaying === originalAudioUrl ? "Пауза" : "Воспроизвести оригинал"}
                  </Button>
                  <span className="text-sm text-muted-foreground">{file?.name}</span>
                </div>
              </div>
            )}

            <ProcessingPanel
              processing={processing}
              progress={progress}
              onProcess={processAudio}
            />
            <TracksList
              tracks={processedTracks}
              currentPlaying={currentPlaying}
              onPlay={playTrack}
              onDownload={downloadTrack}
            />
          </TabsContent>
        </Tabs>
      </section>

      <section id="tools" className="container mx-auto px-4 py-16 bg-secondary/30">
        <h2 className="text-4xl font-bold text-center mb-12">Наши инструменты</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="p-8 bg-background rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Icon name="Mic2" size={32} className="text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">Извлечение вокала</h3>
            <p className="text-muted-foreground">
              Идеально изолируйте вокальные партии с помощью AI технологий последнего поколения
            </p>
          </div>
          <div className="p-8 bg-background rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Icon name="Music2" size={32} className="text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">Инструментал</h3>
            <p className="text-muted-foreground">
              Получите чистую инструментальную версию любого трека без потери качества
            </p>
          </div>
          <div className="p-8 bg-background rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Icon name="Layers" size={32} className="text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">Разделение треков</h3>
            <p className="text-muted-foreground">
              Выделяйте бас, ударные и другие элементы для профессионального микширования
            </p>
          </div>
        </div>
      </section>

      <section id="pricing" className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12">Тарифные планы</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="p-8 border rounded-xl hover:shadow-xl transition-shadow">
            <h3 className="text-2xl font-bold mb-2">Базовый</h3>
            <div className="text-4xl font-bold mb-6">Бесплатно</div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <Icon name="Check" size={20} className="text-green-500" />
                <span>5 треков в месяц</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="Check" size={20} className="text-green-500" />
                <span>Стандартное качество</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="Check" size={20} className="text-green-500" />
                <span>MP3 формат</span>
              </li>
            </ul>
          </div>
          <div className="p-8 border-2 border-primary rounded-xl hover:shadow-xl transition-shadow relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
              Популярный
            </div>
            <h3 className="text-2xl font-bold mb-2">Профессионал</h3>
            <div className="text-4xl font-bold mb-6">999₽<span className="text-lg text-muted-foreground">/месяц</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <Icon name="Check" size={20} className="text-green-500" />
                <span>Безлимитные треки</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="Check" size={20} className="text-green-500" />
                <span>HD качество</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="Check" size={20} className="text-green-500" />
                <span>WAV, FLAC форматы</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="Check" size={20} className="text-green-500" />
                <span>Приоритетная обработка</span>
              </li>
            </ul>
          </div>
          <div className="p-8 border rounded-xl hover:shadow-xl transition-shadow">
            <h3 className="text-2xl font-bold mb-2">Студия</h3>
            <div className="text-4xl font-bold mb-6">2499₽<span className="text-lg text-muted-foreground">/месяц</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <Icon name="Check" size={20} className="text-green-500" />
                <span>Всё из Профессионал</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="Check" size={20} className="text-green-500" />
                <span>API доступ</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="Check" size={20} className="text-green-500" />
                <span>Пакетная обработка</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="Check" size={20} className="text-green-500" />
                <span>Техподдержка 24/7</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <footer id="contact" className="bg-secondary/50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Icon name="Waveform" size={28} className="text-primary" />
                <span className="text-xl font-bold">VocalRemover Pro</span>
              </div>
              <p className="text-muted-foreground">
                Профессиональное разделение аудио с помощью AI
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Продукт</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Возможности</a></li>
                <li><a href="#" className="hover:text-primary">Тарифы</a></li>
                <li><a href="#" className="hover:text-primary">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Компания</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary">О нас</a></li>
                <li><a href="#" className="hover:text-primary">Блог</a></li>
                <li><a href="#" className="hover:text-primary">Контакты</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Поддержка</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Помощь</a></li>
                <li><a href="#" className="hover:text-primary">Документация</a></li>
                <li><a href="#" className="hover:text-primary">Статус сервиса</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 VocalRemover Pro. Все права защищены.</p>
          </div>
        </div>
      </footer>

      <audio ref={audioRef} onEnded={handleAudioEnded} />
    </div>
  );
}