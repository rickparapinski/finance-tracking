"use client";

import { useState } from "react";
import { upsertForecastRule } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";

interface Rule {
  id?: string;
  name?: string;
  amount?: number;
  type?: string;
  category?: string;
  account_id?: string;
  start_date?: string;
}

export function AddRuleModal({
  categories,
  accounts,
  editRule,
  trigger,
  onClose,
}: {
  categories: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  editRule?: Rule;
  trigger?: React.ReactNode;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState(editRule?.type ?? "recurring");

  const isEdit = !!editRule?.id;

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  async function onSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      await upsertForecastRule(formData);
      handleClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  const content = (
    <DialogContent className="sm:max-w-[440px]">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Rule" : "New Forecast Rule"}</DialogTitle>
      </DialogHeader>

      <form action={onSubmit} className="grid gap-4 py-2">
        {isEdit && <input type="hidden" name="id" value={editRule.id} />}

        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="e.g. Rent" defaultValue={editRule?.name} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount (negative = expense)</Label>
            <Input
              id="amount" name="amount" type="number" step="0.01" required
              placeholder="-1074.00" defaultValue={editRule?.amount}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date" name="start_date" type="date" required
              defaultValue={editRule?.start_date ?? new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select name="category" required defaultValue={editRule?.category}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select name="type" value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recurring">Recurring (Monthly)</SelectItem>
                <SelectItem value="one_off">One-off</SelectItem>
                <SelectItem value="budget">Budget</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Account</Label>
          <Select name="account_id" defaultValue={editRule?.account_id ?? accounts[0]?.id}>
            <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Rule"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {content}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </DialogTrigger>
      {content}
    </Dialog>
  );
}
