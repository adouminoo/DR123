/// <reference types="vite/client" />

interface Window {
  licenseAdmin: {
    copyText: (value: string) => Promise<void>;
    saveCsv: (defaultName: string, content: string) => Promise<boolean>;
  };
}
