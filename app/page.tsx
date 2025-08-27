"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  ChevronRight,
  BarChart3,
  Settings,
  SheetIcon,
  Database,
} from "lucide-react";
import type { Variants } from "framer-motion";
import Link from "next/link";

export default function AdminDashboard() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const dashboardCards = [
    {
      id: "it-jobs-factory",
      title: "IT Jobs Factory Fees",
      description:
        "Monitor and manage job posting fees, payment tracking, and revenue analytics",
      icon: BarChart3,
      gradient: "from-purple-500 to-indigo-600",
      path: "/fee-dashboard", // You can update this path as needed
    },
    {
      id: "it-jobs-factory-sheets",
      title: "Excel Sheets",
      description:
        "Track and get access to all the Excel sheets of all the data at one place",
      icon: SheetIcon,
      gradient: "from-blue-500 to-sky-400",
      path: "/fee-dashboard/excel-sheets", // You can update this path as needed
    },
    {
      id: "it-jobs-factory-hrdb",
      title: "HR Database",
      description:
        "Get access to the database of all hr contacts from different company in one place",
      icon: Database,
      gradient: "from-emerald-500 to-green-400",
      path: "/fee-dashboard/hr-database", // You can update this path as needed
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
        ease: "easeOut" as const, // ✅ type-safe
      },
    },
    hover: {
      y: -8,
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: "easeInOut" as const, // ✅
      },
    },
  };

  const titleVariants: Variants = {
    hidden: { opacity: 0, y: -30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1], // ✅ smooth ease-out curve
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      {/* Background decoration - subtle moving dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 left-20 w-2 h-2 bg-purple-400 rounded-full opacity-40 animate-bounce"
          style={{ animationDelay: "0s" }}
        ></div>
        <div
          className="absolute top-40 right-32 w-1 h-1 bg-indigo-400 rounded-full opacity-30 animate-bounce"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-60 left-1/3 w-1.5 h-1.5 bg-blue-400 rounded-full opacity-35 animate-bounce"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute bottom-40 right-20 w-2 h-2 bg-purple-300 rounded-full opacity-25 animate-bounce"
          style={{ animationDelay: "3s" }}
        ></div>
        <div
          className="absolute bottom-60 left-40 w-1 h-1 bg-indigo-300 rounded-full opacity-30 animate-bounce"
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
        {/* Header Section */}
        <motion.div className="text-center mb-16" variants={titleVariants}>
          <h1 className="text-5xl md:text-5xl font-bold text-sky-400 mb-4 font-[Righteous]">
            <span className="text-yellow-400">IT</span> Jobs Factory Dashboards
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Comprehensive analytics and management tools for your business
            operations
          </p>
        </motion.div>

        {/* Dashboard Cards Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
          variants={containerVariants}
        >
          {dashboardCards.map((card) => {
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
                {" "}
                <Link href={card.path}>
                  <div className="relative h-72 rounded-2xl overflow-hidden shadow-xl bg-slate-800 border border-slate-700">
                    {/* Gradient background */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-90`}
                    />

                    {/* Content overlay */}
                    <div className="relative z-10 h-full flex flex-col justify-between p-8 text-white">
                      {/* Icon and title section */}
                      <div>
                        <motion.div
                          className="mb-4"
                          animate={{
                            rotate: hoveredCard === card.id ? 360 : 0,
                            scale: hoveredCard === card.id ? 1.1 : 1,
                          }}
                          transition={{ duration: 0.6, ease: "easeInOut" }}
                        >
                          <IconComponent
                            size={48}
                            className="text-white drop-shadow-lg"
                          />
                        </motion.div>

                        <h3 className="text-2xl font-bold mb-3 leading-tight">
                          {card.title}
                        </h3>

                        <p className="text-purple-100 text-sm leading-relaxed opacity-90">
                          {card.description}
                        </p>
                      </div>

                      {/* Arrow indicator */}
                      <motion.div
                        className="self-end"
                        animate={{
                          x: hoveredCard === card.id ? 8 : 0,
                          opacity: hoveredCard === card.id ? 1 : 0.7,
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <ChevronRight
                          size={32}
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

          {/* Placeholder cards for future dashboards */}
        </motion.div>

        {/* Footer section */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <p className="text-gray-400 text-sm">
            Select a dashboard to get started with your analytics and management
            tools
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
