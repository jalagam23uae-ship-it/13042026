"""
Parse a .docx course guide and extract topics/sections as lesson data.

Strategy:
- Heading 1 = Major section (chapter/module)
- Heading 2 = Sub-topic (individual lesson)
- Heading 3+ = Sub-sections within a lesson
- Body text under each heading becomes the lesson description/content
"""
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
import io


def parse_course_docx(file_bytes: bytes) -> dict:
    """
    Parse a DOCX file and return structured course content.

    Returns:
        {
            "title": str,           # From first heading or filename
            "description": str,     # First paragraph if not a heading
            "sections": [
                {
                    "title": str,       # Section/chapter heading
                    "lessons": [
                        {
                            "title": str,
                            "description": str,  # Combined body text
                            "content_type": "article",
                            "sub_topics": [str],  # Heading 3+ items
                            "sort_order": int,
                        }
                    ]
                }
            ],
            "flat_lessons": [       # Flattened list for direct import
                {
                    "title": str,
                    "description": str,
                    "content_type": "article",
                    "sort_order": int,
                }
            ]
        }
    """
    doc = Document(io.BytesIO(file_bytes))

    course_title = ""
    course_description = ""
    sections = []
    current_section = None
    current_lesson = None
    lesson_counter = 0

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        style_name = (para.style.name if para.style else "").lower()

        # Title or Heading 1 → New section/chapter
        if "heading 1" in style_name or "title" in style_name:
            if not course_title:
                course_title = text
                continue
            # Save previous lesson
            if current_lesson and current_section:
                current_section["lessons"].append(current_lesson)
                current_lesson = None
            # Save previous section
            if current_section:
                sections.append(current_section)
            current_section = {"title": text, "lessons": []}

        # Heading 2 → New lesson within current section
        elif "heading 2" in style_name:
            if current_lesson and current_section:
                current_section["lessons"].append(current_lesson)
            lesson_counter += 1
            current_lesson = {
                "title": text,
                "description": "",
                "content_type": "article",
                "sub_topics": [],
                "sort_order": lesson_counter,
            }
            if not current_section:
                current_section = {"title": "General", "lessons": []}

        # Heading 3+ → Sub-topic within current lesson
        elif "heading" in style_name:
            if current_lesson:
                current_lesson["sub_topics"].append(text)
                if current_lesson["description"]:
                    current_lesson["description"] += f"\n\n**{text}**\n"
            elif current_section:
                # No lesson yet, treat as a new lesson
                lesson_counter += 1
                current_lesson = {
                    "title": text,
                    "description": "",
                    "content_type": "article",
                    "sub_topics": [],
                    "sort_order": lesson_counter,
                }

        # Normal paragraph → body text for description
        else:
            if current_lesson:
                if current_lesson["description"]:
                    current_lesson["description"] += "\n" + text
                else:
                    current_lesson["description"] = text
            elif not course_description:
                course_description = text

    # Save last lesson and section
    if current_lesson and current_section:
        current_section["lessons"].append(current_lesson)
    if current_section:
        sections.append(current_section)

    # If no heading structure found, create lessons from paragraphs
    if not sections and not course_title:
        # Fallback: split by numbered patterns like "1.", "2.", etc.
        lesson_counter = 0
        current_text = ""
        current_title = ""
        flat = []
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            # Check if line starts with a number pattern like "1." or "1.1"
            if text and text[0].isdigit() and ('.' in text[:4]):
                if current_title:
                    lesson_counter += 1
                    flat.append({
                        "title": current_title,
                        "description": current_text.strip(),
                        "content_type": "article",
                        "sort_order": lesson_counter,
                    })
                current_title = text
                current_text = ""
            else:
                current_text += text + "\n"
        if current_title:
            lesson_counter += 1
            flat.append({
                "title": current_title,
                "description": current_text.strip(),
                "content_type": "article",
                "sort_order": lesson_counter,
            })
        return {
            "title": course_title or "Untitled Course",
            "description": course_description,
            "sections": [],
            "flat_lessons": flat,
        }

    # Fallback: if sections exist but all have 0 lessons,
    # promote each section to a lesson (document uses only Heading 1)
    total_lessons_in_sections = sum(len(s["lessons"]) for s in sections)
    if sections and total_lessons_in_sections == 0:
        for i, section in enumerate(sections):
            # Collect body text for this section from original paragraphs
            section["lessons"].append({
                "title": section["title"],
                "description": "",
                "content_type": "article",
                "sub_topics": [],
                "sort_order": i + 1,
            })

        # Re-collect descriptions by re-parsing paragraphs
        current_section_idx = -1
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            style_name = (para.style.name if para.style else "").lower()
            if "heading 1" in style_name or "title" in style_name:
                if text == course_title:
                    continue
                current_section_idx += 1
            elif current_section_idx >= 0 and current_section_idx < len(sections):
                lesson = sections[current_section_idx]["lessons"][0] if sections[current_section_idx]["lessons"] else None
                if lesson:
                    if "heading" in style_name:
                        lesson["sub_topics"].append(text)
                        lesson["description"] += f"\n\n**{text}**\n" if lesson["description"] else f"**{text}**\n"
                    else:
                        lesson["description"] += ("\n" + text) if lesson["description"] else text

    # Build flat lesson list from sections
    flat_lessons = []
    order = 0
    for section in sections:
        for lesson in section["lessons"]:
            order += 1
            flat_lessons.append({
                "title": lesson["title"],
                "description": lesson["description"],
                "content_type": lesson["content_type"],
                "sort_order": order,
                "section": section["title"],
            })

    return {
        "title": course_title or "Untitled Course",
        "description": course_description,
        "sections": sections,
        "flat_lessons": flat_lessons,
    }


def extract_tables(file_bytes: bytes) -> list:
    """Extract tables from the DOCX as structured data."""
    doc = Document(io.BytesIO(file_bytes))
    tables = []
    for table in doc.tables:
        rows = []
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells]
            rows.append(cells)
        if rows:
            tables.append(rows)
    return tables
