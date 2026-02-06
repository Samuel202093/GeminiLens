"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import EditableTable from "../components/EditableTable";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [dragging, setDragging] = useState(false);
  type PortalTable = { headers: string[]; rows: Array<Record<string, string>> };
  const [portalTable, setPortalTable] = useState<PortalTable | null>(null);
  const [editableRows, setEditableRows] = useState<Array<Record<string, string>>>([]);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [autoCropping, setAutoCropping] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    const detect = () => {
      const ua = navigator.userAgent || "";
      const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
      const mq = window.matchMedia ? window.matchMedia("(pointer: coarse)") : { matches: false } as MediaQueryList;
      const smallScreen = window.innerWidth <= 1024;
      setIsMobileOrTablet(mobileUA || mq.matches || smallScreen);
    };
    detect();
    const onResize = () => detect();
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia("(pointer: coarse)");
      if (mq && typeof mq.addEventListener === "function") {
        mq.addEventListener("change", detect);
      } else if (mq && typeof (mq as any).addListener === "function") {
        (mq as any).addListener(detect);
      }
    } catch {}
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (mq) {
        if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", detect);
        else if (typeof (mq as any).removeListener === "function") (mq as any).removeListener(detect);
      }
    };
  }, []);

  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const isImage = file ? file.type.startsWith("image/") : false;
  const isVideo = file ? file.type.startsWith("video/") : false;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!file) {
      setError("Please select an image or video file.");
      return;
    }
    try {
      setLoading(true);
      // For videos, sample multiple frames and merge results; for images, analyze directly
      if (file.type.startsWith("video/")) {
        const frames = await extractVideoFrames(file, 5);
        const analyzed: any[] = [];
        for (const frame of frames) {
          const data = await analyzeFile(frame, instructions);
          analyzed.push(data);
        }
        // Merge structured rows from each frame using existing table builder
        const mergedRows: Array<Record<string, string>> = [];
        for (const data of analyzed) {
          const payload = data?.result ?? data;
          const table = toDynamicTable(payload);
          if (table && table.rows.length) {
            mergedRows.push(...table.rows);
          }
        }
        if (mergedRows.length) {
          // Prefer the canonical shape that the builder understands
          setResult({ extracted_records: mergedRows });
        } else {
          // Fallback to first response if merging failed
          setResult(analyzed[0] ?? null);
        }
      } else {
        const data = await analyzeFile(file, instructions);
        setResult(data);
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  // Helpers for robust extraction from various shapes
  const isPlainObject = (val: unknown): val is Record<string, unknown> =>
    typeof val === "object" && val !== null && !Array.isArray(val);

  const parseJsonSafe = (s: string): unknown | null => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  // Redact confidence fields from any nested object for display only
  const redactConfidence = (input: any): any => {
    if (Array.isArray(input)) return input.map(redactConfidence);
    if (input && typeof input === "object") {
      const out: Record<string, any> = {};
      Object.keys(input).forEach((k) => {
        if (k.toLowerCase() === "confidence") return;
        out[k] = redactConfidence(input[k]);
      });
      return out;
    }
    return input;
  };

  const tableFromRecords = (records: Array<Record<string, unknown>>): PortalTable => {
    const headers: string[] = [
      ...new Set(
        records
          .flatMap((rec) => Object.keys(rec))
          .filter((k) => k.toLowerCase() !== "confidence")
      ),
    ];
    const rows = records.map((rec) => {
      const row: Record<string, string> = {};
      headers.forEach((h) => {
        const v = rec[h];
        row[h] = typeof v === "string" ? v : v != null ? JSON.stringify(v) : "";
      });
      return row;
    });
    return { headers, rows };
  };

  const tableFromItems = (items: Array<Record<string, unknown>>): PortalTable => {
    const headers: string[] = items.map((it) => String(it?.name ?? "Unknown"));
    const row: Record<string, string> = {};
    items.forEach((it) => {
      const name = String(it?.name ?? "Unknown");
      const val = it?.value as unknown;
      row[name] = typeof val === "string" ? val : val != null ? JSON.stringify(val) : "";
    });
    return { headers, rows: [row] };
  };

  const tableFromPlainObject = (obj: Record<string, unknown>): PortalTable => {
    const headers: string[] = Object.keys(obj).filter((k) => k.toLowerCase() !== "confidence");
    const row: Record<string, string> = {};
    headers.forEach((h) => {
      const v = obj[h];
      row[h] = typeof v === "string" ? v : v != null ? JSON.stringify(v) : "";
    });
    return { headers, rows: [row] };
  };

  const tableFromString = (s: string): PortalTable | null => {
    // Trying JSON 
    const parsed = parseJsonSafe(s);
    if (parsed != null) {
      const t = buildTableFromUnknown(parsed);
      if (t) return t;
    }
    // Trying key:value lines
    const lines = s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const kv: Record<string, string> = {};
    let kvCount = 0;
    const re = /^([A-Za-z0-9 _\-\/()]+?)\s*[:=]\s*(.+)$/;
    for (const line of lines) {
      const m = line.match(re);
      if (m) {
        const key = m[1].trim();
        const val = m[2].trim();
        kv[key] = val;
        kvCount++;
      }
    }
    if (kvCount > 0) {
      const filteredKeys = Object.keys(kv).filter((k) => k.toLowerCase() !== "confidence");
      const filteredKv: Record<string, string> = {};
      filteredKeys.forEach((k) => { filteredKv[k] = kv[k]; });
      return { headers: filteredKeys, rows: [filteredKv] };
    }
    // Fallback to raw
    return { headers: ["raw"], rows: [{ raw: s }] };
  };

  const buildTableFromUnknown = (input: unknown): PortalTable | null => {
    try {
      if (typeof input === "string") return tableFromString(input);
      if (Array.isArray(input)) {
        const arr = input as unknown[];
        if (arr.length && arr.every((el) => isPlainObject(el))) {
          return tableFromRecords(arr as Array<Record<string, unknown>>);
        }
        for (const el of arr) {
          const t = buildTableFromUnknown(el);
          if (t) return t;
        }
        return null;
      }
      if (isPlainObject(input)) {
        const obj = input as Record<string, unknown>;
        // Preferred shapes
        if (Array.isArray(obj.extracted_records)) {
          const recs = (obj.extracted_records as unknown[]).filter((r) => isPlainObject(r)) as Array<Record<string, unknown>>;
          if (recs.length) return tableFromRecords(recs);
        }
        if (Array.isArray(obj.records)) {
          const recs = (obj.records as unknown[]).filter((r) => isPlainObject(r)) as Array<Record<string, unknown>>;
          if (recs.length) return tableFromRecords(recs);
        }
        if (Array.isArray(obj.extracted_items)) {
          const items = (obj.extracted_items as unknown[]).filter((r) => isPlainObject(r)) as Array<Record<string, unknown>>;
          if (items.length) return tableFromItems(items);
        }
        if (Array.isArray(obj.items)) {
          const items = (obj.items as unknown[]).filter((r) => isPlainObject(r)) as Array<Record<string, unknown>>;
          if (items.length) return tableFromItems(items);
        }
        // Search nested first for structured content
        for (const key of Object.keys(obj)) {
          const child = obj[key];
          const t = buildTableFromUnknown(child);
          if (t) return t;
        }
        // Fallback to plain object mapping
        return tableFromPlainObject(obj);
      }
      return null;
    } catch {
      return null;
    }
  };

  const toDynamicTable = (payload: any): PortalTable | null => buildTableFromUnknown(payload);

  // Export helpers
  const ensureXLSX = async (): Promise<any> => {
    try {
      const mod = await import("xlsx");
      return mod;
    } catch {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/xlsx/dist/xlsx.full.min.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load XLSX from CDN"));
        document.body.appendChild(script);
      });
      // @ts-ignore
      const xlsxGlobal = (window as any).XLSX;
      if (!xlsxGlobal) throw new Error("XLSX not available after CDN load");
      return xlsxGlobal;
    }
  };

  const downloadCSV = (headers: string[], rows: Array<Record<string, string>>) => {
    const csv = [headers.join(",")]
      .concat(
        rows.map((r) =>
          headers
            .map((h) => {
              const v = r[h] ?? "";
              const safe = String(v).replace(/"/g, '""');
              return `"${safe}"`;
            })
            .join(",")
        )
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "structured-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAutoCrop = async () => {
    if (!objectUrl || !file) return;
    try {
      setAutoCropping(true);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objectUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { width, height } = data;
      const isNotWhite = (r: number, g: number, b: number) => !(r > 240 && g > 240 && b > 240);
      let top = 0, bottom = height - 1, left = 0, right = width - 1;
      outerTop: for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const r = data.data[idx], g = data.data[idx + 1], b = data.data[idx + 2];
          if (isNotWhite(r, g, b)) { top = y; break outerTop; }
        }
      }
      outerBottom: for (let y = height - 1; y >= 0; y--) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const r = data.data[idx], g = data.data[idx + 1], b = data.data[idx + 2];
          if (isNotWhite(r, g, b)) { bottom = y; break outerBottom; }
        }
      }
      outerLeft: for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const idx = (y * width + x) * 4;
          const r = data.data[idx], g = data.data[idx + 1], b = data.data[idx + 2];
          if (isNotWhite(r, g, b)) { left = x; break outerLeft; }
        }
      }
      outerRight: for (let x = width - 1; x >= 0; x--) {
        for (let y = 0; y < height; y++) {
          const idx = (y * width + x) * 4;
          const r = data.data[idx], g = data.data[idx + 1], b = data.data[idx + 2];
          if (isNotWhite(r, g, b)) { right = x; break outerRight; }
        }
      }
      const cropW = Math.max(1, right - left + 1);
      const cropH = Math.max(1, bottom - top + 1);
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext("2d");
      if (!cropCtx) throw new Error("Canvas not supported");
      cropCtx.drawImage(img, left, top, cropW, cropH, 0, 0, cropW, cropH);
      const blob: Blob | null = await new Promise((resolve) => cropCanvas.toBlob(resolve, file.type || "image/png", 0.95));
      if (!blob) throw new Error("Failed to create cropped image");
      const croppedFile = new File([blob], file.name.replace(/(\.[a-z]+)$/i, "_cropped$1"), { type: blob.type });
      setFile(croppedFile);
    } catch {
      setError("Auto-crop failed");
    } finally {
      setAutoCropping(false);
    }
  };

  // Analyze a single file by calling the backend endpoint
  const analyzeFile = async (f: File, instr: string) => {
    const fd = new FormData();
    fd.set("file", f);
    if (instr.trim()) fd.set("instructions", instr.trim());
    const res = await fetch("/api/analyze", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to analyze media");
    return data;
  };

  // Extract multiple frames from a video file for analysis
  const extractVideoFrames = async (videoFile: File, count = 5): Promise<File[]> => {
    const url = URL.createObjectURL(videoFile);
    try {
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Failed to load video"));
      });
      const duration = Math.max(video.duration || 0, 0);
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      const times: number[] = [];
      const start = Math.min(0.15, duration * 0.01);
      const end = duration > 0 ? Math.max(duration - 0.15, start) : start + 0.5;
      for (let i = 0; i < count; i++) {
        const t = start + (i * (end - start)) / Math.max(count - 1, 1);
        times.push(t);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      const frames: File[] = [];
      for (let i = 0; i < times.length; i++) {
        const t = times[i];
        await new Promise<void>((resolve) => {
          const onSeeked = () => resolve();
          video.onseeked = onSeeked;
          try {
            video.currentTime = t;
          } catch {
            resolve();
          }
          setTimeout(() => resolve(), 400);
        });
        ctx.drawImage(video, 0, 0, width, height);
        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
        if (blob) {
          const nameBase = videoFile.name.replace(/\.[a-z0-9]+$/i, "");
          frames.push(new File([blob], `${nameBase}_frame_${i + 1}.jpg`, { type: "image/jpeg" }));
        }
      }
      return frames;
    } finally {
      URL.revokeObjectURL(url);
    }
  };


  const syncToPortal = () => {
    const payload = result?.result ?? result;
    const table = toDynamicTable(payload);
    if (table) {
      setPortalTable(table);
      setEditableRows(table.rows.map((r) => ({ ...r })));
      setReviewConfirmed(false);
    } else {
      setError("No structured fields detected from the image");
      setPortalTable(null);
      setEditableRows([]);
      setReviewConfirmed(false);
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-body">
          <div className="card-title">Media → Data</div>
          <div className="card-subtitle">Upload an image or video with data content and extract structured data using Gemini.</div>

          <form onSubmit={onSubmit} className="upload-grid">
            <div
              className={`dropzone ${dragging ? "drag" : ""}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <div>
                <div className="drop-title">Drag & drop media here</div>
                <div className="drop-sub">or choose a file from your device</div>
                <div style={{ marginTop: 12 }}>
                  <label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      style={{ display: "none" }}
                    />
                    <span className="btn btn-ghost">Browse files</span>
                  </label>
                  {/* Camera capture removed per request */}
                </div>
              </div>
            </div>


            {file && (
              <div className="preview">
                {isImage && objectUrl && (
                  <img ref={imgRef} className="preview-media" src={objectUrl} alt="Selected" />
                )}
                {isVideo && objectUrl && (
                  <video className="preview-media" src={objectUrl} controls muted />
                )}
                <div className="preview-info">
                  <div><strong>File:</strong> {file.name}</div>
                  <div><strong>Type:</strong> {file.type || "Unknown"}</div>
                  <div><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  {isImage && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        disabled={autoCropping}
                        onClick={handleAutoCrop}
                      >
                        {autoCropping ? "Auto-cropping…" : "Auto Crop (trim borders)"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Instructions (optional)</div>
                <textarea
                  className="textarea"
                  placeholder="e.g., Extract product name, price, and SKU"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </label>
            </div>

            <div className="actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Analyzing…" : "Analyze Media"}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  setError(null);
                  setPortalTable(null);
                }}
              >
                Reset
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={syncToPortal}
                disabled={!result}
              >
                View Analysis
              </button>
            </div>
          </form>

          {error && (
            <div className="alert" style={{ marginTop: 16 }}>
              Error: {error}
            </div>
          )}

          {result && (
            <div className="result">
              <div className="card" style={{ marginTop: 8 }}>
                <div className="card-body">
                  <div className="card-title">Extracted Data</div>
                  <div className="card-subtitle">The JSON response from Gemini </div>
                  <div className="code">
                    <pre>{JSON.stringify(redactConfidence(result), null, 2)}</pre>
                  </div>
                </div>
              </div>
              {portalTable && (
                <div className="card" style={{ marginTop: 16 }}>
                  <div className="card-body">
                    <div className="card-title">Structured Data Table</div>
                    <div className="card-subtitle">Auto-populated from extracted fields</div>
                    {/* Confidence review removed */}
                    <EditableTable
                      headers={portalTable.headers}
                      rows={editableRows}
                      onChange={setEditableRows}
                    />
                    {/* Export & Sync actions */}
                    <div className="actions" style={{ marginTop: 12 }}>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => downloadCSV(portalTable.headers, editableRows)}
                      >
                        Export CSV
                      </button>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={async () => {
                          try {
                            const xlsx = await ensureXLSX();
                            const data = [portalTable.headers, ...editableRows.map((r) => portalTable.headers.map((h) => r[h] ?? ""))];
                            const ws = xlsx.utils.aoa_to_sheet(data);
                            const wb = xlsx.utils.book_new();
                            xlsx.utils.book_append_sheet(wb, ws, "Data");
                            xlsx.writeFile(wb, "structured-data.xlsx");
                          } catch (e) {
                            setError("Failed to export XLSX");
                          }
                        }}
                      >
                        Export XLSX
                      </button>
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/portal/sync", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ headers: portalTable.headers, rows: editableRows }),
                            });
                            const json = await res.json();
                            if (!res.ok) {
                              setError(json?.error ?? "Sync failed");
                            } else {
                              setError(null);
                              alert("Synced successfully to Database");
                            }
                          } catch (e) {
                            setError("Network error during sync");
                          }
                        }}
                      >
                        Sync to Portal
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
