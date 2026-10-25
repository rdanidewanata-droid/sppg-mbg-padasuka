// Workers run in UTC; the SPPG operates in WIB (Asia/Jakarta).
export function nowWib() {
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());
  const [tanggal, waktu] = formatted.split(' ');
  return { tanggal, waktu };
}
