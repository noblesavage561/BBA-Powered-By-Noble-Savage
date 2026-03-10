import { createContext, useContext, useEffect, useMemo, useState } from "react";

const UPLOADS_STORAGE_KEY = "bba.portal.uploads.v1";

const UploadStoreContext = createContext(null);

export function UploadStoreProvider({ children }) {
  const [uploadedDocs, setUploadedDocs] = useState([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(UPLOADS_STORAGE_KEY);
      if (!saved) {
        return;
      }
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setUploadedDocs(parsed);
      }
    } catch {
      // Ignore malformed saved uploads.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(uploadedDocs));
    } catch {
      // Ignore localStorage write failures.
    }
  }, [uploadedDocs]);

  const value = useMemo(() => ({ uploadedDocs, setUploadedDocs }), [uploadedDocs]);

  return <UploadStoreContext.Provider value={value}>{children}</UploadStoreContext.Provider>;
}

export function useUploadStore() {
  const context = useContext(UploadStoreContext);
  if (!context) {
    throw new Error("useUploadStore must be used within UploadStoreProvider");
  }
  return context;
}
