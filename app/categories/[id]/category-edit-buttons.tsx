"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryModal } from "../category-modal";
import { deleteCategory } from "../actions";

type Category = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  is_active: boolean;
  monthly_budget: number | null;
};

export function CategoryEditButtons({ category }: { category: Category }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${category.name}"? This cannot be undone.`)) return;
    await deleteCategory(category.id);
    router.push("/categories");
  };

  return (
    <>
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          router.refresh();
        }}
        categoryToEdit={category}
      />
      <button
        onClick={() => setIsModalOpen(true)}
        className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
      >
        Edit
      </button>
      <button
        onClick={handleDelete}
        className="h-9 rounded-xl border border-rose-200 px-4 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
      >
        Delete
      </button>
    </>
  );
}
