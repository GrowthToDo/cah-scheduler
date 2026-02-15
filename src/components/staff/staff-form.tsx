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
  homeUnit: string;
  crossTrainedUnits: string[];
  weekendExempt: boolean;
  voluntaryFlexAvailable: boolean;
  isActive: boolean;
  notes: string;
}

const COMPETENCY_DESCRIPTIONS: Record<number, string> = {
  1: "Novice/Orientee - Requires preceptor",
  2: "Advanced Beginner - No ICU/ER alone",
  3: "Competent - Standard ICU/ER load",
  4: "Proficient - Trauma Ready, TNCC",
  5: "Expert - Charge/Preceptor qualified",
};

const UNITS = ["ICU", "ER", "Med-Surg", "PACU", "L&D"];

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
  homeUnit: "ICU",
  crossTrainedUnits: [],
  weekendExempt: false,
  voluntaryFlexAvailable: false,
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
              <Label>Home Unit</Label>
              <Select
                value={form.homeUnit || "ICU"}
                onValueChange={(v) => setForm({ ...form, homeUnit: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>ICU Competency Level</Label>
            <Select
              value={form.icuCompetencyLevel.toString()}
              onValueChange={(v) => setForm({ ...form, icuCompetencyLevel: parseInt(v) })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((level) => (
                  <SelectItem key={level} value={level.toString()}>
                    Level {level}: {COMPETENCY_DESCRIPTIONS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Cross-Trained Units</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {UNITS.filter((u) => u !== form.homeUnit).map((unit) => (
                <label key={unit} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={form.crossTrainedUnits.includes(unit)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({ ...form, crossTrainedUnits: [...form.crossTrainedUnits, unit] });
                      } else {
                        setForm({
                          ...form,
                          crossTrainedUnits: form.crossTrainedUnits.filter((u) => u !== unit),
                        });
                      }
                    }}
                    className="h-4 w-4"
                  />
                  {unit}
                </label>
              ))}
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
            <div className="flex flex-col gap-2 pt-6">
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
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.weekendExempt}
                  onChange={(e) =>
                    setForm({ ...form, weekendExempt: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <span className="text-sm">Weekend Exempt (Admin only)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.voluntaryFlexAvailable}
                  onChange={(e) =>
                    setForm({ ...form, voluntaryFlexAvailable: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <span className="text-sm">Available for VTO (Low Census)</span>
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
