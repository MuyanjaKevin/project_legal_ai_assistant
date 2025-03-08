import os
import PyPDF2
import docx
from app.config.database import get_database

def extract_text_from_document(document_id):
    """Extract text from document based on its file type"""
    db = get_database()
    
    # Get document from database
    document = db.documents.find_one({"_id": document_id})
    if not document:
        return None
    
    file_path = document["file_path"]
    file_type = document["file_type"].lower()
    
    extracted_text = ""
    
    # Extract text based on file type
    if file_type == "pdf":
        extracted_text = extract_from_pdf(file_path)
    elif file_type == "docx":
        extracted_text = extract_from_docx(file_path)
    elif file_type == "txt":
        extracted_text = extract_from_txt(file_path)
    
    # Update document with extracted text
    db.documents.update_one(
        {"_id": document_id},
        {"$set": {"extracted_text": extracted_text, "text_extracted": True}}
    )
    
    return extracted_text

def extract_from_pdf(file_path):
    """Extract text from PDF file"""
    text = ""
    try:
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page_num in range(len(reader.pages)):
                page = reader.pages[page_num]
                text += page.extract_text() + "\n"
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
    return text

def extract_from_docx(file_path):
    """Extract text from DOCX file"""
    text = ""
    try:
        doc = docx.Document(file_path)
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        print(f"Error extracting text from DOCX: {e}")
    return text

def extract_from_txt(file_path):
    """Extract text from TXT file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except UnicodeDecodeError:
        # Try alternative encoding if UTF-8 fails
        try:
            with open(file_path, 'r', encoding='latin-1') as file:
                return file.read()
        except Exception as e:
            print(f"Error extracting text from TXT: {e}")
            return ""