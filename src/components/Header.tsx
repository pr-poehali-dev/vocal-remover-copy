import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

export default function Header() {
  return (
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
  );
}
