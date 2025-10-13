import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";

// Best tutorial on i18n I've found so far is this one
// https://blog.logrocket.com/react-localization-with-i18next/

i18n
    .use(initReactI18next)
    .use(
        resourcesToBackend((language, namespace) =>
            import(`./locales/${language}/${namespace}.json`)
                // use English as fallback if the requested language could not be loaded
                .catch(() => import((`./locales/en/${namespace}.json`)))
        ),
    )
    .use(LanguageDetector)
    .init({
        debug: true,
        load: 'languageOnly',
        fallbackLng: 'en',
        detection: {
            order: ["localStorage", "cookie", "navigator"],
            caches: ["localStorage", "cookie"],
        },
        interpolation: {
            escapeValue: false,
            format: (value, format, lng) => {
                if (format === "date") {
                    
                    //This would be better as it changes based on the language not
                    //the locale of the browser, but we use 'en' as the language and
                    //that seems to default to en-US not en-GB so the day/month ordering
                    //is wrong. I supose we could add en-GB and en-US to the language
                    //list so people could choose which they wanted? Would need to
                    //fully duplicate the files though (just with a different folder
                    //name) for that to work otherwise we just get back 'en' at
                    //this point which is no help
                    //return new Intl.DateTimeFormat(lng).format(value);
                    
                    return value.toLocaleDateString();
                } else if (format === "number") {
                    return value;
                }
            },
        },
    });

export default i18n;