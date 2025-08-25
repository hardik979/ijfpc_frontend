"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  ChevronRight,
  FileText,
  CheckCircle,
  ArrowLeft,
  Briefcase,
  BuildingIcon,
  Building2,
} from "lucide-react";
import type { Variants } from "framer-motion";
import Link from "next/link";
export default function ITJobsFactoryDashboard() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const reportCards = [
    {
      id: "preplacement-report",
      title: "Pre-Placement Report",
      description:
        "Track and manage job posting fees, candidate applications, and pre-placement analytics",
      icon: FileText,
      gradient: "from-blue-500 to-cyan-600",
      path: "/pre-placement",
    },
    {
      id: "postplacement-report",
      title: "Post-Placement Report",
      description:
        "Monitor successful placements, completion fees, and post-placement performance metrics",
      icon: CheckCircle,
      gradient: "from-green-500 to-emerald-600",
      path: "/post-placement",
    },
    {
      id: "excel-sheets",
      title: "Excel Sheets",
      description:
        "This section contains all excel sheets of IT Jobs Factory with respective name",
      icon: Briefcase,
      gradient: "from-yellow-500 to-amber-600",
      path: "/excel-sheets",
    },
    {
      id: "HR database",
      title: "HR Database",
      description:
        "This section contains the HR database of IT Jobs Factory with all the details of HR",
      icon: Building2,
      gradient: "from-red-500 to-rose-600",
      path: "/hr-database",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const,
      },
    },
    hover: {
      y: -8,
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: "easeInOut" as const,
      },
    },
  };

  const titleVariants: Variants = {
    hidden: { opacity: 0, y: -30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      {/* Background decoration - subtle moving dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 left-20 w-2 h-2 bg-blue-400 rounded-full opacity-40 animate-bounce"
          style={{ animationDelay: "0s" }}
        ></div>
        <div
          className="absolute top-40 right-32 w-1 h-1 bg-cyan-400 rounded-full opacity-30 animate-bounce"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-60 left-1/3 w-1.5 h-1.5 bg-green-400 rounded-full opacity-35 animate-bounce"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute bottom-40 right-20 w-2 h-2 bg-emerald-300 rounded-full opacity-25 animate-bounce"
          style={{ animationDelay: "3s" }}
        ></div>
        <div
          className="absolute bottom-60 left-40 w-1 h-1 bg-teal-300 rounded-full opacity-30 animate-bounce"
          style={{ animationDelay: "1.5s" }}
        ></div>
        <div
          className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-blue-300 rounded-full opacity-40 animate-bounce"
          style={{ animationDelay: "2.5s" }}
        ></div>
      </div>

      <motion.div
        className="relative z-10 container mx-auto px-6 py-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Back Button */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href={"/"}>
            {" "}
            <button className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-200 group">
              <ArrowLeft
                size={20}
                className="group-hover:-translate-x-1 transition-transform duration-200"
              />
              <span>Back to Dashboards</span>
            </button>
          </Link>
        </motion.div>

        {/* Header Section */}
        <motion.div className="text-center mb-16" variants={titleVariants}>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-green-400 bg-clip-text text-transparent mb-4">
            IT Jobs Factory
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-200 mb-4">
            Fee Dashboard
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Comprehensive reporting and analytics for job placement fees and
            performance metrics
          </p>
        </motion.div>

        {/* Report Cards Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
          variants={containerVariants}
        >
          {reportCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <motion.div
                key={card.id}
                className="group cursor-pointer"
                variants={cardVariants}
                whileHover="hover"
                onHoverStart={() => setHoveredCard(card.id)}
                onHoverEnd={() => setHoveredCard(null)}
              >
                <Link href={card.path}>
                  <div className="relative h-80 rounded-2xl overflow-hidden shadow-xl bg-slate-800 border border-slate-700">
                    {/* Gradient background */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-90`}
                    />

                    {/* Content overlay */}
                    <div className="relative z-10 h-full flex flex-col justify-between p-8 text-white">
                      {/* Icon and title section */}
                      <div className="text-center">
                        <motion.div
                          className="mb-6 flex justify-center"
                          animate={{
                            rotate: hoveredCard === card.id ? 360 : 0,
                            scale: hoveredCard === card.id ? 1.1 : 1,
                          }}
                          transition={{ duration: 0.6, ease: "easeInOut" }}
                        >
                          <IconComponent
                            size={64}
                            className="text-white drop-shadow-lg"
                          />
                        </motion.div>

                        <h3 className="text-2xl md:text-3xl font-bold mb-4 leading-tight">
                          {card.title}
                        </h3>

                        <p className="text-white/90 text-base leading-relaxed opacity-90">
                          {card.description}
                        </p>
                      </div>

                      {/* Arrow indicator */}
                      <motion.div
                        className="self-center mt-6"
                        animate={{
                          x: hoveredCard === card.id ? 8 : 0,
                          opacity: hoveredCard === card.id ? 1 : 0.7,
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <ChevronRight
                          size={36}
                          className="text-white drop-shadow-lg"
                        />
                      </motion.div>
                    </div>

                    {/* Hover effect overlay */}
                    <motion.div
                      className="absolute inset-0 bg-white"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: hoveredCard === card.id ? 0.1 : 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Footer section */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <p className="text-gray-400 text-sm">
            Select a report type to view detailed analytics and manage your job
            placement operations
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
