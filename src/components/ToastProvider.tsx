"use client";

import { ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ToastProvider() {
  return (
    <ToastContainer
      position="top-center"
      newestOnTop
      closeOnClick
      draggable
      autoClose={2400}
      hideProgressBar
      pauseOnHover
      pauseOnFocusLoss={false}
      theme="dark"
      transition={Slide}
      className="top-4!"
      toastClassName="awaken-toast"
    />
  );
}
