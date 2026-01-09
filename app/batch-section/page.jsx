"use client";

import { motion } from "framer-motion"; 
import { useMemo, useState } from "react";
import { ChevronRight, Plus, Vault } from "lucide-react";
import Link from "next/link";

/** Dashboard card shape:
 * { id, title, description, icon, gradient, path }
 */

export default function BatchSectionPage() {
  const [hoveredCard, setHoveredCard] = useState(null);

  const dashboardCards = useMemo(
    () => [
      {
        id: "it-jobs-factory-BC",
        title: "IT Jobs Factory Batch Creation",
        description:
          "Design, launch, and manage training batches with control over course structure, trainers, schedules, and batch status.",
        icon: Plus,
        gradient: "from-slate-700 to-indigo-600",
        path: "/batch-section/batch-list",
      },
      {
        id: "it-jobs-factory-BA",
        title: "IT Jobs Factory Batch Assignment",
        description:
          "Assign students to the right batch and update batch changes anytime with a few clicks.",
        icon: Vault,
        gradient: "from-teal-500 to-cyan-600",
        path: "/batch-section/student-list",
      },
      {
        id: "it-jobs-factory-SM",
        title: "IT Jobs Factory Permission",
        description:
          "Grant Permission for students to the getting Leads for calling.",
        icon: Vault,
        gradient: "from-teal-500 to-cyan-600",
        path: "/batch-section/update-zone",
      },
    ],
    []
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.6, staggerChildren: 0.12 },
    },
  }; 

  const cardVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.45, ease: "easeOut" },
    },
    hover: {
      y: -6,
      scale: 1.01,
      transition: { duration: 0.25, ease: "easeInOut" },
    },
  }; 

  const titleVariants = {
    hidden: { opacity: 0, y: -18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      {/* Subtle background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-20 -right-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />

        {/* light dots */}
        <div className="absolute top-20 left-20 h-1.5 w-1.5 rounded-full bg-white/25 animate-pulse" />
        <div className="absolute top-44 right-32 h-1 w-1 rounded-full bg-white/20 animate-pulse [animation-delay:0.6s]" />
        <div className="absolute bottom-40 right-24 h-1.5 w-1.5 rounded-full bg-white/15 animate-pulse [animation-delay:1.2s]" />
      </div>

      <motion.div
        className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div className="text-center" variants={titleVariants}>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-100">
            <span className="text-yellow-400">IT</span>{" "}
            <span className="text-sky-400">Jobs Factory</span>{" "}
            <span className="text-slate-200">Dashboards</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Centralized tools for batch creation and student assignment—built for speed, clarity, and control.
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={containerVariants}
        >
          {dashboardCards.map((card) => {
            const IconComponent = card.icon;

            return (
              <motion.div
                key={card.id}
                className="group"
                variants={cardVariants}
                whileHover="hover"
                onHoverStart={() => setHoveredCard(card.id)}
                onHoverEnd={() => setHoveredCard(null)}
              >
                <Link href={card.path} className="block">
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-sm backdrop-blur">
                    {/* top gradient strip */}
                    <div className="relative h-1.5 w-full bg-gradient-to-r from-white/10 to-white/0">
                      <div className={`absolute inset-0 bg-gradient-to-r ${card.gradient} opacity-70`} />
                    </div>

                    <div className="p-6 sm:p-7">
                      <div className="flex items-start justify-between gap-4">
                        <motion.div
                          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5"
                          animate={{
                            rotate: hoveredCard === card.id ? 8 : 0,
                            scale: hoveredCard === card.id ? 1.03 : 1,
                          }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                        >
                          <IconComponent className="h-6 w-6 text-slate-100" />
                        </motion.div>

                        <motion.div
                          className="mt-1"
                          animate={{
                            x: hoveredCard === card.id ? 6 : 0,
                            opacity: hoveredCard === card.id ? 1 : 0.65,
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="h-6 w-6 text-slate-200" />
                        </motion.div>
                      </div>

                      <h3 className="mt-4 text-lg sm:text-xl font-semibold text-slate-100">
                        {card.title}
                      </h3>

                      <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                        {card.description}
                      </p>

                      {/* subtle hover wash */}
                      <div
                        className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Footer */}
        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <p className="text-xs sm:text-sm text-slate-500">
            Select a dashboard to continue.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
