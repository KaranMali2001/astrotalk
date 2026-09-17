"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type React from "react";

type Props = {
  language: string[];
  setLanguage: (value: string[]) => void;
  loading: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
};

const languageOptions = ["English", "Hindi", "Marathi", "Gujarati", "Haryanvi"];

export function LanguageSelectionStep({ language, setLanguage, loading, error, onSubmit, onBack }: Props) {
  const toggleLanguage = (lang: string) => {
    setLanguage(
      language.includes(lang)
        ? language.filter((l) => l !== lang)
        : [...language, lang]
    );
  };

  return (
    <>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-black/60 hover:text-black">
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <h1 className="text-3xl font-bold text-black mb-2">
        Which language do
        <br />
        you prefer?
      </h1>
      <p className="text-sm text-black/80 mb-6">
        Select one or more languages you're comfortable speaking in.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-3">
          {languageOptions.map((lang) => (
            <label
              key={lang}
              className="flex items-center justify-between p-4 rounded-xl border border-black/20 bg-white hover:border-black/40 transition-colors cursor-pointer"
            >
              <span className="text-base text-black">{lang}</span>
              <Checkbox
                checked={language.includes(lang)}
                onCheckedChange={() => toggleLanguage(lang)}
              />
            </label>
          ))}
        </div>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

        <Button type="submit" disabled={loading || language.length === 0} className="w-full h-12 rounded-full bg-black text-white hover:bg-black/80 flex items-center justify-center gap-2 mt-6">
          <span>Next</span>
          <ArrowRight className="w-5 h-5" />
        </Button>
      </form>
    </>
  );
}

