import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Rnd } from "react-rnd";
import { useAuth } from "../context/AuthContext";

const API_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) || "http://localhost:8000/api";
const BACKEND_BASE = API_BASE.replace(/\/api$/, "");
const DARKMODE_KEY = "mockupapp:darkmode";

function PlacementEditor({ template, onSave, previewRow, mapping, darkMode = false }) {
  const [localTemplate, setLocalTemplate] = useState(
    template ? { ...template, variables: template.variables || [], masks: template.masks || [] } : template
  );
  const [activeVarId, setActiveVarId] = useState(template?.variables?.[0]?.id || null);
  const [editingVarId, setEditingVarId] = useState(null);
  const [editingVarLabel, setEditingVarLabel] = useState("");
  const [bgSize, setBgSize] = useState({ width: 1200, height: 700 });
  const [maskMode, setMaskMode] = useState(false);
  const [brushColor, setBrushColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(40);
  const [isDrawing, setIsDrawing] = useState(false);
  const [maskSaving, setMaskSaving] = useState(false);
  const [maskError, setMaskError] = useState("");
  const [brushPreview, setBrushPreview] = useState(null);
  const containerWidth = Math.min(bgSize.width, 900);
  const scale = containerWidth / bgSize.width;
  const maskCanvasRef = React.useRef(null);

  useEffect(() => {
    if (!template) {
      setLocalTemplate(null);
      setActiveVarId(null);
      return;
    }
    const normalizedTemplate = {
      ...template,
      variables: template.variables || [],
      masks: template.masks || [],
    };
    setLocalTemplate(normalizedTemplate);
    setActiveVarId((prev) => {
      if (prev && normalizedTemplate.variables.some((v) => v.id === prev)) return prev;
      return normalizedTemplate.variables[0]?.id || null;
    });
    setEditingVarId(null);
    setEditingVarLabel("");
  }, [template]);

  useEffect(() => {
    if (!template?.baseImagePath) return;
    const img = new Image();
    img.onload = () => {
      setBgSize({ width: img.width, height: img.height });
    };
    const src = template.baseImagePath.startsWith("http")
      ? template.baseImagePath
      : `${BACKEND_BASE}${template.baseImagePath.startsWith("/") ? "" : "/"}${template.baseImagePath}`;
    img.src = src;
  }, [template?.baseImagePath]);

  const resolveAsset = (path) => {
    if (!path) return "";
    if (path.startsWith("data:")) return path;
    return path.startsWith("http") ? path : `${BACKEND_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const clearMaskCanvas = (persist = false) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (persist) {
      const updated = { ...localTemplate, masks: [] };
      setLocalTemplate(updated);
      onSave(updated);
    }
  };

  useEffect(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    canvas.width = bgSize.width;
    canvas.height = bgSize.height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const maskEntry = (localTemplate?.masks || [])[0];
    const maskSource =
      typeof maskEntry === "string" ? maskEntry : maskEntry?.data || maskEntry?.path;
    if (!maskSource) {
      setMaskError("");
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setMaskError("");
    };
    img.onerror = () => setMaskError("Kunne ikke indlæse masken");
    img.src = resolveAsset(maskSource);
  }, [localTemplate?.masks, bgSize.width, bgSize.height]);

  useEffect(() => {
    if (!maskMode) {
      setBrushPreview(null);
      setIsDrawing(false);
    }
  }, [maskMode]);

  const pointerToCanvas = (event) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    return { x, y };
  };

  const drawPoint = (event) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const point = pointerToCanvas(event);
    if (!point) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = brushColor;
    ctx.beginPath();
    ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const handlePointerDown = (event) => {
    if (!maskMode) return;
    setIsDrawing(true);
    updateBrushPreview(event);
    drawPoint(event);
  };

  const handlePointerMove = (event) => {
    if (!maskMode) return;
    updateBrushPreview(event);
    if (!isDrawing) return;
    drawPoint(event);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    setBrushPreview(null);
  };

  const handleSaveMask = () => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    setMaskSaving(true);
    setMaskError("");
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setMaskSaving(false);
          setMaskError("Kunne ikke gemme masken.");
          return;
        }
        try {
          const formData = new FormData();
          formData.append("mask", blob, "mask.png");
          const res = await authFetch(`${API_BASE}/templates/upload-mask`, { method: "POST", body: formData });
          if (!res.ok) throw new Error("Upload failed");
          const data = await res.json();
          const updated = {
            ...localTemplate,
            masks: [{ id: "mask", data: data.data || data.path }],
          };
          setLocalTemplate(updated);
          onSave(updated);
          setMaskMode(false);
        } catch (e) {
          setMaskError(e.message || "Fejl ved upload af masken");
        } finally {
          setMaskSaving(false);
        }
      },
      "image/png",
      1
    );
  };

  const updateBrushPreview = (event) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const point = pointerToCanvas(event);
    if (!point) return;
    setBrushPreview({ x: point.x * scaleX, y: point.y * scaleX });
  };

  if (!localTemplate) return null;
  const activeVar = localTemplate.variables.find((v) => v.id === activeVarId);
  const updateVar = (id, changes, save = false) => {
    const updated = {
      ...localTemplate,
      variables: localTemplate.variables.map((v) => (v.id === id ? { ...v, ...changes } : v)),
    };
    setLocalTemplate(updated);
    if (save) {
      onSave(updated);
    }
  };

  const getPreviewValue = (variable) => {
    if (!previewRow || !mapping) return variable.defaultValue || "";
    const column = mapping[variable.id];
    if (!column) return variable.defaultValue || "";
    return previewRow[column] ?? variable.defaultValue ?? "";
  };

  const getTextLayout = (variable) => {
    const text = getPreviewValue(variable) || "Sample";
    const fontSize = (variable.style?.size || 14) * scale;
    const fontWeight = variable.style?.weight || "bold";
    const align = variable.style?.align || "left";
    const valign = (variable.style?.valign || "middle").toLowerCase();
    const maxWidth = variable.w * scale;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = `${fontWeight} ${fontSize}px Inter, sans-serif`;

    const words = text.split(/\s+/);
    const lines = [];
    let current = "";
    words.forEach((word) => {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    const lineHeight = fontSize; // closer to PIL draw.getbbox height
    const totalHeight = lines.length * lineHeight;
    let startY = 0;
    if (valign === "top") startY = 0;
    else if (valign === "bottom") startY = Math.max(variable.h * scale - totalHeight, 0);
    else startY = Math.max((variable.h * scale - totalHeight) / 2, 0);

    return { lines, startY, lineHeight, fontSize, align, color: variable.style?.color || "#000000" };
  };

  return (
    <div
      className={`border rounded-lg p-3 space-y-3 ${
        darkMode ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Placement Editor</h3>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded text-sm cursor-pointer border ${
              maskMode ? "bg-blue-50 text-blue-700 border-blue-400" : "bg-white text-slate-700 border-slate-200"
            }`}
            onClick={() => setMaskMode((v) => !v)}
          >
            Mask brush
          </button>
          <button
            className="px-3 py-1 rounded bg-blue-600 text-white text-sm cursor-pointer"
            onClick={() => onSave(localTemplate)}
          >
            Save Template
          </button>
        </div>
      </div>
      {maskMode && (
        <div className="flex flex-wrap items-center gap-3 text-sm border rounded-lg px-3 py-2 bg-white/80 dark:bg-slate-900/60">
          <label className="flex items-center gap-2">
            Farve
            <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} />
          </label>
          <label className="flex items-center gap-2">
            Brush størrelse
            <input
              type="range"
              min="5"
              max="120"
              step="1"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
            />
            <span className="text-xs text-slate-500 w-10">{brushSize}px</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 text-xs rounded border bg-white hover:bg-slate-50"
              onClick={() => clearMaskCanvas()}
            >
              Ryd tegning
            </button>
            <button
              className="px-3 py-1 text-xs rounded border bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
              onClick={() => {
                clearMaskCanvas(true);
                setMaskMode(false);
              }}
              disabled={!localTemplate?.masks?.length}
            >
              Fjern gemt mask
            </button>
            <button
              className="px-3 py-1 text-xs rounded bg-blue-600 text-white disabled:bg-slate-400"
              onClick={handleSaveMask}
              disabled={maskSaving}
            >
              {maskSaving ? "Gemmer..." : "Gem mask"}
            </button>
          </div>
          {maskError && <span className="text-xs text-red-600">{maskError}</span>}
        </div>
      )}
      <div className="w-full flex justify-center">
        <div
          className={`relative border ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}
          style={{
            width: Math.min(bgSize.width, 900),
            height: (Math.min(bgSize.width, 900) / bgSize.width) * bgSize.height,
            backgroundImage: template?.baseImagePath
              ? `url(${
                  template.baseImagePath.startsWith("http")
                    ? template.baseImagePath
                    : `${BACKEND_BASE}${template.baseImagePath.startsWith("/") ? "" : "/"}${template.baseImagePath}`
                })`
              : "none",
            backgroundSize: "cover",
            overflow: "hidden",
          }}
        >
          <canvas
            ref={maskCanvasRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: Math.min(bgSize.width, 900),
              height: (Math.min(bgSize.width, 900) / bgSize.width) * bgSize.height,
              pointerEvents: maskMode ? "auto" : "none",
              cursor: maskMode ? "none" : "default",
              zIndex: 4,
            }}
            className="touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          {maskMode && brushPreview && (
            <div
              style={{
                position: "absolute",
                top: brushPreview.y,
                left: brushPreview.x,
                width: brushSize * scale,
                height: brushSize * scale,
                border: `2px solid ${brushColor}`,
                borderRadius: "9999px",
                pointerEvents: "none",
                transform: "translate(-50%, -50%)",
                zIndex: 6,
                boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
              }}
            />
          )}
          {localTemplate.variables.map((variable) => {
            const scale = Math.min(bgSize.width, 900) / bgSize.width;
            const w = variable.w * scale;
            const h = variable.h * scale;
            const x = variable.x * scale;
            const y = variable.y * scale;
            return (
              <Rnd
                key={variable.id}
                size={{ width: w, height: h }}
                position={{ x, y }}
                disableDragging={maskMode}
                enableResizing={!maskMode}
                style={{ zIndex: 10, pointerEvents: maskMode ? "none" : "auto" }}
                onDragStop={(_, data) =>
                  updateVar(
                    variable.id,
                    {
                      x: Math.round(data.x / scale),
                      y: Math.round(data.y / scale),
                    },
                    true
                  )
                }
                onResizeStop={(_, __, ref, ___, position) =>
                  updateVar(
                    variable.id,
                    {
                      w: Math.round(ref.offsetWidth / scale),
                      h: Math.round(ref.offsetHeight / scale),
                      x: Math.round(position.x / scale),
                      y: Math.round(position.y / scale),
                    },
                    true
                  )
                }
                bounds="parent"
                onClick={() => setActiveVarId(variable.id)}
                style={{ zIndex: 10 }}
                className={`border-2 ${
                  activeVarId === variable.id ? "border-blue-500" : "border-orange-400"
                } bg-orange-200/30`}
              >
                {variable.type === "text" ? (
                  <div className="w-full h-full relative overflow-hidden">
                    <span className="absolute top-0 right-0 text-[10px] text-gray-600 px-1 pointer-events-none bg-white/70">
                      {variable.label}
                    </span>
                    {(() => {
                      const layout = getTextLayout(variable);
                      return (
                        <div
                          className="absolute left-0"
                          style={{
                            top: layout.startY,
                            width: "100%",
                            pointerEvents: "none",
                          }}
                        >
                          {layout.lines.map((line, idx) => (
                            <div
                              key={`${line}-${idx}`}
                              style={{
                                color: layout.color,
                                fontSize: `${layout.fontSize}px`,
                                fontWeight: variable.style?.weight || "bold",
                                textAlign: layout.align,
                                lineHeight: `${layout.lineHeight}px`,
                                width: "100%",
                                whiteSpace: "pre-wrap",
                                margin: 0,
                                padding: 0,
                                backgroundColor: "transparent",
                              }}
                            >
                              {line}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="w-full h-full relative overflow-hidden">
                    <span className="absolute top-0 right-0 text-[10px] text-gray-600 px-1 pointer-events-none bg-white/70">
                      {variable.label}
                    </span>
                    {(() => {
                      const imgSrc = getPreviewValue(variable);
                      return imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={variable.label}
                          className="absolute inset-0 w-full h-full object-center"
                          style={{ objectFit: variable.fit || "cover", pointerEvents: "none" }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null;
                    })()}
                  </div>
                )}
              </Rnd>
            );
          })}
        </div>
      </div>
      {activeVar && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="col-span-2 flex justify-between items-center">
            <div className="flex items-center justify-between w-full gap-3">
              {editingVarId === activeVar.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    className="border rounded px-2 py-1 flex-1"
                    value={editingVarLabel}
                    onChange={(e) => setEditingVarLabel(e.target.value)}
                    autoFocus
                  />
                  <button
                    className="px-2 py-1 rounded bg-blue-600 text-white text-xs"
                    onClick={() => {
                      const nextLabel = (editingVarLabel || "").trim() || "Untitled";
                      updateVar(activeVar.id, { label: nextLabel }, true);
                      setEditingVarId(null);
                      setEditingVarLabel("");
                    }}
                  >
                    Save
                  </button>
                  <button
                    className="px-2 py-1 rounded border text-xs"
                    onClick={() => {
                      setEditingVarId(null);
                      setEditingVarLabel("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-semibold">{activeVar.label}</span>
                  <button
                    className="p-2 rounded border border-slate-200 bg-white/60 hover:bg-white transition"
                    title="Rename variable"
                    onClick={() => {
                      setEditingVarId(activeVar.id);
                      setEditingVarLabel(activeVar.label || "");
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14.06 6.19l2.12-2.12a1.5 1.5 0 0 1 2.12 0l1.41 1.41a1.5 1.5 0 0 1 0 2.12l-2.12 2.12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
          <label className="flex flex-col gap-1">
            X
            <input
              type="number"
              className="border rounded px-2 py-1"
              value={activeVar.x}
              onChange={(e) => updateVar(activeVar.id, { x: Number(e.target.value) }, true)}
            />
          </label>
          <label className="flex flex-col gap-1">
            Y
            <input
              type="number"
              className="border rounded px-2 py-1"
              value={activeVar.y}
              onChange={(e) => updateVar(activeVar.id, { y: Number(e.target.value) }, true)}
            />
          </label>
          <label className="flex flex-col gap-1">
            Width
            <input
              type="number"
              className="border rounded px-2 py-1"
              value={activeVar.w}
              onChange={(e) => updateVar(activeVar.id, { w: Number(e.target.value) }, true)}
            />
          </label>
          <label className="flex flex-col gap-1">
            Height
            <input
              type="number"
              className="border rounded px-2 py-1"
              value={activeVar.h}
              onChange={(e) => updateVar(activeVar.id, { h: Number(e.target.value) }, true)}
            />
          </label>
          {activeVar.type === "text" && (
            <>
              <label className="flex flex-col gap-1">
                Font Size
                <input
                  type="number"
                  className="border rounded px-2 py-1"
                  value={activeVar.style?.size || 32}
                  onChange={(e) =>
                    updateVar(
                      activeVar.id,
                      { style: { ...activeVar.style, size: Number(e.target.value) } },
                      true
                    )
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                Color
                <input
                  type="text"
                  className="border rounded px-2 py-1"
                  value={activeVar.style?.color || "#000000"}
                  onChange={(e) =>
                    updateVar(
                      activeVar.id,
                      { style: { ...activeVar.style, color: e.target.value } },
                      true
                    )
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                Vertical Align (text)
                <select
                  className="border rounded px-2 py-1"
                  value={activeVar.style?.valign || "middle"}
                  onChange={(e) =>
                    updateVar(
                      activeVar.id,
                      { style: { ...activeVar.style, valign: e.target.value } },
                      true
                    )
                  }
                >
                  <option value="top">Top</option>
                  <option value="middle">Middle</option>
                  <option value="bottom">Bottom</option>
                </select>
              </label>
            </>
          )}
          {activeVar.type === "image" && (
            <label className="flex flex-col gap-1">
              Fit
              <select
                className="border rounded px-2 py-1"
                value={activeVar.fit || "cover"}
                onChange={(e) => updateVar(activeVar.id, { fit: e.target.value }, true)}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

export default function AppPage() {
  const [csvFile, setCsvFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [sampleRows, setSampleRows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [mapping, setMapping] = useState({});
  const [previewItems, setPreviewItems] = useState([]);
  const [activePreview, setActivePreview] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [loading, setLoading] = useState({
    inspect: false,
    preview: false,
    batch: false,
    saveTemplate: false,
    createTemplate: false,
    uploadTemplate: false,
  });
  const [error, setError] = useState("");
  const [templateModalError, setTemplateModalError] = useState("");
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DARKMODE_KEY) === "true";
  });
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateFile, setNewTemplateFile] = useState(null);
  const [identifierColumn, setIdentifierColumn] = useState("");
  const [skipProcessed, setSkipProcessed] = useState(true);
  const [editingMappingVarId, setEditingMappingVarId] = useState(null);
  const [editingMappingLabel, setEditingMappingLabel] = useState("");
  const stepsBarRef = React.useRef(null);
  const uploadRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const placeRef = React.useRef(null);
  const previewRef = React.useRef(null);
  const runRef = React.useRef(null);
  const navigate = useNavigate();
  const { user, logout, authFetch, token } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const normalizeTemplate = (tpl) =>
    tpl
      ? { ...tpl, variables: tpl.variables || [], masks: tpl.masks || [] }
      : tpl;
  const resolveImageUrl = (path) => {
    if (!path) return "";
    return path.startsWith("http")
      ? path
      : `${BACKEND_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const steps = [
    { key: "upload", label: "Upload CSV", done: !!csvFile, tip: csvFile?.name || "Awaiting file", ref: uploadRef },
    { key: "map", label: "Map Variables", done: headers.length > 0 && Object.keys(mapping).length > 0, tip: `${headers.length} headers`, ref: mapRef },
    { key: "place", label: "Placement", done: true, tip: "Adjust boxes", ref: placeRef },
    { key: "preview", label: "Preview Sample", done: previewItems.length > 0, tip: `${previewItems.length || 0} previews`, ref: previewRef },
    { key: "run", label: "Run Batch", done: jobStatus?.status === "done", tip: jobStatus ? `${jobStatus.progress || 0}%` : "Not started", ref: runRef },
  ];

  const scrollToRef = (r) => {
    if (r?.current) {
      const offset = (stepsBarRef.current?.getBoundingClientRect()?.height || 0) + 12;
      const top = r.current.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await authFetch(`${API_BASE}/templates`);
        const data = await res.json();
        const normalized = (data.templates || []).map((tpl) => normalizeTemplate(tpl));
        setTemplates(normalized);
        if (normalized.length > 0) {
          setSelectedTemplate(normalized[0]);
        }
      } catch (e) {
        console.error("Failed to load templates", e);
        setError(e.message || "Could not load templates. Please sign in again.");
      }
    };
    fetchTemplates();
  }, [authFetch]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(DARKMODE_KEY, darkMode ? "true" : "false");
    }
    return () => {
      root.classList.remove("dark");
    };
  }, [darkMode]);

  const cardClasses = darkMode
    ? "bg-slate-800 border border-slate-700 text-slate-100"
    : "bg-white border border-slate-200 text-slate-900";
  const subText = darkMode ? "text-slate-300" : "text-slate-500";
  const chipBase = darkMode ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-900";
  const chipDone = darkMode ? "border-green-500/50 bg-green-900/30" : "border-green-200 bg-green-50";
  const stepsBarText = darkMode ? "text-slate-200" : "text-slate-600";
  const stepsBarLabel = darkMode ? "text-slate-100" : "text-slate-800";
  const stepsBarPill = darkMode
    ? "px-2 py-1 rounded bg-slate-700 border border-slate-600 text-slate-100"
    : "px-2 py-1 rounded bg-slate-100 text-slate-800";
  const previewCardClasses = darkMode
    ? "border border-slate-700 rounded-lg p-2 bg-slate-800 text-left hover:ring-2 hover:ring-blue-500 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
    : "border rounded-lg p-2 bg-slate-50 text-left hover:ring-2 hover:ring-blue-300 transition focus:outline-none focus:ring-2 focus:ring-blue-400";
  const previewCardText = darkMode ? "text-slate-200" : "text-slate-600";
  const previewTableContainer = darkMode
    ? "overflow-auto border border-slate-700 rounded bg-slate-800/60"
    : "overflow-auto border rounded bg-white";
  const previewTableHead = darkMode ? "bg-slate-900 text-slate-100" : "bg-slate-100 text-slate-900";
  const previewTableRow = darkMode ? "odd:bg-slate-800 even:bg-slate-900/60 text-slate-100" : "odd:bg-white even:bg-slate-50";
  const previewTableBorder = darkMode ? "border-slate-700" : "border-slate-200";

  const handleCsvUpload = async (file) => {
    setCsvFile(file);
    setError("");
    setLoading((prev) => ({ ...prev, inspect: true }));
    const formData = new FormData();
    formData.append("csv_file", file);
    formData.append("sample_size", "5");
    try {
      const res = await authFetch(`${API_BASE}/csv/inspect`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to inspect CSV");
      const data = await res.json();
      const incomingHeaders = data.headers || [];
      setHeaders(incomingHeaders);
      setSampleRows(data.sample_rows || []);
      if (incomingHeaders.length > 0) {
        setIdentifierColumn((prev) => {
          if (prev) return prev;
          const guess = incomingHeaders.find((h) => /company|firma|virksomhed|org/i.test(h));
          return guess || incomingHeaders[0] || "";
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading((prev) => ({ ...prev, inspect: false }));
    }
  };

  const currentTemplate = useMemo(
    () => normalizeTemplate(templates.find((t) => t.id === selectedTemplate?.id) || selectedTemplate),
    [templates, selectedTemplate]
  );

  const handleMappingChange = (varId, header) => {
    setMapping((prev) => ({ ...prev, [varId]: header }));
  };

  const updateTemplateState = (updater) => {
    setSelectedTemplate((prev) => {
      if (!prev) return prev;
      const updated = normalizeTemplate(updater(prev));
      setTemplates((prevList) => {
        const others = prevList.filter((t) => t.id !== updated.id);
        return [...others, updated];
      });
      return updated;
    });
  };

  const addVariable = (type) => {
    updateTemplateState((tpl) => {
      const newVar = {
        id: `${type}_${Date.now()}`,
        label: type === "text" ? "Text Variable" : "Image Variable",
        type,
        x: 50,
        y: 50,
        w: 200,
        h: 80,
        fit: "cover",
        style:
          type === "text"
            ? { font: "Inter_Bold", size: 32, weight: "bold", color: "#000000", align: "left" }
            : undefined,
        defaultValue: "",
      };
      return { ...tpl, variables: [...(tpl.variables || []), newVar] };
    });
  };

  const removeVariable = (varId) => {
    updateTemplateState((tpl) => ({ ...tpl, variables: tpl.variables.filter((v) => v.id !== varId) }));
    setMapping((prev) => {
      const next = { ...prev };
      delete next[varId];
      return next;
    });
  };

  const handlePreview = async () => {
    if (!csvFile || !currentTemplate) return;
    setLoading((prev) => ({ ...prev, preview: true }));
    setError("");
    const formData = new FormData();
    formData.append("template_id", currentTemplate.id);
    formData.append("mapping", JSON.stringify(mapping));
    formData.append("limit", "3");
    formData.append("csv_file", csvFile);
    try {
      const res = await authFetch(`${API_BASE}/preview`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Preview failed");
      const data = await res.json();
      setPreviewItems(data.previews || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading((prev) => ({ ...prev, preview: false }));
    }
  };

  const pollJob = async (id) => {
    try {
      const res = await authFetch(`${API_BASE}/jobs/${id}`);
      if (!res.ok) throw new Error("Failed to fetch job");
      const data = await res.json();
      setJobStatus(data);
      if (data.status !== "done") {
        setTimeout(() => pollJob(id), 1500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activePreview && !previewItems.find((p) => p.row === activePreview.row)) {
      setActivePreview(null);
    }
  }, [previewItems, activePreview]);

  const handleDownloadCsv = async () => {
    if (!jobId) return;
    try {
      const res = await authFetch(`${API_BASE}/jobs/${jobId}/csv`);
      if (!res.ok) throw new Error("Kunne ikke hente CSV");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `job_${jobId}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleBatch = async () => {
    if (!csvFile || !currentTemplate) return;
    if (skipProcessed && !identifierColumn) {
      setError("Vælg en identifier-kolonne for at kunne springe eksisterende virksomheder over.");
      return;
    }
    setJobStatus(null);
    setJobId(null);
    setLoading((prev) => ({ ...prev, batch: true }));
    setError("");
    const formData = new FormData();
    formData.append("template_id", currentTemplate.id);
    formData.append("mapping", JSON.stringify(mapping));
    formData.append("csv_file", csvFile);
    formData.append("skip_processed", skipProcessed ? "true" : "false");
    if (identifierColumn) {
      formData.append("identifier_column", identifierColumn);
    }
    try {
      const res = await authFetch(`${API_BASE}/batch`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Batch start failed");
      const data = await res.json();
      setJobId(data.job_id);
      pollJob(data.job_id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading((prev) => ({ ...prev, batch: false }));
    }
  };

  const handleTemplateSave = async (tpl) => {
    setLoading((prev) => ({ ...prev, saveTemplate: true }));
    try {
      const payload = normalizeTemplate(tpl);
      const res = await authFetch(`${API_BASE}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save template");
      const data = await res.json();
      const savedTemplate = normalizeTemplate(data.template);
      const keptVarIds = new Set((savedTemplate?.variables || []).map((v) => v.id));
      setMapping((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (!keptVarIds.has(key)) {
            delete next[key];
          }
        });
        return next;
      });
      setSelectedTemplate(savedTemplate);
      setTemplates((prev) => {
        const others = prev.filter((t) => t.id !== savedTemplate.id);
        return [...others, savedTemplate];
      });
      return savedTemplate;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading((prev) => ({ ...prev, saveTemplate: false }));
    }
  };

  const uploadTemplateImage = async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await authFetch(`${API_BASE}/templates/upload-image`, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Kunne ikke uploade mockup-billede");
    return res.json();
  };

  const handleCreateTemplate = async () => {
    setTemplateModalError("");
    if (!newTemplateName || !newTemplateFile) {
      setTemplateModalError("Navn og mockup-billede er påkrævet.");
      return;
    }
    setLoading((prev) => ({ ...prev, createTemplate: true }));
    try {
      const uploadRes = await uploadTemplateImage(newTemplateFile);
      const freshTemplate = normalizeTemplate({
        id: `tpl_${Date.now()}`,
        name: newTemplateName,
        baseImagePath: uploadRes.path,
        masks: [],
        variables: [],
      });
      const saved = await handleTemplateSave(freshTemplate);
      if (saved) {
        setSelectedTemplate(saved);
      }
      setShowTemplateModal(false);
      setNewTemplateName("");
      setNewTemplateFile(null);
    } catch (e) {
      setTemplateModalError(e.message);
    } finally {
      setLoading((prev) => ({ ...prev, createTemplate: false }));
    }
  };

  const handleReplaceBaseImage = async (file) => {
    if (!currentTemplate || !file) return;
    setError("");
    setLoading((prev) => ({ ...prev, uploadTemplate: true }));
    try {
      const uploadRes = await uploadTemplateImage(file);
      await handleTemplateSave({ ...currentTemplate, baseImagePath: uploadRes.path });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading((prev) => ({ ...prev, uploadTemplate: false }));
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-500 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-3">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="space-y-2 min-w-[260px] flex-1">
              <p className="uppercase tracking-[0.2em] text-xs text-blue-100">Batch Mockups</p>
              <h1 className="text-3xl font-semibold">Generate personalized mockups from your CSV</h1>
              <p className="text-sm text-blue-100 max-w-2xl">
                Upload leads, map variables, place them visually, preview a few rows, then ship everything to Cloudinary with an updated CSV.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
              {user && (
                <span className="px-3 py-1 rounded bg-white/10 text-xs text-blue-50/90 border border-white/10 self-end">
                  Signed in as {user.name || user.email}
                </span>
              )}
              <div className="flex items-center gap-2 justify-end mt-3 md:mt-5">
                <button
                  className="px-3 py-2 rounded border border-white/30 text-sm bg-white/10 hover:bg-white/20 transition cursor-pointer"
                  onClick={() => setDarkMode((v) => !v)}
                >
                  {darkMode ? "Switch to Light" : "Switch to Dark"}
                </button>
                <button
                  className="px-3 py-2 rounded border border-white/30 text-sm bg-white/10 hover:bg-white/20 transition cursor-pointer"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-6 pb-12 space-y-6 relative">
        <div
          ref={stepsBarRef}
          className={`sticky top-0 z-20 backdrop-blur border rounded-xl shadow-sm px-4 py-3 flex flex-col gap-2 ${
            darkMode ? "bg-slate-800/90 border-slate-700" : "bg-white/90 border-slate-200"
          }`}
        >
          <div className={`flex flex-wrap items-center gap-3 text-xs ${stepsBarText}`}>
            <span className={`font-semibold ${stepsBarLabel}`}>CSV:</span>
            <span className={stepsBarPill}>{csvFile ? csvFile.name : "None"}</span>
            <span className={`font-semibold ${stepsBarLabel}`}>Template:</span>
            <span className={stepsBarPill}>
              {currentTemplate ? currentTemplate.name : "None"}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {steps.map((s, idx) => (
              <div
                key={s.key}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer ${
                  s.done ? chipDone : chipBase
                } ${darkMode ? "hover:border-blue-500/60 hover:bg-blue-900/30" : "hover:border-blue-300 hover:bg-blue-50"}`}
                onClick={() => scrollToRef(s.ref)}
              >
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                    s.done
                      ? "bg-green-600 text-white"
                      : darkMode
                      ? "bg-slate-700 text-slate-200"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {idx + 1}
                </div>
                <div>
                  <p className="font-semibold">{s.label}</p>
                  <p className="text-[11px] text-slate-500">{s.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6 pt-2">
          {error && <div className="bg-red-50 text-red-800 border border-red-200 px-3 py-2 rounded">{error}</div>}

          <section ref={uploadRef} className={`${cardClasses} rounded-xl shadow-sm p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold ${subText}`}>Step 1</p>
                <h2 className="text-lg font-semibold">Upload CSV</h2>
                <p className={`text-sm ${subText}`}>We’ll detect headers and show a sample.</p>
              </div>
              <button
            className="px-3 py-2 text-sm rounded bg-slate-900 text-white disabled:bg-slate-300"
                disabled={!csvFile}
                onClick={() => document.getElementById("csv-input")?.click()}
              >
                Change file
              </button>
            </div>
            <label
                className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 hover:border-blue-400 transition p-4 cursor-pointer flex flex-col gap-2"
                htmlFor="csv-input"
              >
              <span className="text-sm font-semibold">{csvFile ? csvFile.name : "Drop or select a CSV"}</span>
              <span className="text-xs text-slate-500">We only read it locally; nothing is sent until you run.</span>
              <input
                id="csv-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleCsvUpload(e.target.files[0])}
              />
            </label>
            {loading.inspect && <p className="text-xs text-slate-500">Inspecting CSV...</p>}
            {sampleRows.length > 0 && (
              <div className="text-sm">
                <p className="font-semibold">Detected headers</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {headers.map((h) => (
                    <span key={h} className="px-2 py-1 bg-slate-100 rounded border text-xs">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {sampleRows.length > 0 && (
              <div className="text-sm space-y-2">
                <p className="font-semibold">CSV preview</p>
                <div className={previewTableContainer}>
                  <table className="min-w-full text-xs">
                    <thead className={previewTableHead}>
                      <tr>
                        {headers.map((h) => (
                          <th key={h} className={`px-2 py-2 text-left border-b ${previewTableBorder}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sampleRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className={previewTableRow}>
                          {headers.map((h) => (
                            <td key={`${idx}-${h}`} className={`px-2 py-2 border-b whitespace-nowrap ${previewTableBorder}`}>
                              {row[h]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section ref={mapRef} className={`${cardClasses} rounded-xl shadow-sm p-4 space-y-4`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className={`text-xs font-semibold ${subText}`}>Step 2</p>
                <h2 className="text-lg font-semibold">Template & Variable Mapping</h2>
                <p className={`text-sm ${subText}`}>Upload eller vælg template, map variablerne og gem.</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  className="px-3 py-2 rounded border text-sm cursor-pointer"
                  onClick={() => {
                    setTemplateModalError("");
                    setShowTemplateModal(true);
                  }}
                >
                  + Ny template
                </button>
                <label className="px-3 py-2 rounded border text-sm cursor-pointer bg-slate-50">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleReplaceBaseImage(e.target.files[0])}
                    disabled={!currentTemplate || loading.uploadTemplate}
                  />
                  {loading.uploadTemplate ? "Uploader mockup..." : "Skift mockup-billede"}
                </label>
                <button
                  className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:bg-slate-300 cursor-pointer"
                  disabled={!currentTemplate}
                  onClick={() => currentTemplate && handleTemplateSave(currentTemplate)}
                >
                  Save Template
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold mb-2">Template bibliotek</p>
                {templates.length === 0 && <p className="text-xs text-slate-500">Ingen templates endnu. Opret din første ovenfor.</p>}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      className={`border rounded-lg p-2 cursor-pointer transition ${
                        currentTemplate?.id === t.id ? "border-blue-500 shadow-sm" : "border-slate-200"
                      } ${darkMode ? "bg-slate-800" : "bg-white"}`}
                      onClick={() => setSelectedTemplate(t)}
                    >
                      <div className="aspect-video rounded overflow-hidden border bg-slate-100">
                        {t.baseImagePath ? (
                          <img
                            src={resolveImageUrl(t.baseImagePath)}
                            alt={t.name}
                            className="w-full h-full object-cover"
                            onError={(e) => (e.currentTarget.style.display = "none")}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs text-slate-500">No image</div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2 text-sm">
                        <div>
                          <p className="font-semibold">{t.name}</p>
                          <p className="text-xs text-slate-500">{t.variables?.length || 0} felter</p>
                        </div>
                        {currentTemplate?.id === t.id && (
                          <span className="text-xs text-green-600 font-semibold">Valgt</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 rounded bg-slate-100 text-sm border cursor-pointer"
                    onClick={() => addVariable("text")}
                    disabled={!currentTemplate}
                  >
                    + Text variable
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-slate-100 text-sm border cursor-pointer"
                    onClick={() => addVariable("image")}
                    disabled={!currentTemplate}
                  >
                    + Image variable
                  </button>
                </div>
              </div>
              {currentTemplate && (
                <div className="space-y-2">
                  {currentTemplate.variables.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 border rounded-lg px-3 py-2">
                      <div className="flex-1">
                        {editingMappingVarId === v.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              className="border rounded px-2 py-1 text-sm flex-1"
                              value={editingMappingLabel}
                              onChange={(e) => setEditingMappingLabel(e.target.value)}
                              autoFocus
                            />
                            <button
                              className="px-2 py-1 rounded bg-blue-600 text-white text-xs"
                              onClick={async () => {
                                const nextLabel = (editingMappingLabel || "").trim() || "Untitled";
                                const updated = {
                                  ...currentTemplate,
                                  variables: (currentTemplate.variables || []).map((existing) =>
                                    existing.id === v.id ? { ...existing, label: nextLabel } : existing
                                  ),
                                };
                                setSelectedTemplate(updated);
                                setTemplates((prev) => {
                                  const others = prev.filter((t) => t.id !== updated.id);
                                  return [...others, updated];
                                });
                                await handleTemplateSave(updated);
                                setEditingMappingVarId(null);
                                setEditingMappingLabel("");
                              }}
                            >
                              Save
                            </button>
                            <button
                              className="px-2 py-1 rounded border text-xs"
                              onClick={() => {
                                setEditingMappingVarId(null);
                                setEditingMappingLabel("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-sm">{v.label}</p>
                              <p className="text-xs text-slate-500">
                                {v.type === "text" ? "Text" : "Image"} • {v.id}
                              </p>
                            </div>
                            <button
                              className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-white transition"
                              title="Rename variable"
                              onClick={() => {
                                setEditingMappingVarId(v.id);
                                setEditingMappingLabel(v.label || "");
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path
                                  d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M14.06 6.19l2.12-2.12a1.5 1.5 0 0 1 2.12 0l1.41 1.41a1.5 1.5 0 0 1 0 2.12l-2.12 2.12"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                      <select
                        className="border rounded px-2 py-1 text-sm cursor-pointer"
                        value={mapping[v.id] || ""}
                        onChange={(e) => handleMappingChange(v.id, e.target.value)}
                      >
                        <option value="">Map column</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <button className="text-red-600 text-xs underline" onClick={() => removeVariable(v.id)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section ref={placeRef} className={`${cardClasses} rounded-xl shadow-sm p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold ${subText}`}>Step 3</p>
                <h2 className="text-lg font-semibold">Placement</h2>
                <p className={`text-sm ${subText}`}>Drag, resize, and style variables. Live content uses the first row.</p>
              </div>
              {loading.saveTemplate && <p className="text-xs text-slate-500">Saving...</p>}
            </div>
            {currentTemplate && (
              <PlacementEditor
                template={currentTemplate}
                onSave={handleTemplateSave}
                previewRow={sampleRows[0]}
                mapping={mapping}
                darkMode={darkMode}
              />
            )}
          </section>

          <section ref={previewRef} className={`${cardClasses} rounded-xl shadow-sm p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold ${subText}`}>Step 4</p>
                <h2 className="text-lg font-semibold">Preview Sample</h2>
                <p className={`text-sm ${subText}`}>Render a few rows to sanity check before running.</p>
              </div>
              <button
                className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:bg-slate-300"
                disabled={!csvFile || !currentTemplate || loading.preview}
                onClick={handlePreview}
              >
                {loading.preview ? "Generating..." : "Generate Preview"}
              </button>
            </div>
            {previewItems.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {previewItems.map((item) => (
                  <button
                    key={item.row}
                    type="button"
                    className="border rounded-lg p-2 bg-slate-50 text-left hover:ring-2 hover:ring-blue-300 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
                    onClick={() => setActivePreview(item)}
                    aria-label={`Åbn preview for række ${item.row + 1}`}
                  >
                    <img
                      src={`data:image/jpeg;base64,${item.image_base64}`}
                      alt={`Preview ${item.row}`}
                      className="w-full rounded"
                    />
                    <p className="text-xs text-slate-600 mt-1">Row {item.row + 1}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section ref={runRef} className={`${cardClasses} rounded-xl shadow-sm p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold ${subText}`}>Step 5</p>
                <h2 className="text-lg font-semibold">Run & Results</h2>
                <p className={`text-sm ${subText}`}>Upload all mockups to Cloudinary and download your updated CSV.</p>
              </div>
              <button
                className="px-3 py-2 rounded bg-green-600 text-white text-sm disabled:bg-slate-300"
                disabled={!csvFile || !currentTemplate || loading.batch}
                onClick={handleBatch}
              >
                {loading.batch ? "Starting..." : "Run Batch"}
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={skipProcessed}
                  onChange={(e) => setSkipProcessed(e.target.checked)}
                />
                Spring virksomheder over der allerede har et mockup (gem identifier i databasen)
              </label>
              <div className="flex flex-col gap-1">
                <span className="font-semibold">Identifier kolonne</span>
                <select
                  className="border rounded px-2 py-1"
                  value={identifierColumn}
                  onChange={(e) => setIdentifierColumn(e.target.value)}
                  disabled={!headers.length}
                >
                  <option value="">Vælg kolonne</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">
                  Vi gemmer værdien i tabellen over virksomheder og springer dem over ved næste kørsel.
                </span>
              </div>
            </div>
            {jobStatus && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    Status: <span className="font-semibold">{jobStatus.status}</span>
                  </span>
                  <span>{jobStatus.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded h-2">
                  <div
                    className="bg-green-500 h-2 rounded"
                    style={{ width: `${jobStatus.progress || 0}%` }}
                  ></div>
                </div>
                {jobStatus.status === "done" && jobId && (
                  <div className="flex flex-wrap gap-3 items-center">
                    <button
                      type="button"
                      className="text-blue-600 underline text-sm"
                      onClick={handleDownloadCsv}
                    >
                      Download CSV
                    </button>
                    <span className="text-sm text-slate-500">
                      {jobStatus.results?.filter((r) => r.status === "done").length || 0} succeeded /{" "}
                      {jobStatus.results?.length || 0} total ·{" "}
                      {(jobStatus.results || []).filter((r) => r.status === "skipped").length || 0} skipped
                    </span>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-auto">
                  {jobStatus.results?.map((r) => (
                    <div key={r.row} className="border rounded p-2 text-sm bg-slate-50">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Row {r.row + 1}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            r.status === "done"
                              ? "bg-green-100 text-green-700"
                            : r.status === "error"
                              ? "bg-red-100 text-red-700"
                              : r.status === "skipped"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      {r.url && (
                        <a className="text-blue-600 text-xs break-all" href={r.url} target="_blank" rel="noreferrer">
                          {r.url}
                        </a>
                      )}
                      {r.error && <p className="text-xs text-red-600 mt-1">{r.error}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      {activePreview && (
        <div
          className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
          onClick={() => setActivePreview(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden ${
              darkMode ? "bg-slate-900 text-white" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex items-center justify-between px-4 py-3 border-b ${
                darkMode ? "border-slate-700" : "border-slate-200"
              }`}
            >
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">Preview for row {activePreview.row + 1}</p>
                <p className="text-xs text-slate-500">
                  Klik udenfor billedet eller på luk for at gå tilbage.
                </p>
              </div>
              <button
                className="px-3 py-1 rounded border text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setActivePreview(null)}
              >
                Luk
              </button>
            </div>
            <div className={`p-3 flex items-center justify-center ${darkMode ? "bg-slate-950" : "bg-slate-50"}`}>
              <img
                src={`data:image/jpeg;base64,${activePreview.image_base64}`}
                alt={`Preview for row ${activePreview.row + 1}`}
                className="w-full max-h-[80vh] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 z-30 flex items-center justify-center p-4">
          <div className={`${cardClasses} w-full max-w-lg rounded-xl shadow-lg p-5 space-y-4`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Ny template</h3>
              <button className="text-sm text-slate-500" onClick={() => setShowTemplateModal(false)}>
                Luk
              </button>
            </div>
            {templateModalError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">
                {templateModalError}
              </div>
            )}
            <label className="flex flex-col gap-1 text-sm">
              Navn
              <input
                type="text"
                className="border rounded px-3 py-2"
                placeholder="Fx Google Ads mockup"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Mockup-billede
              <input
                type="file"
                accept="image/*"
                className="border rounded px-3 py-2"
                onChange={(e) => setNewTemplateFile(e.target.files?.[0] || null)}
              />
              {newTemplateFile && (
                <span className="text-xs text-slate-500">Valgt: {newTemplateFile.name}</span>
              )}
            </label>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 text-sm border rounded" onClick={() => setShowTemplateModal(false)}>
                Annuller
              </button>
              <button
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white disabled:bg-slate-400"
                onClick={handleCreateTemplate}
                disabled={loading.createTemplate}
              >
                {loading.createTemplate ? "Opretter..." : "Opret template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
