-- public_homepage_news_by_category tidak lagi dipanggil dari mana pun -
-- homepage sudah topic-driven (lib/homepage-content.ts). Cabut EXECUTE dari
-- anon/authenticated untuk mengecilkan attack surface, TANPA drop fungsi
-- (arsip/kompatibilitas, sama seperti perlakuan hero_slides - jangan drop
-- tanpa keputusan eksplisit).
revoke execute on function public.public_homepage_news_by_category(integer) from anon, authenticated;
