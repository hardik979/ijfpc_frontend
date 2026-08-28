"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  ReceiptIndianRupee,
  RefreshCw,
  Search,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Installment = {
  _id?: string;
  label?: string;
  amount?: number;
  date?: string | null;
  mode?: string;
  note?: string;
};

type PostPlacementOffer = {
  _id: string;
  studentName: string;
  clerkId?: string | null;
  email?: string | null;
  offerDate?: string | null;
  joiningDate?: string | null;
  companyName?: string | null;
  location?: string | null;
  hr?: {
    name?: string | null;
    contactNumber?: string | null;
    email?: string | null;
  };
  packageLPA?: number | null;
  totalPostPlacementFee?: number | null;
  remainingPrePlacementFee?: number | null;
  discount?: number | null;
  installments?: Installment[];
  remainingFee?: number | null;
  remainingFeeNote?: string | null;
  offerLetterUrl?: string | null;
  offerLetterOriginalName?: string | null;
  updatedAt?: string | null;
};

type PaymentStatus = "ALL" | "PAID" | "PARTIAL" | "UNPAID";

const API_URL = "/api/fee-dashboard/post-placement/offers";
const PAGE_SIZE = 10;

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(value));

const compactCurrency = (value: number) => {
  if (Math.abs(value) >= 10_000_000)
    return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (Math.abs(value) >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (Math.abs(value) >= 1_000) return `₹${(value / 1_000).toFixed(0)}K`;
  return `₹${Math.round(value)}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const monthKey = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const collectedFor = (offer: PostPlacementOffer) =>
  (offer.installments || []).reduce(
    (total, installment) => total + toNumber(installment.amount),
    0,
  );

const netFeeFor = (offer: PostPlacementOffer) =>
  Math.max(toNumber(offer.totalPostPlacementFee) - toNumber(offer.discount), 0);

const remainingFor = (offer: PostPlacementOffer) =>
  Math.max(netFeeFor(offer) - collectedFor(offer), 0);

const paymentStatusFor = (
  offer: PostPlacementOffer,
): Exclude<PaymentStatus, "ALL"> => {
  const collected = collectedFor(offer);
  const remaining = remainingFor(offer);
  if (remaining <= 0 && netFeeFor(offer) > 0) return "PAID";
  if (collected > 0) return "PARTIAL";
  return "UNPAID";
};

const statusMeta = {
  PAID: {
    label: "Paid",
    dot: "bg-emerald-400",
    badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  },
  PARTIAL: {
    label: "Partially paid",
    dot: "bg-amber-400",
    badge: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  },
  UNPAID: {
    label: "Not started",
    dot: "bg-rose-400",
    badge: "border-rose-400/25 bg-rose-400/10 text-rose-200",
  },
} satisfies Record<
  Exclude<PaymentStatus, "ALL">,
  { label: string; dot: string; badge: string }
>;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "ST";

const formatMode = (value?: string) =>
  value
    ? value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Not recorded";

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone: "sky" | "emerald" | "amber" | "violet";
}) {
  const tones = {
    sky: "border-sky-400/25 bg-sky-400/10 text-sky-300",
    emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    amber: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    violet: "border-violet-400/25 bg-violet-400/10 text-violet-300",
  };

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/65 p-5 shadow-xl shadow-black/15 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-slate-600 sm:p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-500/60 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold font-mono  uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {value}
          </p>
          <p className="mt-2 text-sm text-slate-400">{detail}</p>
        </div>
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${tones[tone]}`}
        >
          {icon}
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: Exclude<PaymentStatus, "ALL"> }) {
  const meta = statusMeta[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function DetailModal({
  offer,
  onClose,
}: {
  offer: PostPlacementOffer;
  onClose: () => void;
}) {
  const collected = collectedFor(offer);
  const remaining = remainingFor(offer);
  const netFee = netFeeFor(offer);
  const progress = netFee ? Math.min((collected / netFee) * 100, 100) : 0;
  const installments = [...(offer.installments || [])].sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
  );

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`${offer.studentName} post-placement fee details`}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-slate-700 bg-[#0b1625] shadow-2xl shadow-black/60">
        <header className="sticky top-0 z-10 border-b border-slate-700/80 bg-[#0b1625]/95 p-5 backdrop-blur-xl sm:p-7">
          <div className="flex items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-sky-400/25 bg-sky-400/10 text-lg font-black text-sky-200">
                {initials(offer.studentName)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                  Post-placement fee record
                </p>
                <h2 className="mt-1 truncate text-2xl font-black text-white">
                  {offer.studentName}
                </h2>
                <p className="mt-1 truncate text-sm text-slate-400">
                  {offer.companyName || "Company not recorded"}
                  {offer.location ? ` · ${offer.location}` : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-slate-500 hover:text-white"
              aria-label="Close details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="space-y-6 p-5 sm:p-7">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Net fee", currency(netFee)],
              ["Collected", currency(collected)],
              ["Outstanding", currency(remaining)],
              ["Discount", currency(toNumber(offer.discount))],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-lg font-black text-white">{value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-slate-700/80 bg-slate-900/55 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white">
                  Collection progress
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {progress.toFixed(1)}% of the discounted fee collected
                </p>
              </div>
              <StatusBadge status={paymentStatusFor(offer)} />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/55 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <BriefcaseBusiness className="h-4 w-4 text-sky-300" /> Placement
                details
              </h3>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  ["Company", offer.companyName || "—"],
                  ["Location", offer.location || "—"],
                  [
                    "Package",
                    offer.packageLPA ? `${offer.packageLPA} LPA` : "—",
                  ],
                  ["Offer date", formatDate(offer.offerDate)],
                  ["Joining date", formatDate(offer.joiningDate)],
                  [
                    "Carried pre-fee",
                    currency(toNumber(offer.remainingPrePlacementFee)),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3 last:border-0 last:pb-0"
                  >
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="text-right font-semibold text-slate-200">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/55 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <UserRound className="h-4 w-4 text-emerald-300" /> Contact and
                HR
              </h3>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  ["Student email", offer.email || "—"],
                  ["HR name", offer.hr?.name || "—"],
                  ["HR phone", offer.hr?.contactNumber || "—"],
                  ["HR email", offer.hr?.email || "—"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3 last:border-0 last:pb-0"
                  >
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="max-w-[65%] break-words text-right font-semibold text-slate-200">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              {offer.offerLetterUrl && (
                <a
                  href={offer.offerLetterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-sky-400/25 bg-sky-400/10 px-4 py-2.5 text-sm font-bold text-sky-200 transition hover:bg-sky-400/15"
                >
                  <Download className="h-4 w-4" /> View offer letter
                </a>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-700/80 bg-slate-900/55 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Payment history
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Every recorded post-placement installment
                </p>
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-xs font-semibold text-slate-300">
                {installments.length} payments
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700/70">
              {installments.length ? (
                installments.map((installment, index) => (
                  <div
                    key={installment._id || `${installment.date}-${index}`}
                    className="grid gap-3 border-b border-slate-800 bg-slate-950/25 p-4 last:border-0 sm:grid-cols-[1.4fr_1fr_1fr] sm:items-center"
                  >
                    <div>
                      <p className="font-bold text-slate-100">
                        {installment.label ||
                          `Installment ${installments.length - index}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(installment.date)}
                      </p>
                    </div>
                    <div className="sm:text-center">
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Mode
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-300">
                        {formatMode(installment.mode)}
                      </p>
                    </div>
                    <p className="text-lg font-black text-emerald-300 sm:text-right">
                      {currency(toNumber(installment.amount))}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-slate-500">
                  No installment has been recorded yet.
                </div>
              )}
            </div>
            {offer.remainingFeeNote && (
              <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-100">
                <span className="font-bold">Balance note:</span>{" "}
                {offer.remainingFeeNote}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function PostPlacementDashboard() {
  const [offers, setOffers] = useState<PostPlacementOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("ALL");
  const [company, setCompany] = useState("ALL");
  const [month, setMonth] = useState("ALL");
  const [chartYear, setChartYear] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedOffer, setSelectedOffer] = useState<PostPlacementOffer | null>(
    null,
  );

  const loadOffers = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await fetch(API_URL, { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error || "Unable to load post-placement fee records",
        );
      }
      const rows = Array.isArray(body)
        ? body
        : Array.isArray(body?.items)
          ? body.items
          : [];
      setOffers(rows);
    } catch (requestError) {
      console.error(requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load post-placement fee records",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  useEffect(() => {
    setPage(1);
  }, [search, status, company, month]);

  const totals = useMemo(
    () =>
      offers.reduce(
        (result, offer) => {
          result.gross += toNumber(offer.totalPostPlacementFee);
          result.discount += toNumber(offer.discount);
          result.collected += collectedFor(offer);
          result.remaining += remainingFor(offer);
          return result;
        },
        { gross: 0, discount: 0, collected: 0, remaining: 0 },
      ),
    [offers],
  );

  const uniqueStudents = useMemo(
    () =>
      new Set(
        offers.map((offer) =>
          String(offer.clerkId || offer.email || offer.studentName)
            .trim()
            .toLowerCase(),
        ),
      ).size,
    [offers],
  );

  const statusCounts = useMemo(() => {
    const counts = { PAID: 0, PARTIAL: 0, UNPAID: 0 };
    offers.forEach((offer) => {
      counts[paymentStatusFor(offer)] += 1;
    });
    return counts;
  }, [offers]);

  const companies = useMemo(
    () =>
      [
        ...new Set(
          offers
            .map((offer) => offer.companyName?.trim())
            .filter(Boolean) as string[],
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [offers],
  );

  const monthOptions = useMemo(() => {
    const values = new Set<string>();
    offers.forEach((offer) => {
      (offer.installments || []).forEach((installment) => {
        const key = monthKey(installment.date);
        if (key) values.add(key);
      });
    });
    return [...values].sort((a, b) => b.localeCompare(a));
  }, [offers]);

  const chartData = useMemo(() => {
    const months = new Map<string, number>();
    offers.forEach((offer) => {
      (offer.installments || []).forEach((installment) => {
        const key = monthKey(installment.date);
        if (!key) return;
        months.set(key, (months.get(key) || 0) + toNumber(installment.amount));
      });
    });
    return [...months.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, collected]) => ({
        key,
        year: key.slice(0, 4),
        month: new Date(`${key}-01T00:00:00`).toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        }),
        collected,
      }));
  }, [offers]);

  const chartYears = useMemo(
    () =>
      [...new Set(chartData.map((item) => item.year))].sort(
        (a, b) => Number(b) - Number(a),
      ),
    [chartData],
  );

  const visibleChartData = useMemo(
    () =>
      chartYear === "ALL"
        ? chartData
        : chartData.filter((item) => item.year === chartYear),
    [chartData, chartYear],
  );

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return offers.filter((offer) => {
      const matchesSearch =
        !query ||
        offer.studentName.toLowerCase().includes(query) ||
        String(offer.email || "")
          .toLowerCase()
          .includes(query) ||
        String(offer.companyName || "")
          .toLowerCase()
          .includes(query) ||
        String(offer.location || "")
          .toLowerCase()
          .includes(query);
      const matchesStatus =
        status === "ALL" || paymentStatusFor(offer) === status;
      const matchesCompany = company === "ALL" || offer.companyName === company;
      const matchesMonth =
        month === "ALL" ||
        (offer.installments || []).some(
          (installment) => monthKey(installment.date) === month,
        );
      return matchesSearch && matchesStatus && matchesCompany && matchesMonth;
    });
  }, [company, month, offers, search, status]);

  const filteredTotals = useMemo(
    () =>
      filteredOffers.reduce(
        (result, offer) => {
          const selectedPayments =
            month === "ALL"
              ? offer.installments || []
              : (offer.installments || []).filter(
                  (installment) => monthKey(installment.date) === month,
                );
          result.collected += selectedPayments.reduce(
            (sum, installment) => sum + toNumber(installment.amount),
            0,
          );
          result.remaining += remainingFor(offer);
          return result;
        },
        { collected: 0, remaining: 0 },
      ),
    [filteredOffers, month],
  );

  const pageCount = Math.max(Math.ceil(filteredOffers.length / PAGE_SIZE), 1);
  const visibleOffers = filteredOffers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const collectionRate =
    totals.gross - totals.discount > 0
      ? Math.min(
          (totals.collected / (totals.gross - totals.discount)) * 100,
          100,
        )
      : 0;

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#07111d] px-6 text-slate-200">
        <div className="text-center">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-sky-300" />
          <p className="mt-4 text-sm font-semibold">
            Loading post-placement portfolio…
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#07111d] px-6 text-slate-200">
        <div className="w-full max-w-md rounded-3xl border border-rose-400/20 bg-slate-900/80 p-8 text-center shadow-2xl">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-300" />
          <h1 className="mt-4 text-xl font-black text-white">
            Post-placement data unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <button
            type="button"
            onClick={() => void loadOffers()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-sky-300"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111d] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-sky-500/8 blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-emerald-500/6 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(148,163,184,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.35)_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      <div className="relative mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="relative overflow-hidden rounded-[2rem] border border-slate-700/80 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-sky-400 via-emerald-300 to-amber-300" />
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <Link
                href="/fee-dashboard"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" /> Back to fee dashboard
              </Link>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-sky-300">
                Post-placement finance
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Post-placement fee portfolio
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                Track offer-linked commitments, installments, discounts, and
                outstanding balances from one reliable workspace.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-right sm:block">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Portfolio records
                </p>
                <p className="mt-1 font-black text-white">
                  {offers.length} offers · {uniqueStudents} students
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadOffers(true)}
                disabled={refreshing}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-bold text-slate-200 transition hover:border-sky-400/50 hover:text-white disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />{" "}
                Refresh
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Net collected"
            value={currency(totals.collected)}
            detail={`${collectionRate.toFixed(1)}% of discounted portfolio`}
            icon={<WalletCards className="h-5 w-5" />}
            tone="emerald"
          />
          <MetricCard
            label="Outstanding"
            value={currency(totals.remaining)}
            detail="Current collectible balance"
            icon={<Clock3 className="h-5 w-5" />}
            tone="amber"
          />
          <MetricCard
            label="Net commitment"
            value={currency(Math.max(totals.gross - totals.discount, 0))}
            detail={`${currency(totals.discount)} total discount`}
            icon={<ReceiptIndianRupee className="h-5 w-5" />}
            tone="sky"
          />
          <MetricCard
            label="Placed students"
            value={String(uniqueStudents)}
            detail={`${offers.length} linked offer records`}
            icon={<UsersRound className="h-5 w-5" />}
            tone="violet"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.75fr)]">
          <article className="rounded-3xl border border-slate-700/70 bg-slate-900/60 p-5 shadow-xl shadow-black/15 backdrop-blur-xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                  Collection movement
                </p>
                <h2 className="mt-1 text-lg font-bold text-white">
                  Monthly installments collected
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Actual post-placement payments grouped by month
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={chartYear}
                  onChange={(event) => setChartYear(event.target.value)}
                  aria-label="Collection graph year"
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                >
                  <option value="ALL">All years</option>
                  {chartYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <span className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-300">
                  {visibleChartData.length} months
                </span>
              </div>
            </div>
            <div className="mt-5 h-72 w-full">
              {visibleChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={visibleChartData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="postPlacementFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#34d399"
                          stopOpacity={0.32}
                        />
                        <stop
                          offset="95%"
                          stopColor="#34d399"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="#1e293b"
                      strokeDasharray="4 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      stroke="#64748b"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <YAxis
                      stroke="#64748b"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      tickFormatter={compactCurrency}
                      width={58}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0f1b2a",
                        border: "1px solid #334155",
                        borderRadius: 12,
                        color: "#e2e8f0",
                      }}
                      formatter={(value) => [
                        currency(Number(value || 0)),
                        "Collected",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="collected"
                      stroke="#34d399"
                      strokeWidth={2.5}
                      fill="url(#postPlacementFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 text-center">
                  <TrendingUp className="h-8 w-8 text-slate-600" />
                  <p className="mt-3 text-sm font-semibold text-slate-300">
                    No collection history for this year
                  </p>
                </div>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-700/70 bg-slate-900/60 p-5 shadow-xl shadow-black/15 backdrop-blur-xl sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Portfolio health
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">
              Collection status
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Offer records grouped by payment progress
            </p>
            <div className="mt-6 space-y-4">
              {(["PAID", "PARTIAL", "UNPAID"] as const).map((item) => {
                const count = statusCounts[item];
                const percentage = offers.length
                  ? (count / offers.length) * 100
                  : 0;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setStatus(item)}
                    className="w-full rounded-2xl border border-slate-700/80 bg-slate-950/25 p-4 text-left transition hover:border-slate-600 hover:bg-slate-800/50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2 text-sm font-bold text-slate-200">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${statusMeta[item].dot}`}
                        />
                        {statusMeta[item].label}
                      </span>
                      <span className="text-xl font-black text-white">
                        {count}
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full ${statusMeta[item].dot}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </article>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/65 shadow-xl shadow-black/15 backdrop-blur-xl">
          <div className="border-b border-slate-700 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                  Fee ledger
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Post-placement records
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search, filter, and inspect every offer-linked fee record.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <label className="relative sm:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search student, email, company…"
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950/45 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/15"
                  />
                </label>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as PaymentStatus)
                  }
                  aria-label="Payment status"
                  className="h-11 rounded-xl border border-slate-700 bg-slate-950/45 px-3 text-sm text-slate-200 outline-none focus:border-sky-400"
                >
                  <option value="ALL">All statuses</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIAL">Partially paid</option>
                  <option value="UNPAID">Not started</option>
                </select>
                <select
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  aria-label="Payment month"
                  className="h-11 rounded-xl border border-slate-700 bg-slate-950/45 px-3 text-sm text-slate-200 outline-none focus:border-sky-400"
                >
                  <option value="ALL">All payment months</option>
                  {monthOptions.map((key) => (
                    <option key={key} value={key}>
                      {new Date(`${key}-01T00:00:00`).toLocaleDateString(
                        "en-IN",
                        { month: "short", year: "numeric" },
                      )}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <select
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                aria-label="Company"
                className="h-10 max-w-xs rounded-xl border border-slate-700 bg-slate-950/45 px-3 text-sm text-slate-300 outline-none focus:border-sky-400"
              >
                <option value="ALL">All companies</option>
                {companies.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                <span className="font-bold text-slate-300">
                  {filteredOffers.length}
                </span>{" "}
                records · {currency(filteredTotals.collected)} collected ·{" "}
                {currency(filteredTotals.remaining)} outstanding
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead className="bg-slate-950/35 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Student</th>
                  <th className="px-4 py-4 font-semibold">Placement</th>
                  <th className="px-4 py-4 font-semibold">Net fee</th>
                  <th className="px-4 py-4 font-semibold">Collected</th>
                  <th className="px-4 py-4 font-semibold">Outstanding</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/90">
                {visibleOffers.map((offer) => {
                  const recordStatus = paymentStatusFor(offer);
                  return (
                    <tr
                      key={offer._id}
                      onClick={() => setSelectedOffer(offer)}
                      className="cursor-pointer transition hover:bg-sky-400/[0.035]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-sky-400/20 bg-sky-400/10 text-xs font-black text-sky-200">
                            {initials(offer.studentName)}
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate text-sm font-bold text-slate-100">
                              {offer.studentName}
                            </p>
                            <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                              {offer.email || "LMS identity not linked"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-[190px] truncate text-sm font-semibold text-slate-200">
                          {offer.companyName || "Company not recorded"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {offer.packageLPA
                            ? `${offer.packageLPA} LPA`
                            : "Package —"}{" "}
                          · {formatDate(offer.offerDate)}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-slate-200">
                        {currency(netFeeFor(offer))}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-emerald-300">
                        {currency(collectedFor(offer))}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-amber-200">
                        {currency(remainingFor(offer))}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={recordStatus} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedOffer(offer);
                          }}
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-300 transition hover:text-sky-200"
                        >
                          Open <ArrowUpRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!visibleOffers.length && (
            <div className="p-12 text-center">
              <Search className="mx-auto h-9 w-9 text-slate-600" />
              <p className="mt-4 font-bold text-slate-300">
                No matching fee records
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Adjust the search or filters to see more results.
              </p>
            </div>
          )}

          <footer className="flex flex-col justify-between gap-3 border-t border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
            <p className="text-xs text-slate-500">
              Page {page} of {pageCount} · showing {visibleOffers.length} of{" "}
              {filteredOffers.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={page === 1}
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700 text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(current + 1, pageCount))
                }
                disabled={page === pageCount}
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700 text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </footer>
        </section>
      </div>

      {selectedOffer && (
        <DetailModal
          offer={selectedOffer}
          onClose={() => setSelectedOffer(null)}
        />
      )}
    </main>
  );
}
