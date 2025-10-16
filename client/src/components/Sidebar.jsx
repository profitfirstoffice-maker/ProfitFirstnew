import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { HiMenuAlt3, HiX } from "react-icons/hi";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { name: "Dashboard", path: "/dashboard", exact: true },
    { name: "Customer Analysis (beta)", path: "/dashboard/analytics" },
    { name: "Marketing", path: "/dashboard/marketing" },
    { name: "Shipping (beta) ", path: "/dashboard/shipping" },
    { name: "Products", path: "/dashboard/products" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    navigate("/login");
  };

  return (
    <>
      {/* Mobile Topbar - Menu Icon (Fixed position, overlaps content) */}
      <div className="md:hidden absolute top-4 left-4 z-50">
        <button onClick={() => setIsOpen(true)} className="text-white">
          <HiMenuAlt3 size={28} />
        </button>
      </div>
      <div
        className={`fixed top-0 left-0 h-screen w-64 bg-[#141318] text-white z-50 transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"} 
          md:static md:translate-x-0 md:block`}
      >
        <div className="p-4 flex flex-col justify-between h-full">
          <div>
            {/* Close button (mobile only) */}
            <div className="flex justify-between items-center mb-6 md:hidden">
              <img src="https://res.cloudinary.com/dqdvr35aj/image/upload/v1748330108/Logo1_zbbbz4.png" alt="Logo" className="w-32" />
              <button onClick={() => setIsOpen(false)}>
                <HiX size={28} />
              </button>
            </div>

            {/* Logo (desktop only) */}
            <img src="https://res.cloudinary.com/dqdvr35aj/image/upload/v1748330108/Logo1_zbbbz4.png" alt="Logo" className="w-40 mb-8 hidden md:block" />

            {/* Navigation */}
            <div className="space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.exact || false}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `block p-2 rounded cursor-pointer hover:bg-[#2BE092] ${
                      isActive ? "bg-[#2BE092] text-black font-medium" : ""
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="space-y-2 mt-6">
            <div className="hover:bg-[#2BE092] p-2 rounded cursor-pointer">
              <NavLink
                to="/dashboard/settings"
                onClick={() => setIsOpen(false)}
              >
                Settings
              </NavLink>
            </div>
            <div className="hover:bg-[#2BE092] p-2 rounded cursor-pointer">
              Help
            </div>
            <div
              className="hover:bg-[#2BE092] p-2 rounded cursor-pointer"
              onClick={handleLogout}
            >
              Log Out
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar; 
