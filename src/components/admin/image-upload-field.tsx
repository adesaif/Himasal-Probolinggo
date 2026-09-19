"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB, sesuai file_size_limit bucket

export function ImageUploadField({
  folder,
  value,
  onChange,
}: {
  folder: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Format file tidak didukung", {
        description: "Gunakan JPG, PNG, atau WEBP.",
      });
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Ukuran file terlalu besar", {
        description: "Maksimal 2 MB.",
      });
      return;
    }

    setIsUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("organization-assets")
      .upload(path, file, { contentType: file.type });

    setIsUploading(false);

    if (error) {
      toast.error("Gagal mengunggah foto", { description: error.message });
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("organization-assets")
      .getPublicUrl(path);

    onChange(publicUrlData.publicUrl);
  }

  return (
    <div className="flex items-center gap-3">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Pratinjau foto"
          className="size-16 rounded-md border object-cover"
        />
      ) : (
        <div className="flex size-16 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
          Tidak ada foto
        </div>
      )}
      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload />
          {isUploading ? "Mengunggah..." : value ? "Ganti Foto" : "Unggah Foto"}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isUploading}
            onClick={() => onChange(null)}
          >
            <X />
            Hapus Foto
          </Button>
        ) : null}
      </div>
    </div>
  );
}
