import { db } from "@/db";
import { censusBand } from "@/db/schema";
import { eq } from "drizzle-orm";

interface StaffingRequirement {
  requiredRNs: number;
  requiredCNAs: number;
  requiredChargeNurses: number;
  patientToNurseRatio: string;
  bandName: string;
}

export function getStaffingForCensus(
  patientCount: number,
  unit: string = "ICU"
): StaffingRequirement | null {
  const bands = db
    .select()
    .from(censusBand)
    .where(eq(censusBand.isActive, true))
    .all()
    .filter((b) => b.unit === unit);

  // Find matching band
  const match = bands.find(
    (b) => patientCount >= b.minPatients && patientCount <= b.maxPatients
  );

  if (match) {
    return {
      requiredRNs: match.requiredRNs,
      requiredCNAs: match.requiredCNAs,
      requiredChargeNurses: match.requiredChargeNurses,
      patientToNurseRatio: match.patientToNurseRatio,
      bandName: match.name,
    };
  }

  // Fallback to highest band if census exceeds all bands
  const highest = bands.sort((a, b) => b.maxPatients - a.maxPatients)[0];
  if (highest) {
    return {
      requiredRNs: highest.requiredRNs,
      requiredCNAs: highest.requiredCNAs,
      requiredChargeNurses: highest.requiredChargeNurses,
      patientToNurseRatio: highest.patientToNurseRatio,
      bandName: highest.name + " (fallback)",
    };
  }

  return null;
}
