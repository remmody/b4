import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { WebSocketProvider } from "./ctx/B4WsProvider";
import App from "./App";

const root = createRoot(document.getElementById("root")!);
root.render(
  <BrowserRouter>
    <WebSocketProvider>
      <App />
    </WebSocketProvider>
  </BrowserRouter>
);
