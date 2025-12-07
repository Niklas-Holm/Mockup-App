import asyncio
import base64
import csv
import io
import json
import os
import re
import uuid
from datetime import datetime
from typing import Dict, List, Optional

import requests
from fastapi import File, Form, HTTPException, UploadFile
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageDraw, ImageFont

# Optional Cloudinary dependency
try:
    import cloudinary
    import cloudinary.uploader

    CLOUDINARY_AVAILABLE = True
except ImportError:
    CLOUDINARY_AVAILABLE = False

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "generated")


def load_env(path: str = ".env"):
    """Simple .env loader to set environment variables locally."""
    env_path = os.path.join(os.path.dirname(BASE_DIR), path)
    if not os.path.exists(env_path):
        return
    with open(env_path, "r") as f:
        for line in f:
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


# Load environment early so Cloudinary config sees it
load_env()

CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUD_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
CLOUD_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")
PUBLIC_ID_PATTERN = os.getenv("PUBLIC_ID_PATTERN", "<template>-<row>-<uuid>")
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "mockups")

if CLOUDINARY_AVAILABLE and CLOUD_NAME and CLOUD_API_KEY and CLOUD_API_SECRET:
    cloudinary.config(
        cloud_name=CLOUD_NAME,
        api_key=CLOUD_API_KEY,
        api_secret=CLOUD_API_SECRET,
        secure=True,
    )


app = FastAPI()

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "template")), name="static")

# In-memory stores (replace with DB when ready)
TEMPLATES: Dict[str, dict] = {}
JOBS: Dict[str, dict] = {}


# === Helpers ===
def shorten_company_name(name: str) -> str:
    suffixes = ["inc", "llc", "ltd", "co", "company", "group", "plc", "corp", "corporation"]
    words = name.strip().split()
    if words and words[-1].lower().strip(",.") in suffixes:
        words = words[:-1]
    cleaned = " ".join(words)
    cleaned = re.sub(r"[^a-zA-Z0-9 ]+", "", cleaned).strip()
    return " ".join(word.capitalize() for word in cleaned.split())


def ensure_data_dir():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)


def resolve_template_image_path(path: str) -> str:
    """Return an absolute filesystem path for the template image."""
    # Already absolute and exists
    if os.path.isabs(path) and os.path.exists(path):
        return path
    # If path is served from /static/, map to template directory
    cleaned = path.lstrip("/")
    candidate = os.path.join(BASE_DIR, cleaned)
    if os.path.exists(candidate):
        return candidate
    candidate = os.path.join(BASE_DIR, "template", os.path.basename(path))
    if os.path.exists(candidate):
        return candidate
    return path


def default_template():
    """Seed a default template using the existing mockup asset."""
    return {
        "id": "default",
        "name": "Default Mockup",
        "baseImagePath": "/static/mockup-template.jpg",
        "variables": [
            {
                "id": "short_name",
                "label": "Short Name",
                "type": "text",
                "x": 406,
                "y": 179,
                "w": 600,
                "h": 110,
                "style": {
                    "font": "Inter_Bold",
                    "size": 48,
                    "weight": "bold",
                    "color": "#000000",
                    "align": "left",
                },
                "defaultValue": "",
            },
            {
                "id": "full_name",
                "label": "Full Name",
                "type": "text",
                "x": 515,
                "y": 509,
                "w": 600,
                "h": 80,
                "style": {
                    "font": "Inter_Bold",
                    "size": 36,
                    "weight": "bold",
                    "color": "#bbbbbb",
                    "align": "left",
                },
                "defaultValue": "",
            },
            {
                "id": "logo",
                "label": "Logo",
                "type": "image",
                "x": 100,
                "y": 200,
                "w": 200,
                "h": 200,
                "fit": "contain",
                "defaultValue": "",
            },
        ],
    }


def roofing_template():
    """Seed a roofing template if the asset exists."""
    return {
        "id": "roofing",
        "name": "Roofing Mockup",
        "baseImagePath": "/static/roofing-template.jpg",
        "variables": [
            {
                "id": "short_name",
                "label": "Short Name",
                "type": "text",
                "x": 406,
                "y": 179,
                "w": 600,
                "h": 110,
                "style": {
                    "font": "Inter_Bold",
                    "size": 48,
                    "weight": "bold",
                    "color": "#000000",
                    "align": "left",
                },
                "defaultValue": "",
            },
            {
                "id": "full_name",
                "label": "Full Name",
                "type": "text",
                "x": 515,
                "y": 509,
                "w": 600,
                "h": 80,
                "style": {
                    "font": "Inter_Bold",
                    "size": 36,
                    "weight": "bold",
                    "color": "#bbbbbb",
                    "align": "left",
                },
                "defaultValue": "",
            },
            {
                "id": "logo",
                "label": "Logo",
                "type": "image",
                "x": 100,
                "y": 200,
                "w": 200,
                "h": 200,
                "fit": "contain",
                "defaultValue": "",
            },
        ],
    }


def get_font(style: dict):
    font_name = style.get("font", "Inter_Bold")
    size = style.get("size", 32)
    font_map = {
        "Inter_Bold": os.path.join(BASE_DIR, "fonts", "Inter_24pt-Bold.ttf"),
        "Inter_Regular": os.path.join(BASE_DIR, "fonts", "Inter_24pt-Regular.ttf"),
    }
    font_path = font_map.get(font_name, font_map["Inter_Bold"])
    try:
        return ImageFont.truetype(font_path, size)
    except Exception:
        return ImageFont.load_default()


def wrap_text_to_box(draw: ImageDraw.ImageDraw, text: str, font, max_width: int):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        test_line = f"{current} {word}".strip()
        bbox = draw.textbbox((0, 0), test_line, font=font)
        width = bbox[2] - bbox[0]
        if width <= max_width:
            current = test_line
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_text_block(draw: ImageDraw.ImageDraw, variable: dict, text: str):
    x, y, w, h = variable["x"], variable["y"], variable["w"], variable["h"]
    style = variable.get("style", {})
    font = get_font(style)
    align = style.get("align", "left")
    valign = style.get("valign", "middle")

    lines = wrap_text_to_box(draw, text, font, w)
    # Measure each line to derive accurate height/width
    line_heights = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line or "Ay", font=font)
        line_heights.append(bbox[3] - bbox[1])
    line_height = max(line_heights) if line_heights else font.getbbox("Ay")[3] - font.getbbox("Ay")[1]
    total_height = len(lines) * line_height

    valign_norm = valign.lower()
    if valign_norm == "top":
        start_y = y
    elif valign_norm == "bottom":
        start_y = y + max(h - total_height, 0)
    else:  # middle/default
        start_y = y + max((h - total_height) // 2, 0)
    # Upward nudge (vertical only) to better match on-screen editor preview
    start_y = max(start_y - int(line_height * 0.18), y)

    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        line_width = bbox[2] - bbox[0]
        if align == "center":
            line_x = x + max((w - line_width) // 2, 0)
        elif align == "right":
            line_x = x + max(w - line_width, 0)
        else:
            line_x = x
        draw.text((line_x, start_y + i * line_height), line, font=font, fill=style.get("color", "#000000"))


def load_image_from_value(value: str) -> Optional[Image.Image]:
    if not value:
        return None
    try:
        if value.startswith("data:image"):
            header, b64data = value.split(",", 1)
            binary = base64.b64decode(b64data)
            return Image.open(io.BytesIO(binary)).convert("RGB")
        if value.startswith("http://") or value.startswith("https://"):
            resp = requests.get(value, timeout=10)
            resp.raise_for_status()
            return Image.open(io.BytesIO(resp.content)).convert("RGB")
        if os.path.exists(value):
            return Image.open(value).convert("RGB")
    except Exception:
        return None
    return None


def paste_image(draw_image: Image.Image, variable: dict, value: str):
    img = load_image_from_value(value)
    if not img:
        return
    x, y, w, h = variable["x"], variable["y"], variable["w"], variable["h"]
    fit_mode = variable.get("fit", "cover")

    if fit_mode == "contain":
        img.thumbnail((w, h))
        paste_x = x + (w - img.width) // 2
        paste_y = y + (h - img.height) // 2
        draw_image.paste(img, (paste_x, paste_y))
    else:
        img_ratio = img.width / img.height
        box_ratio = w / h
        if img_ratio > box_ratio:
            new_width = w
            new_height = int(w / img_ratio)
        else:
            new_height = h
            new_width = int(h * img_ratio)
        img = img.resize((new_width, new_height))
        paste_x = x + (w - new_width) // 2
        paste_y = y + (h - new_height) // 2
        draw_image.paste(img, (paste_x, paste_y))


def apply_variables(template: dict, row: dict, mapping: dict) -> Image.Image:
    base_path = resolve_template_image_path(template["baseImagePath"])
    if not os.path.exists(base_path):
        raise FileNotFoundError(f"Template image not found: {base_path}")
    image = Image.open(base_path).convert("RGB")
    draw = ImageDraw.Draw(image)

    for variable in template.get("variables", []):
        var_id = variable["id"]
        column = mapping.get(var_id)
        value = ""
        if column:
            value = str(row.get(column, "")).strip()
        if not value:
            value = variable.get("defaultValue", "")
        if variable["type"] == "text":
            if not value and var_id == "short_name":
                value = shorten_company_name(str(row.get(column, "")))
            draw_text_block(draw, variable, value)
        elif variable["type"] == "image":
            paste_image(image, variable, value)
    return image


def public_id_for_row(template_id: str, row_index: int, row: dict) -> str:
    company = row.get("Company Name") or row.get("company") or "mockup"
    safe_company = re.sub(r"[^a-zA-Z0-9_-]+", "_", str(company)).strip("_") or "mockup"
    uid = uuid.uuid4().hex[:8]
    replacements = {
        "<template>": template_id,
        "<row>": str(row_index),
        "<company>": safe_company,
        "<uuid>": uid,
        "<ts>": datetime.utcnow().strftime("%Y%m%d%H%M%S"),
    }
    pid = PUBLIC_ID_PATTERN
    for key, val in replacements.items():
        pid = pid.replace(key, val)
    return pid


def upload_to_cloudinary(image: Image.Image, template_id: str, row_index: int, row: dict) -> str:
    if not CLOUDINARY_AVAILABLE:
        raise RuntimeError("Cloudinary SDK not installed")
    if not CLOUD_NAME or not CLOUD_API_KEY or not CLOUD_API_SECRET:
        raise RuntimeError("Cloudinary credentials missing")
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=80, optimize=True)
    buffer.seek(0)
    public_id = public_id_for_row(template_id, row_index, row)
    result = cloudinary.uploader.upload(
        file=buffer.getvalue(),
        folder=UPLOAD_FOLDER,
        public_id=public_id,
        overwrite=True,
        resource_type="image",
        use_filename=False,
    )
    return result.get("secure_url") or result.get("url")


def parse_csv_file(file: UploadFile) -> List[dict]:
    content = file.file.read()
    file.file.seek(0)
    try:
        text = content.decode("utf-8-sig")
    except Exception:
        text = content.decode("latin-1")
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


def serialize_rows_to_csv(rows: List[dict], mockup_column: str = "mockup_url") -> str:
    if not rows:
        return ""
    headers = list(rows[0].keys())
    if mockup_column not in headers:
        headers.append(mockup_column)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return output.getvalue()


async def run_job(job_id: str, rows: List[dict], template: dict, mapping: dict):
    ensure_data_dir()
    job = JOBS[job_id]
    total = len(rows)
    results = []
    mockup_column = "mockup_url"

    for idx, row in enumerate(rows):
        status = {"row": idx, "status": "pending", "url": None, "error": None}
        try:
            image = apply_variables(template, row, mapping)
            url = upload_to_cloudinary(image, template["id"], idx, row)
            row[mockup_column] = url
            status["status"] = "done"
            status["url"] = url
        except Exception as e:
            status["status"] = "error"
            status["error"] = str(e)
            row[mockup_column] = ""
        results.append(status)
        job["progress"] = int(((idx + 1) / total) * 100)
        job["results"] = results
        job["rows"][idx] = row

    csv_text = serialize_rows_to_csv(job["rows"], mockup_column)
    csv_path = os.path.join(DATA_DIR, f"job_{job_id}.csv")
    with open(csv_path, "w", encoding="utf-8") as f:
        f.write(csv_text)

    job["status"] = "done"
    job["csv_path"] = csv_path


# === Routes ===
@app.on_event("startup")
async def seed_templates():
    if not TEMPLATES:
        tpl = default_template()
        TEMPLATES[tpl["id"]] = tpl
        roofing_path = os.path.join(BASE_DIR, "template", "roofing-template.jpg")
        if os.path.exists(roofing_path):
            rt = roofing_template()
            TEMPLATES[rt["id"]] = rt


@app.get("/api/templates")
async def list_templates():
    return {"templates": list(TEMPLATES.values())}


@app.get("/api/templates/{template_id}")
async def get_template(template_id: str):
    tpl = TEMPLATES.get(template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tpl


@app.post("/api/templates")
async def create_or_update_template(payload: dict):
    tpl_id = payload.get("id") or uuid.uuid4().hex
    payload["id"] = tpl_id
    TEMPLATES[tpl_id] = payload
    return {"template": payload}


@app.post("/api/csv/inspect")
async def inspect_csv(csv_file: UploadFile = File(...), sample_size: int = Form(5)):
    rows = parse_csv_file(csv_file)
    headers = list(rows[0].keys()) if rows else []
    return {"headers": headers, "sample_rows": rows[:sample_size]}


@app.post("/api/preview")
async def preview_mockups(
    template_id: str = Form(...),
    mapping: str = Form(...),
    limit: int = Form(3),
    csv_file: UploadFile = File(...),
):
    try:
        mapping_dict = json.loads(mapping)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid mapping JSON")
    tpl = TEMPLATES.get(template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    rows = parse_csv_file(csv_file)
    previews = []
    for idx, row in enumerate(rows[:limit]):
        img = apply_variables(tpl, row, mapping_dict)
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=70, optimize=True)
        buffer.seek(0)
        previews.append(
            {
                "row": idx,
                "image_base64": base64.b64encode(buffer.read()).decode("utf-8"),
                "row_data": row,
            }
        )
    return {"previews": previews}


@app.post("/api/batch")
async def start_batch(
    template_id: str = Form(...),
    mapping: str = Form(...),
    csv_file: UploadFile = File(...),
):
    try:
        mapping_dict = json.loads(mapping)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid mapping JSON")
    tpl = TEMPLATES.get(template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    rows = parse_csv_file(csv_file)
    if not rows:
        raise HTTPException(status_code=400, detail="CSV has no rows")

    job_id = uuid.uuid4().hex
    JOBS[job_id] = {
        "id": job_id,
        "status": "running",
        "progress": 0,
        "results": [],
        "created_at": datetime.utcnow().isoformat(),
        "rows": rows,
        "mapping": mapping_dict,
        "template_id": template_id,
        "csv_path": None,
    }
    asyncio.create_task(run_job(job_id, rows, tpl, mapping_dict))
    return {"job_id": job_id, "total_rows": len(rows)}


@app.get("/api/jobs/{job_id}")
async def job_status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/api/jobs/{job_id}/csv")
async def download_job_csv(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("status") != "done":
        raise HTTPException(status_code=400, detail="Job not finished")
    csv_path = job.get("csv_path")
    if not csv_path or not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="CSV not found")
    return FileResponse(csv_path, media_type="text/csv", filename=os.path.basename(csv_path))
