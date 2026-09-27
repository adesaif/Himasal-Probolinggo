"use client";

import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AlumniFormDialog } from "@/components/admin/alumni-form-dialog";
import {
  DeleteAlumniButton,
  type DeleteAlumniTarget,
} from "@/components/admin/delete-alumni-button";
import type { Kecamatan } from "@/lib/alumni-lokasi";
import type { AlumniFormValues } from "@/lib/validators/alumni";

export function AlumniDetailActions({
  alumniId,
  initialValues,
  lokasi,
  deleteTarget,
}: {
  alumniId: string;
  initialValues: AlumniFormValues;
  lokasi: Kecamatan[];
  deleteTarget: DeleteAlumniTarget;
}) {
  const router = useRouter();

  return (
    <div className="flex gap-2">
      <AlumniFormDialog
        alumniId={alumniId}
        initialValues={initialValues}
        lokasi={lokasi}
        trigger={
          <Button variant="outline">
            <Pencil />
            Edit
          </Button>
        }
      />
      <DeleteAlumniButton
        target={deleteTarget}
        size="default"
        onDeleted={() => {
          router.push("/admin/alumni");
          router.refresh();
        }}
      />
    </div>
  );
}
