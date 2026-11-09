import {useEffect, useState} from 'react';
import {getSearchPrompts} from '../../lib/searchPrompts.js';
import { useTranslation } from '../../hooks/useTranslation.js';

export default function useSearchPlaceholder(city, timeZone, paused) {
  const { t } = useTranslation();
  const [placeholder, setPlaceholder] = useState(`${t("home_que_buscas_en", "¿Qué buscas en")} ${city}?`);
  useEffect(() => {
    if (paused) return;
    let index = 0;
    const update = () => {
      const prompts = getSearchPrompts(city, new Date(), timeZone);
      setPlaceholder(prompts[index++ % prompts.length]);
    };
    update();
    const interval = setInterval(update, 12000);
    return () => clearInterval(interval);
  }, [city, timeZone, paused]);
  return placeholder;
}
