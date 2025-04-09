from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image, ImageDraw, ImageFont
import io
import base64
import os
import re

app = FastAPI()

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Company name cleaner
def shorten_company_name(name: str) -> str:
    suffixes = ["inc", "llc", "ltd", "co", "company", "group", "plc", "corp", "corporation"]
    words = name.strip().split()

    # Remove legal suffixes if they appear at the end
    if words and words[-1].lower().strip(",.") in suffixes:
        words = words[:-1]

    # Recombine and clean up
    cleaned = " ".join(words)
    cleaned = re.sub(r'[^a-zA-Z0-9 ]+', '', cleaned).strip()

    # Capitalize each word
    capitalized = " ".join(word.capitalize() for word in cleaned.split())

    return capitalized


def draw_multiline_centered(draw, text, box_x, box_y, box_w, box_h, font, fill):
    words = text.split()
    lines = []
    current = ""

    for word in words:
        test_line = current + " " + word if current else word
        bbox = font.getbbox(test_line)
        width = bbox[2] - bbox[0]
        if width <= box_w:
            current = test_line
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)

    line_height = font.getbbox("Ay")[3] - font.getbbox("Ay")[1]
    total_height = len(lines) * line_height

    start_y = box_y + (box_h - total_height) // 2

    for i, line in enumerate(lines):
        draw.text((box_x, start_y + i * line_height), line, font=font, fill=fill)



@app.post("/generate-mockup/")
async def generate_mockup(company_name: str = Form(...)):
    try:
        # Load the static mockup template
        template_path = os.path.join(os.path.dirname(__file__), "template", "mockup-template.jpg")
        image = Image.open(template_path).convert("RGB")
        draw = ImageDraw.Draw(image)

        # Load fonts (ensure these fonts are in your working dir or install them)
        font_path_bold = os.path.join(os.path.dirname(__file__), "fonts", "Inter_24pt-Bold.ttf")
        font_path_regular = os.path.join(os.path.dirname(__file__), "fonts", "Inter_24pt-Regular.ttf")

        font_logo = ImageFont.truetype(font_path_bold, 48)
        font_secondary = ImageFont.truetype(font_path_bold, 36)


        # Prepare text
        short_name = shorten_company_name(company_name)

        # Draw short name and full name
        draw_multiline_centered(
            draw,
            short_name,
            box_x=406,
            box_y=179,
            box_w=600,
            box_h=110,
            font=font_logo,
            fill=(0, 0, 0)
        )
        draw.text((515, 509), company_name, font=font_secondary, fill=(187, 187, 187))

        # Convert to base64 for preview
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=70, optimize=True)
        buffer.seek(0)
        preview_base64 = base64.b64encode(buffer.read()).decode("utf-8")

        return JSONResponse({
            "preview_base64": preview_base64,
            "shortened_name": short_name
        })

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
