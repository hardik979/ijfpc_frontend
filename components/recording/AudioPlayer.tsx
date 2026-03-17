export default function AudioPlayer({ src }: { src: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm font-medium text-slate-900">Audio</div>
      <audio className="mt-3 w-full" controls src={src} />
      <p className="mt-2 text-xs text-slate-500 break-all">{src}</p>
    </div>
  );
}
