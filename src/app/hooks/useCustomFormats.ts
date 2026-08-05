import { useState, useEffect } from 'react';
import { BannerFormat } from '../types/banner';

const STORAGE_KEY = 'banner-custom-formats';

export function useCustomFormats() {
  const [customFormats, setCustomFormats] = useState<BannerFormat[]>(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save to localStorage whenever customFormats changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customFormats));
    } catch (error) {
      console.error('Failed to save custom formats:', error);
    }
  }, [customFormats]);

  const addCustomFormat = (width: number, height: number, name: string) => {
    const aspectRatio = width / height;
    let category: 'square' | 'horizontal' | 'vertical';

    if (aspectRatio === 1) {
      category = 'square';
    } else if (aspectRatio > 1) {
      category = 'horizontal';
    } else {
      category = 'vertical';
    }

    const newFormat: BannerFormat = {
      id: `custom-${Date.now()}`,
      name,
      width,
      height,
      category,
      aspectRatio,
    };

    setCustomFormats((prev) => [...prev, newFormat]);
    return newFormat;
  };

  const deleteCustomFormat = (id: string) => {
    setCustomFormats((prev) => prev.filter((f) => f.id !== id));
  };

  const getCustomFormatsByCategory = (category: 'square' | 'horizontal' | 'vertical') => {
    return customFormats.filter((f) => f.category === category);
  };

  return {
    customFormats,
    addCustomFormat,
    deleteCustomFormat,
    getCustomFormatsByCategory,
  };
}
