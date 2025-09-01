"use client";
import { GraduationCap, Home } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dashboardLinks = [
    {
      label: "Home",
      icon: <Home size={20} />,
      href: "/",
      description: "Home",
    },
    {
      label: "Placement-Cell",
      icon: <GraduationCap size={20} />,
      href: "/post-placement-student-creation",
    },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      <aside className="fixed top-0 left-0 z-50 w-64 h-screen bg-white shadow-lg transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out"></aside>
    </>
  );
}
