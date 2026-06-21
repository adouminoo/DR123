import { clipboard, contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('licenseAdmin', {
  copyText: async (value: string) => {
    clipboard.writeText(value);
  },
  saveCsv: (defaultName: string, content: string) => ipcRenderer.invoke('save-csv', defaultName, content),
});
