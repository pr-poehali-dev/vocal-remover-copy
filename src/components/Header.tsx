import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Header() {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'ru' ? 'en' : 'ru');
  };

  return (
    <nav className="border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon name="Waveform" size={32} className="text-primary" />
          <span className="text-2xl font-bold">VocalRemover Pro</span>
        </div>
        <div className="flex items-center space-x-6">
          <a href="#home" className="hover:text-primary transition-colors">{t.nav.home}</a>
          <a href="#tools" className="hover:text-primary transition-colors">{t.nav.tools}</a>
          <a href="#pricing" className="hover:text-primary transition-colors">{t.nav.pricing}</a>
          <a href="#contact" className="hover:text-primary transition-colors">{t.nav.contact}</a>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleLanguage}
            className="flex items-center gap-2"
          >
            <Icon name="Languages" size={16} />
            {language === 'ru' ? 'EN' : 'RU'}
          </Button>
          <Button size="sm">{t.nav.login}</Button>
        </div>
      </div>
    </nav>
  );
}