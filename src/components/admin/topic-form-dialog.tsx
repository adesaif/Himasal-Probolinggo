"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import { topicSchema, type TopicInput } from "@/lib/validators/content";
import type { SiteTopic } from "@/lib/topics";

export function TopicFormDialog({
  topic,
  trigger,
}: {
  topic: SiteTopic;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TopicInput>({
    resolver: zodResolver(topicSchema),
    defaultValues: {
      label: topic.label,
      description: topic.description ?? "",
      allow_featured: topic.allow_featured,
    },
  });

  async function onSubmit(values: TopicInput) {
    setIsSubmitting(true);
    const supabase = createClient();

    const payload = {
      label: values.label,
      description: values.description || null,
      // Kalau topik ini belum punya mekanisme Featured di kontennya
      // (supports_featured=false), toggle di form ini tidak dirender -
      // allow_featured live-nya tetap dikunci false, tidak ikut disimpan.
      ...(topic.supports_featured ? { allow_featured: values.allow_featured } : {}),
    };

    const { error } = await supabase.from("site_topics").update(payload).eq("id", topic.id);
    setIsSubmitting(false);

    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
      return;
    }
    toast.success("Topik berhasil diperbarui");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Topik</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Topik</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi (opsional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {topic.supports_featured ? (
              <FormField
                control={form.control}
                name="allow_featured"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Izinkan Unggulan / Featured</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                        <span className="text-sm text-muted-foreground">
                          {field.value
                            ? "Konten topik ini boleh ditandai Featured dan masuk Hero Carousel"
                            : "Konten topik ini tidak bisa masuk Hero Carousel"}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div>
                <p className="text-sm font-medium">Izinkan Unggulan / Featured</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Belum tersedia — konten pada topik ini belum punya mekanisme
                  Featured.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
