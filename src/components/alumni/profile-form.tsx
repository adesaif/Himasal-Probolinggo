"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  profileFormSchema,
  type ProfileFormInput,
} from "@/lib/validators/profile";

type Wilayah = { id: string; nama: string };

export function ProfileForm({
  initialValues,
  wilayahList,
  memberInfo,
}: {
  initialValues: ProfileFormInput;
  wilayahList: Wilayah[];
  memberInfo: {
    member_id: string | null;
    angkatan: number | null;
    status_keanggotaan: string;
  };
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: initialValues,
  });

  async function onSubmit(values: ProfileFormInput) {
    setIsSubmitting(true);
    const supabase = createClient();

    const { error: profileError } = await supabase.rpc("update_own_profile", {
      p_full_name: values.full_name || undefined,
      p_phone: values.phone || undefined,
    });

    if (profileError) {
      toast.error("Gagal menyimpan profil", {
        description: profileError.message,
      });
      setIsSubmitting(false);
      return;
    }

    const { error: alumniError } = await supabase.rpc(
      "update_own_alumni_profile",
      {
        p_tempat_lahir: values.tempat_lahir || undefined,
        p_tanggal_lahir: values.tanggal_lahir || undefined,
        p_alamat: values.alamat || undefined,
        p_wilayah_id: values.wilayah_id || undefined,
      },
    );

    setIsSubmitting(false);

    if (alumniError) {
      toast.error("Gagal menyimpan data alumni", {
        description: alumniError.message,
      });
      return;
    }

    toast.success("Profil berhasil disimpan");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground">Member ID</p>
          <p className="font-medium">{memberInfo.member_id ?? "-"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Angkatan</p>
          <p className="font-medium">{memberInfo.angkatan ?? "-"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Status Keanggotaan</p>
          <p className="font-medium capitalize">
            {memberInfo.status_keanggotaan}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Member ID, angkatan, dan status keanggotaan hanya dapat diubah oleh
        Admin.
      </p>

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
                    <Input
                      type="tel"
                      placeholder="08xxxxxxxxxx"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="tanggal_lahir"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal Lahir</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          </div>

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

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
