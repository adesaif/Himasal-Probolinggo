"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";

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
import { createAlumniSchema, type CreateAlumniInput } from "@/lib/validators/alumni";

type Wilayah = { id: string; nama: string };

export function CreateAlumniDialog({ wilayahList }: { wilayahList: Wilayah[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateAlumniInput>({
    resolver: zodResolver(createAlumniSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      tempat_lahir: "",
      tanggal_lahir: "",
      alamat: "",
      wilayah_id: "",
      angkatan: "",
    },
  });

  async function onSubmit(values: CreateAlumniInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: values.full_name,
          email: values.email,
          phone: values.phone || undefined,
          tempat_lahir: values.tempat_lahir || undefined,
          tanggal_lahir: values.tanggal_lahir || undefined,
          alamat: values.alamat || undefined,
          wilayah_id: values.wilayah_id || undefined,
          angkatan: values.angkatan ? Number(values.angkatan) : undefined,
        }),
      });

      const body = await res.json();

      if (res.status === 201) {
        toast.success("Alumni berhasil ditambahkan", {
          description: "Undangan akun sudah dikirim ke email alumni.",
        });
        setOpen(false);
        form.reset();
        router.refresh();
        return;
      }

      if (res.status === 207) {
        toast.warning("Sebagian berhasil", { description: body.warning });
        setOpen(false);
        form.reset();
        router.refresh();
        return;
      }

      toast.error("Gagal menambahkan alumni", { description: body.error });
    } catch {
      toast.error("Gagal menambahkan alumni", {
        description: "Terjadi kesalahan jaringan, coba lagi.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Tambah Alumni
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Alumni</DialogTitle>
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
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Untuk mengirim undangan login"
                      disabled={isSubmitting}
                      {...field}
                    />
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
                {isSubmitting ? "Mengirim undangan..." : "Tambah & Undang Akun"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
