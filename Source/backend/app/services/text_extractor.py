from fastapi import UploadFile


async def extract_text_from_upload(file: UploadFile) -> str:
    content = await file.read()

    # Placeholder: real extraction will use PDF/DOCX parsers in the next milestone.
    if not content:
        return ""

    return (
        f"Uploaded file: {file.filename}\n"
        "Skills: Python, React, teamwork\n"
        "Projects: student web application and AI prototype\n"
    )
