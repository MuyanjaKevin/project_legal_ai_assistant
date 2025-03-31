# backend/app/services/translation_service.py

import os
import requests
from app.config.database import get_database
from bson import ObjectId
from datetime import datetime
import json
from app.services.ai_processor import safe_openai_call

db = get_database()

class TranslationService:
    """Service for translating documents and interface content"""
    
    def __init__(self):
        self.openai_api_key = os.environ.get('OPENAI_API_KEY', 'your-api-key-here')
        self.model = "gpt-3.5-turbo"
        
        # Supported languages with their ISO codes
        self.supported_languages = {
            "en": "English",
            "es": "Spanish",
            "fr": "French",
            "de": "German",
            "it": "Italian",
            "pt": "Portuguese",
            "zh": "Chinese",
            "ja": "Japanese",
            "ru": "Russian",
            "ar": "Arabic"
        }
    
    def get_supported_languages(self):
        """Return list of supported languages"""
        return [{"code": code, "name": name} for code, name in self.supported_languages.items()]
    
    def detect_language(self, text):
        """Detect the language of a text"""
        # Limit text length for efficiency
        sample = text[:1000]
        
        prompt = f"""Identify the language of the following text. Respond with only the ISO language code (e.g., 'en', 'es', 'fr', etc.)

TEXT:
{sample}
"""
        
        response = safe_openai_call(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a language identification tool. Respond only with the ISO language code."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=10,
            expected_format='text',
            default_result="en"  # Default to English if detection fails
        )
        
        # Clean up response to ensure it's just a language code
        lang_code = response.strip().lower()
        if len(lang_code) > 2:
            # If it returned something like "English" or a longer explanation
            # Try to map it to a code
            for code, name in self.supported_languages.items():
                if name.lower() in lang_code:
                    return code
            return "en"  # Default to English
            
        return lang_code
    
    def translate_document(self, document_id, target_language="en"):
        """Translate a document to the target language"""
        document = db.documents.find_one({"_id": ObjectId(document_id)})
        if not document or "extracted_text" not in document:
            return {"error": "Document not found or text extraction failed"}
        
        # Get document text
        original_text = document.get("extracted_text", "")
        
        # Detect source language if not already in metadata
        source_language = document.get("detected_language")
        if not source_language:
            source_language = self.detect_language(original_text)
            
            # Save detected language to document
            db.documents.update_one(
                {"_id": ObjectId(document_id)},
                {"$set": {"detected_language": source_language}}
            )
        
        # Skip translation if document is already in target language
        if source_language == target_language:
            return {
                "message": f"Document already in {self.supported_languages.get(target_language, target_language)}",
                "translated_text": original_text,
                "source_language": source_language,
                "target_language": target_language
            }
        
        # Check if we already have this translation cached
        existing_translation = db.translations.find_one({
            "document_id": ObjectId(document_id),
            "target_language": target_language
        })
        
        if existing_translation and "translated_text" in existing_translation:
            return {
                "message": "Retrieved cached translation",
                "translated_text": existing_translation["translated_text"],
                "source_language": source_language,
                "target_language": target_language
            }
        
        # For long documents, split into chunks for translation
        max_chunk_size = 4000  # Characters
        chunks = [original_text[i:i+max_chunk_size] for i in range(0, len(original_text), max_chunk_size)]
        
        translated_chunks = []
        for i, chunk in enumerate(chunks):
            # Skip empty chunks
            if not chunk.strip():
                continue
                
            prompt = f"""Translate the following text from {self.supported_languages.get(source_language, source_language)} to {self.supported_languages.get(target_language, target_language)}. Maintain formatting, legal terminology, and structure as much as possible:

{chunk}
"""
            
            translated_chunk = safe_openai_call(
                model=self.model,
                messages=[
                    {"role": "system", "content": f"You are a professional legal translator from {self.supported_languages.get(source_language, source_language)} to {self.supported_languages.get(target_language, target_language)}."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=4000,
                expected_format='text',
                default_result=f"[Translation error for chunk {i+1}]"
            )
            
            translated_chunks.append(translated_chunk)
        
        # Combine all translated chunks
        translated_text = "\n".join(translated_chunks)
        
        # Store the translation in database for future use
        translation_data = {
            "document_id": ObjectId(document_id),
            "source_language": source_language,
            "target_language": target_language,
            "translated_text": translated_text,
            "created_at": datetime.utcnow()
        }
        
        # Insert or update translation
        db.translations.update_one(
            {
                "document_id": ObjectId(document_id),
                "target_language": target_language
            },
            {"$set": translation_data},
            upsert=True
        )
        
        return {
            "message": "Translation successful",
            "translated_text": translated_text,
            "source_language": source_language,
            "target_language": target_language
        }
    
    def translate_search_query(self, query, target_languages=None):
        """Translate a search query to multiple languages for cross-language search"""
        if not target_languages:
            # Default to translating to all supported languages
            target_languages = list(self.supported_languages.keys())
        
        # Detect source language
        source_language = self.detect_language(query)
        
        translations = {}
        for lang in target_languages:
            # Skip translation if language is the same as source
            if lang == source_language:
                translations[lang] = query
                continue
                
            prompt = f"""Translate the following search query from {self.supported_languages.get(source_language, source_language)} to {self.supported_languages.get(lang, lang)}:

{query}

Provide only the translated text.
"""
            
            translated_query = safe_openai_call(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a search query translator. Provide only the translated query."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=100,
                expected_format='text',
                default_result=query  # If translation fails, use original query
            )
            
            translations[lang] = translated_query.strip()
        
        return {
            "original_query": query,
            "source_language": source_language,
            "translations": translations
        }