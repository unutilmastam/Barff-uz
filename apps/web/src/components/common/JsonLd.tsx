/**
 * Schema.org ma'lumotini sahifaga qo'yadi.
 *
 * `dangerouslySetInnerHTML` bu yerda ATAYLAB ishlatilgan va xavfsiz:
 * kirish ma'lumoti — bizning kodimiz qurgan obyekt, u foydalanuvchi
 * matni emas. `JSON.stringify` natijasidagi `<` belgisi esa almashtiriladi,
 * aks holda kontentdagi `</script>` qatori skriptni erta yopib, undan
 * keyingi matn HTML sifatida o'qilardi.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
