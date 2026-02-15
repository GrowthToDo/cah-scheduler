"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  employmentType: string;
  fte: number;
  icuCompetencyLevel: number;
  isChargeNurseQualified: boolean;
  reliabilityRating: number;
  homeUnit: string | null;
  crossTrainedUnits: string[];
  weekendExempt: boolean;
  voluntaryFlexAvailable: boolean;
  isActive: boolean;
  // Optional fields for compatibility with StaffMember
  email?: string | null;
  phone?: string | null;
  hireDate?: string;
  certifications?: string[];
  notes?: string | null;
}

const employmentLabels: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  per_diem: "Per Diem",
  float: "Float",
  agency: "Agency",
};

export function StaffTable({
  staff,
  onEdit,
  onNameClick,
}: {
  staff: Staff[];
  onEdit: (id: string) => void;
  onNameClick?: (staff: { id: string; firstName: string; lastName: string }) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Home Unit</TableHead>
          <TableHead>Employment</TableHead>
          <TableHead>FTE</TableHead>
          <TableHead>ICU Level</TableHead>
          <TableHead>Charge RN</TableHead>
          <TableHead>Status</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {staff.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">
              {onNameClick ? (
                <button
                  onClick={() => onNameClick(s)}
                  className="text-left hover:text-primary hover:underline"
                >
                  {s.firstName} {s.lastName}
                </button>
              ) : (
                <span>{s.firstName} {s.lastName}</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={s.role === "RN" ? "default" : s.role === "LPN" ? "outline" : "secondary"}>
                {s.role}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span>{s.homeUnit || "—"}</span>
                {s.crossTrainedUnits && s.crossTrainedUnits.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    +{s.crossTrainedUnits.join(", ")}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>{employmentLabels[s.employmentType] || s.employmentType}</TableCell>
            <TableCell>{s.fte}</TableCell>
            <TableCell>
              <span className="flex items-center gap-1">
                {s.icuCompetencyLevel}/5
                <span
                  className="inline-block h-2 rounded-full"
                  style={{
                    width: `${(s.icuCompetencyLevel / 5) * 40}px`,
                    backgroundColor:
                      s.icuCompetencyLevel >= 4
                        ? "#16a34a"
                        : s.icuCompetencyLevel >= 3
                        ? "#ca8a04"
                        : "#dc2626",
                  }}
                />
              </span>
            </TableCell>
            <TableCell>
              {s.isChargeNurseQualified ? (
                <Badge variant="default">Yes</Badge>
              ) : (
                <span className="text-muted-foreground">No</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-0.5">
                <Badge variant={s.isActive ? "default" : "secondary"}>
                  {s.isActive ? "Active" : "Inactive"}
                </Badge>
                {s.weekendExempt && (
                  <Badge variant="outline" className="text-xs">WE Exempt</Badge>
                )}
                {s.voluntaryFlexAvailable && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-600">VTO</Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="sm" onClick={() => onEdit(s.id)}>
                Edit
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
