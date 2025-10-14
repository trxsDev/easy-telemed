import i18next from 'i18next';
import {initReactI18next} from 'react-i18next';
import Backend from 'i18next-http-backend';

const loadLanguage = () => {
  return localStorage.getItem('i18nextLng') || 'en'; // Default to 'en' if not set
}

const setLanguage = (lng) => {
  return localStorage.setItem('i18nextLng', lng); // Store the selected language in localStorage
}


i18next
  .use(Backend) 
  .use(initReactI18next)
  .init({
    // debug: true,
    fallbackLng: "en",
    lng: loadLanguage(), 
    interpolation: {
      escapeValue: false, 
    },
    backend: {
      loadPath: "/locales/{{lng}}/translation.json", 
    },
  });

i18next.on('languageChanged', (lng) => { // Listen for language changes
  setLanguage(lng);
});


export default i18next;