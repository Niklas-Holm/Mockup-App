import React, { useEffect, useMemo, useState } from "react";
import { Rnd } from "react-rnd";

const API_BASE = "http://localhost:8000/api";
const BACKEND_BASE = API_BASE.replace(/\/api$/, "");

function Step({ label, index, active, completed }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
          completed ? "bg-green-600 text-white" : active ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
        }`}
      >
        {index + 1}
      </div>
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

function MappingRow({ variable, headers, mapping, onChange }) {
  return (
    <div className="flex items-center justify-between border rounded px-3 py-2">
      <div>
        <p className="font-semibold">{variable.label}</p>
        <p className="text-xs text-gray-500">
          {variable.type === "text" ? "Text variable" : "Image variable"} ({variable.id})
        </p>
      </div>
      <select
        className="border rounded px-2 py-1 text-sm"
        value={mapping[variable.id] || ""}
        onChange={(e) => onChange(variable.id, e.target.value)}
      >
        <option value="">-- Select column --</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  );
}

function PlacementEditor({ template, onSave, previewRow, mapping }) {
  const [localTemplate, setLocalTemplate] = useState(template);
  const [activeVarId, setActiveVarId] = useState(template?.variables?.[0]?.id || null);
  const [bgSize, setBgSize] = useState({ width: 1200, height: 700 });
  const containerWidth = Math.min(bgSize.width, 900);
  const containerHeight = (Math.min(bgSize.width, 900) / bgSize.width) * bgSize.height;
  const scale = containerWidth / bgSize.width;

  useEffect(() => {
    setLocalTemplate(template);
    setActiveVarId(template?.variables?.[0]?.id || null);
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

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Placement Editor</h3>
        <button
          className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
          onClick={() => onSave(localTemplate)}
        >
          Save Template
        </button>
      </div>
      <div
        className="relative border bg-white"
        style={{
          width: Math.min(bgSize.width, 900),
          height: (Math.min(bgSize.width, 900) / bgSize.width) * bgSize.height,
          backgroundImage: `url(${
            template.baseImagePath.startsWith("http")
              ? template.baseImagePath
              : `${BACKEND_BASE}${template.baseImagePath.startsWith("/") ? "" : "/"}${template.baseImagePath}`
          })`,
          backgroundSize: "cover",
          overflow: "hidden",
        }}
      >
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
              className={`border-2 ${
                activeVarId === variable.id ? "border-blue-500" : "border-orange-400"
              } bg-orange-200/30`}
            >
              {variable.type === "text" ? (
                <div className="w-full h-full relative overflow-hidden">
                  <span className="absolute top-0 left-0 text-[10px] text-gray-600 bg-white/70 px-1 pointer-events-none">
                    {variable.label}
                  </span>
                  <div
                    className="absolute inset-0 flex"
                    style={{
                      flexDirection: "column",
                      justifyContent:
                        (variable.style?.valign || "middle") === "top"
                          ? "flex-start"
                          : (variable.style?.valign || "middle") === "bottom"
                          ? "flex-end"
                          : "center",
                      alignItems:
                        (variable.style?.align || "left") === "center"
                          ? "center"
                          : (variable.style?.align || "left") === "right"
                          ? "flex-end"
                          : "flex-start",
                      padding: 0,
                    }}
                  >
                    <span
                      style={{
                        color: variable.style?.color || "#000000",
                        fontSize: (variable.style?.size || 14) * scale,
                        fontWeight: variable.style?.weight || "bold",
                        textAlign: variable.style?.align || "left",
                        lineHeight: `${(variable.style?.size || 14) * scale * 1.1}px`,
                        width: "100%",
                        display: "block",
                        whiteSpace: "pre-wrap",
                        margin: 0,
                        padding: 0,
                      }}
                    >
                      {getPreviewValue(variable) || "Sample"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full relative overflow-hidden">
                  <span className="absolute top-0 left-0 text-[10px] text-gray-600 bg-white/70 px-1 pointer-events-none">
                    {variable.label}
                  </span>
                  <img
                    src={getPreviewValue(variable) || ""}
                    alt={variable.label}
                    className="absolute inset-0 w-full h-full object-center"
                    style={{ objectFit: variable.fit || "cover" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}
            </Rnd>
          );
        })}
      </div>
      {activeVar && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="col-span-2 flex justify-between items-center">
            <span className="font-semibold">{activeVar.label}</span>
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

export default function LandingPage() {
  const [step, setStep] = useState(0);
  const [csvFile, setCsvFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [sampleRows, setSampleRows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [mapping, setMapping] = useState({});
  const [previewItems, setPreviewItems] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [loading, setLoading] = useState({ inspect: false, preview: false, batch: false, saveTemplate: false });
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch(`${API_BASE}/templates`);
        const data = await res.json();
        setTemplates(data.templates || []);
        if ((data.templates || []).length > 0) {
          setSelectedTemplate(data.templates[0]);
        }
      } catch (e) {
        console.error("Failed to load templates", e);
      }
    };
    fetchTemplates();
  }, []);

  const handleCsvUpload = async (file) => {
    setCsvFile(file);
    setError("");
    setLoading((prev) => ({ ...prev, inspect: true }));
    const formData = new FormData();
    formData.append("csv_file", file);
    formData.append("sample_size", "5");
    try {
      const res = await fetch(`${API_BASE}/csv/inspect`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to inspect CSV");
      const data = await res.json();
      setHeaders(data.headers || []);
      setSampleRows(data.sample_rows || []);
      setStep(1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading((prev) => ({ ...prev, inspect: false }));
    }
  };

  const currentTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplate?.id) || selectedTemplate,
    [templates, selectedTemplate]
  );

  const handleMappingChange = (varId, header) => {
    setMapping((prev) => ({ ...prev, [varId]: header }));
  };

  const updateTemplateState = (updater) => {
    setSelectedTemplate((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
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
      return { ...tpl, variables: [...tpl.variables, newVar] };
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
      const res = await fetch(`${API_BASE}/preview`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Preview failed");
      const data = await res.json();
      setPreviewItems(data.previews || []);
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading((prev) => ({ ...prev, preview: false }));
    }
  };

  const pollJob = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/jobs/${id}`);
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

  const handleBatch = async () => {
    if (!csvFile || !currentTemplate) return;
    setLoading((prev) => ({ ...prev, batch: true }));
    setError("");
    const formData = new FormData();
    formData.append("template_id", currentTemplate.id);
    formData.append("mapping", JSON.stringify(mapping));
    formData.append("csv_file", csvFile);
    try {
      const res = await fetch(`${API_BASE}/batch`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Batch start failed");
      const data = await res.json();
      setJobId(data.job_id);
      setStep(4);
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
      const res = await fetch(`${API_BASE}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tpl),
      });
      if (!res.ok) throw new Error("Failed to save template");
      const data = await res.json();
      const keptVarIds = new Set((data.template?.variables || []).map((v) => v.id));
      setMapping((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (!keptVarIds.has(key)) {
            delete next[key];
          }
        });
        return next;
      });
      setSelectedTemplate(data.template);
      setTemplates((prev) => {
        const others = prev.filter((t) => t.id !== data.template.id);
        return [...others, data.template];
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading((prev) => ({ ...prev, saveTemplate: false }));
    }
  };

  const steps = ["Upload CSV", "Map Variables", "Placement", "Preview", "Run & Results"];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Batch Mockup Generator</h1>
      <p className="text-gray-600 text-sm">
        Upload a CSV, map columns to template variables (text or images), preview a few rows, then render & upload all
        mockups to Cloudinary with a CSV export.
      </p>

      <div className="grid grid-cols-5 gap-3">
        {steps.map((label, idx) => (
          <Step key={label} label={label} index={idx} active={idx === step} completed={step > idx} />
        ))}
      </div>

      {error && <div className="bg-red-100 text-red-800 border border-red-200 px-3 py-2 rounded">{error}</div>}

      {/* Step 1: Upload CSV */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">1) Upload CSV</h2>
          <button
            className="text-blue-600 text-sm underline disabled:text-gray-400"
            disabled={!csvFile}
            onClick={() => setStep(1)}
          >
            Continue
          </button>
        </div>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files?.[0] && handleCsvUpload(e.target.files[0])}
        />
        {loading.inspect && <p className="text-sm text-gray-500">Inspecting CSV...</p>}
        {sampleRows.length > 0 && (
          <div className="text-sm">
            <p className="font-semibold">Detected headers:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {headers.map((h) => (
                <span key={h} className="px-2 py-1 bg-gray-100 rounded border text-xs">
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Mapping */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">2) Map Variables</h2>
          <button
            className="text-blue-600 text-sm underline disabled:text-gray-400"
            disabled={!headers.length}
            onClick={() => setStep(2)}
          >
            Continue
          </button>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <label className="text-sm font-semibold">Template</label>
          <select
            className="border rounded px-3 py-2"
            value={currentTemplate?.id || ""}
            onChange={(e) => {
              const tpl = templates.find((t) => t.id === e.target.value);
              setSelectedTemplate(tpl || null);
            }}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:bg-gray-300"
            disabled={!currentTemplate}
            onClick={() => currentTemplate && handleTemplateSave(currentTemplate)}
          >
            Save Template
          </button>
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded bg-gray-200 text-sm border"
            onClick={() => addVariable("text")}
            disabled={!currentTemplate}
          >
            + Add Text Variable
          </button>
          <button
            className="px-3 py-1 rounded bg-gray-200 text-sm border"
            onClick={() => addVariable("image")}
            disabled={!currentTemplate}
          >
            + Add Image Variable
          </button>
        </div>
        {currentTemplate && (
          <div className="space-y-2">
            {currentTemplate.variables.map((v) => (
              <div key={v.id} className="flex items-center gap-2">
                <MappingRow variable={v} headers={headers} mapping={mapping} onChange={handleMappingChange} />
                <button
                  className="text-red-600 text-xs underline"
                  onClick={() => removeVariable(v.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 3: Placement Editor */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">3) Placement</h2>
          <button
            className="text-blue-600 text-sm underline disabled:text-gray-400"
            disabled={!currentTemplate}
            onClick={() => setStep(3)}
          >
            Continue
          </button>
        </div>
        {currentTemplate && (
          <PlacementEditor
            template={currentTemplate}
            onSave={handleTemplateSave}
            previewRow={sampleRows[0]}
            mapping={mapping}
          />
        )}
        {loading.saveTemplate && <p className="text-sm text-gray-500">Saving template...</p>}
      </div>

      {/* Step 4: Preview */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">4) Preview Sample</h2>
          <button
            className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:bg-gray-300"
            disabled={!csvFile || !currentTemplate || loading.preview}
            onClick={handlePreview}
          >
            {loading.preview ? "Generating..." : "Generate Preview"}
          </button>
        </div>
        {previewItems.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {previewItems.map((item) => (
              <div key={item.row} className="border rounded p-2 bg-white">
                <img
                  src={`data:image/jpeg;base64,${item.image_base64}`}
                  alt={`Preview ${item.row}`}
                  className="w-full rounded"
                />
                <p className="text-xs text-gray-600 mt-1">Row {item.row + 1}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 5: Run */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">5) Run & Results</h2>
          <button
            className="px-3 py-2 rounded bg-green-600 text-white text-sm disabled:bg-gray-300"
            disabled={!csvFile || !currentTemplate || loading.batch}
            onClick={handleBatch}
          >
            {loading.batch ? "Starting..." : "Run Batch"}
          </button>
        </div>
        {jobStatus && (
          <div className="space-y-2">
            <p className="text-sm">
              Status: <span className="font-semibold">{jobStatus.status}</span> — Progress: {jobStatus.progress}%
            </p>
            <div className="w-full bg-gray-200 rounded h-2">
              <div
                className="bg-green-500 h-2 rounded"
                style={{ width: `${jobStatus.progress || 0}%` }}
              ></div>
            </div>
            {jobStatus.status === "done" && jobId && (
              <div className="flex gap-3 items-center">
                <a
                  className="text-blue-600 underline"
                  href={`${API_BASE}/jobs/${jobId}/csv`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download CSV
                </a>
                <span className="text-sm text-gray-500">
                  {jobStatus.results?.filter((r) => r.status === "done").length || 0} succeeded /{" "}
                  {jobStatus.results?.length || 0} total
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-auto">
              {jobStatus.results?.map((r) => (
                <div key={r.row} className="border rounded p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Row {r.row + 1}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        r.status === "done"
                          ? "bg-green-100 text-green-700"
                          : r.status === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
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
      </div>
    </div>
  );
}
