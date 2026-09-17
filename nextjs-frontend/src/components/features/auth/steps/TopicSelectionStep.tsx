"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { baseURL } from "@/lib/config/env";

type Props = {
  selectedTopics: string[];
  toggleTopic: (topicId: string) => void;
  loading: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
};

type Category = {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export function TopicSelectionStep({ selectedTopics, toggleTopic, loading, error, onSubmit, onBack }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    // Fetch categories from API
    const fetchCategories = async () => {
      try {
        const response = await api.get<{ data: Category[] }>(`${baseURL}/api/v1/categories`);
        if (response?.data?.data) {
          setCategories(response.data.data.filter((cat) => cat.isActive !== false));
        } else if (Array.isArray(response?.data)) {
          // Handle case where response is directly an array
          setCategories(response.data.filter((cat: Category) => cat.isActive !== false));
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        // Fallback to empty array
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  return (
    <>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-black/60 hover:text-black">
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <h1 className="text-3xl font-bold text-black mb-2">
        What categories interest
        <br />
        you?
      </h1>
      <p className="text-sm text-black/80 mb-6">
        Select categories you'd like to talk about with others. We'll match you with users interested in similar categories.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        {categoriesLoading ? (
          <p className="text-sm text-black/60">Loading categories...</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-red-600">No categories available. Please try again later.</p>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center justify-between p-4 rounded-xl border border-black/20 bg-white hover:border-black/40 transition-colors cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="text-base text-black">{category.name}</span>
                  {category.description && (
                    <span className="text-xs text-black/60">{category.description}</span>
                  )}
                </div>
                <Checkbox
                  checked={selectedTopics.includes(category.id)}
                  onCheckedChange={() => toggleTopic(category.id)}
                />
              </label>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="submit"
          disabled={loading || categoriesLoading || selectedTopics.length === 0}
          className="w-full h-12 rounded-full bg-black text-white hover:bg-black/80 flex items-center justify-center gap-2 mt-6"
        >
          <span>Next</span>
          <ArrowRight className="w-5 h-5" />
        </Button>
      </form>
    </>
  );
}

