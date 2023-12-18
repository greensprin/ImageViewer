const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("api", {
    // renderer -> main
    // renderer_to_main : async (args) => await ipcRenderer.invoke("renderer_to_main" , args),
    sendDropFile   : async (args) => await ipcRenderer.invoke("sendDropFile", args),
    existFile      : async (args) => await ipcRenderer.invoke("existFile", args),
    getCmdArgsImage: async ()     => await ipcRenderer.invoke("getCmdArgsImage"),

    // main -> renderer
    on: (channel, callback) => ipcRenderer.on(channel, (event, args) => callback(event, args)),
});