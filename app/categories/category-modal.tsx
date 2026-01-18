"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCategory, updateCategory, deleteCategory } from "./actions";

// Define the shape of a Category based on your DB
type Category = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  is_active: boolean;
  monthly_budget: number | null;
};

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: Category | null; // If null, we are creating
}

export function CategoryModal({
  isOpen,
  onClose,
  categoryToEdit,
}: CategoryModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [budget, setBudget] = useState("0");
  const [color, setColor] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Reset or Populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setName(categoryToEdit.name);
        setType(categoryToEdit.type);
        setBudget(String(categoryToEdit.monthly_budget ?? 0));
        setColor(categoryToEdit.color ?? "");
        setIsActive(categoryToEdit.is_active);
      } else {
        // Reset for "Create New"
        setName("");
        setType("expense");
        setBudget("0");
        setColor("");
        setIsActive(true);
      }
    }
  }, [isOpen, categoryToEdit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("type", type);
    formData.append("monthly_budget", budget);
    formData.append("color", color);
    if (isActive) formData.append("is_active", "on");

    try {
      if (categoryToEdit) {
        formData.append("id", categoryToEdit.id);
        await updateCategory(formData);
      } else {
        await createCategory(formData);
      }
      onClose(); // Close on success
    } catch (error) {
      console.error(error);
      alert("Failed to save category");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!categoryToEdit || !confirm("Are you sure? This cannot be undone."))
      return;
    setIsLoading(true);
    try {
      await deleteCategory(categoryToEdit.id);
      onClose();
    } catch (e) {
      alert("Error deleting");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {categoryToEdit ? "Edit Category" : "New Category"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Name & Color Row */}
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3 space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Groceries"
                required
              />
            </div>
            <div className="col-span-1 space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color" // HTML5 color picker is handy!
                  className="p-1 h-10 w-full cursor-pointer"
                  value={color || "#94a3b8"}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Type & Budget Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Monthly Budget (€)</Label>
              <Input
                id="budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
          </div>

          {/* Active Status (Only for Edit) */}
          {categoryToEdit && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active Category
              </Label>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            {categoryToEdit && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
                className="mr-auto" // Pushes delete button to the left
              >
                Delete
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
