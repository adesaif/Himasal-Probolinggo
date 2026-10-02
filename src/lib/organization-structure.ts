/**
 * Menyusun baris `organization_structure` (sudah urut `display_order`)
 * menjadi hierarki untuk halaman publik /struktur - murni presentasi, tanpa
 * mengubah data. Tabel tidak punya kolom divisi/parent/level, jadi hierarki
 * diturunkan HANYA dari `jabatan` + urutan:
 *
 * 1. Orang dengan jabatan identik (trim/spasi/huruf besar diabaikan) menjadi
 *    satu kelompok, diurutkan menurut kemunculan pertamanya.
 * 2. Pimpinan = jabatan tunggal (1 orang) pertama.
 * 3. Semua kelompok sebelum pimpinan = badan penasehat (bukan garis komando).
 * 4. Jabatan tunggal berturut-turut setelah pimpinan = pengurus inti,
 *    dikolomkan per kata pertama jabatan (mis. "Sekretaris Satu" dan
 *    "Sekretaris Dua" satu kolom).
 * 5. Sisanya (mulai kelompok beranggota > 1 pertama setelah pengurus inti)
 *    = bidang, masing-masing berjudul jabatannya sendiri.
 *
 * Tidak ada nama/jabatan yang di-hardcode dan tidak ada relasi bidang ->
 * pengurus inti yang dikarang (datanya memang tidak ada).
 */

export type StructurePerson = {
  id: string;
  nama: string;
  jabatan: string;
  foto_url: string | null;
};

export type StructureGroup = {
  key: string;
  label: string;
  members: StructurePerson[];
};

export type OrganizationLayout = {
  advisory: StructureGroup[];
  leader: StructurePerson | null;
  core: StructureGroup[];
  divisions: StructureGroup[];
};

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
}

function groupBy(
  people: StructurePerson[],
  keyOf: (person: StructurePerson) => string,
  labelOf: (person: StructurePerson) => string,
): StructureGroup[] {
  const groups = new Map<string, StructureGroup>();
  for (const person of people) {
    const key = keyOf(person);
    const group = groups.get(key);
    if (group) group.members.push(person);
    else groups.set(key, { key, label: labelOf(person), members: [person] });
  }
  return [...groups.values()];
}

const firstWord = (jabatan: string) => jabatan.trim().split(/\s+/)[0] ?? jabatan;

export function buildOrganizationLayout(people: StructurePerson[]): OrganizationLayout {
  const groups = groupBy(
    people,
    (p) => normalize(p.jabatan),
    (p) => p.jabatan.trim().replace(/\s+/g, " "),
  );

  const leaderIndex = groups.findIndex((g) => g.members.length === 1);
  if (leaderIndex === -1) {
    return { advisory: [], leader: null, core: [], divisions: groups };
  }

  let coreEnd = leaderIndex + 1;
  while (coreEnd < groups.length && groups[coreEnd].members.length === 1) coreEnd++;

  const corePeople = groups.slice(leaderIndex + 1, coreEnd).flatMap((g) => g.members);

  return {
    advisory: groups.slice(0, leaderIndex),
    leader: groups[leaderIndex].members[0],
    core: groupBy(
      corePeople,
      (p) => normalize(firstWord(p.jabatan)),
      (p) => firstWord(p.jabatan),
    ),
    divisions: groups.slice(coreEnd),
  };
}

/** Inisial untuk avatar tanpa foto: gelar/singkatan bertitik (KH., Dr., M.) dilewati. */
export function personInitials(nama: string) {
  const words = nama
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}.]/gu, ""))
    .filter(Boolean);
  const plain = words.filter((w) => !w.includes("."));
  const source = plain.length > 0 ? plain : words;
  if (source.length === 0) return "?";
  const first = source[0].charAt(0);
  const last = source.length > 1 ? source[source.length - 1].charAt(0) : "";
  return (first + last).toLocaleUpperCase("id-ID");
}
