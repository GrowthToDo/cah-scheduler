"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StaffFormData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  employmentType: string;
  fte: number;
  hireDate: string;
  icuCompetencyLevel: number;
  isChargeNurseQualified: boolean;
  reliabilityRating: number;
  isActive: boolean;
  notes: string;
}

const defaultData: StaffFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "RN",
  employmentType: "full_time",
  fte: 1.0,
  hireDate: new Date().toISOString().split("T")[0],
  icuCompetencyLevel: 1,
  isChargeNurseQualified: false,
  reliabilityRating: 3,
  isActive: true,
  notes: "",
};

export function StaffFormDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: StaffFormData;
  onSave: (data: StaffFormData) => void;
}) {
  const [form, setForm] = useState<StaffFormData>(initialData ?? defaultData);
  const isEditing = !!initialData?.id;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Staff" : "Add Staff"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RN">RN</SelectItem>
                  <SelectItem value="LPN">LPN</SelectItem>
                  <SelectItem value="CNA">CNA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Employment Type</Label>
              <Select
                value={form.employmentType}
                onValueChange={(v) => setForm({ ...form, employmentType: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="per_diem">Per Diem</SelectItem>
                  <SelectItem value="float">Float</SelectItem>
                  <SelectItem value="agency">Agency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="fte">FTE</Label>
              <Input
                id="fte"
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={form.fte}
                onChange={(e) => setForm({ ...form, fte: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="hireDate">Hire Date</Label>
              <Input
                id="hireDate"
                type="date"
                value={form.hireDate}
                onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="competency">ICU Competency (1-5)</Label>
              <Input
                id="competency"
                type="number"
                min="1"
                max="5"
                value={form.icuCompetencyLevel}
                onChange={(e) =>
                  setForm({ ...form, icuCompetencyLevel: parseInt(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reliability">Reliability (1-5)</Label>
              <Input
                id="reliability"
                type="number"
                min="1"
                max="5"
                value={form.reliabilityRating}
                onChange={(e) =>
                  setForm({ ...form, reliabilityRating: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isChargeNurseQualified}
                  onChange={(e) =>
                    setForm({ ...form, isChargeNurseQualified: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <span className="text-sm">Charge Nurse Qualified</span>
              </label>
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEditing ? "Save Changes" : "Add Staff"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
