import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("stockApp", {
  scan: () => ipcRenderer.invoke("stocks:scan")
});
