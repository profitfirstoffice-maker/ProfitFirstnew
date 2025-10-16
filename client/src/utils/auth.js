// isTokenValid.js
import { jwtDecode } from "jwt-decode";
export const isTokenValid = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    const { exp } = jwtDecode(token);   // now jwtDecode is actually a function
    return Date.now() < exp * 1000;
  } catch (err) {
    console.error("Invalid token:", err);
    return false;
  }
};


export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  window.location.href = "/login"; // lowercase route
};
