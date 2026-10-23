/** Convert a whole number of rupees to words (Indian English). */
export function rupeesToWords(amount: number): string {
  const rupees = Math.round(Math.abs(amount));
  if (rupees === 0) return "Zero";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function twoDigits(n: number): string {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o ? `${tens[t]} ${ones[o]}` : tens[t];
  }

  function threeDigits(n: number): string {
    if (n === 0) return "";
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const hundred = h ? `${ones[h]} Hundred` : "";
    const tail = rest ? twoDigits(rest) : "";
    if (hundred && tail) return `${hundred} ${tail}`;
    return hundred || tail;
  }

  function section(n: number, label: string): string {
    if (n === 0) return "";
    return `${threeDigits(n)} ${label}`.trim();
  }

  const crore = Math.floor(rupees / 10_000_000);
  const lakh = Math.floor((rupees % 10_000_000) / 100_000);
  const thousand = Math.floor((rupees % 100_000) / 1000);
  const hundred = rupees % 1000;

  const parts = [
    section(crore, "Crore"),
    section(lakh, "Lakh"),
    section(thousand, "Thousand"),
    threeDigits(hundred),
  ].filter(Boolean);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}
