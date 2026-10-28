import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ActualizacionApp from "./ActualizacionApp.jsx";

const rootElement = document.getElementById("root")!;
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
    <ActualizacionApp />
  </React.StrictMode>
);
