"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import { updateAlumniSchema, type UpdateAlumniInput } from "@/lib/validators/alumni";

type Wilayah = { id: string; nama: string };

export function EditAlumniDialog({
  alumniId,
  wilayahList,
  initialValues,
}: {
  alumniId: string;
  wilayahList: Wilayah[];
  initialValues: UpdateAlumniInput;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateAlumniInput>({
    resolver: zodResolver(updateAlumniSchema),
    defaultValues: initialValues,
  });

  async function onSubmit(values: UpdateAlumniInput) {
    setIsSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.rpc("admin_update_alumni", {
      p_alumni_id: alumniId,
      p_full_name: values.full_name || undefined,
      p_phone: values.phone || undefined,
      p_tempat_lahir: values.tempat_lahir || undefined,
      p_tanggal_lahir: values.tanggal_lahir || undefined,
      p_alamat: values.alamat || undefined,
      p_wilayah_id: values.wilayah_id || undefined,
      p_angkatan: values.angkatan ? Number(values.angkatan) : undefined,
    });

    setIsSubmitting(false);

    if (error) {
      toast.error("Gagal menyimpan perubahan", { description: error.message });
      return;
    }

    toast.success("Data alumni berhasil diperbarui");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Data Alumni</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Lengkap</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor HP</FormLabel>
                    <FormControl>
                      <Input disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="angkatan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Angkatan</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="tempat_lahir"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempat Lahir</FormLabel>
                    <FormControl>
                      <Input disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tanggal_lahir"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Lahir</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="wilayah_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wilayah</FormLabel>
                  <Select
                    disabled={isSubmitting}
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih wilayah" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {wilayahList.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alamat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
