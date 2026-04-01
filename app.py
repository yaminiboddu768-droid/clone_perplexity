import os
import time
from flask import Flask, request, Response, stream_with_context, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types
from dotenv import load_dotenv
import tempfile

# Load API key from .env file
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

# Configure GenAI Client
client = genai.Client(api_key=api_key)
MODEL_ID = "gemini-2.0-flash" # Updated to newest stable

app = Flask(__name__)
CORS(app)

# Global store for document context (In-memory for simplicity)
doc_contexts = {}

@app.route("/api/upload", methods=["POST"])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        # Save to a temporary file for the SDK to upload
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        # Upload to Gemini File API
        print(f"Uploading {file.filename} to Gemini File API...")
        uploaded_file = client.files.upload(file=tmp_path)
        
        # Clean up the local temp file
        os.unlink(tmp_path)

        # Wait for processing (especially for videos or large PDFs)
        while uploaded_file.state == 'PROCESSING':
            print("Processing file...")
            time.sleep(2)
            uploaded_file = client.files.get(name=uploaded_file.name)

        if uploaded_file.state == 'FAILED':
            return jsonify({"error": "File processing failed on server"}), 500

        # Store the file info
        file_id = "current_doc"
        doc_contexts[file_id] = {
            "uri": uploaded_file.uri,
            "mime_type": uploaded_file.mime_type,
            "filename": file.filename
        }
        
        return jsonify({
            "message": "File uploaded and processed successfully",
            "filename": file.filename,
            "file_id": file_id
        })
    except Exception as e:
        return jsonify({"error": f"Failed to upload file: {str(e)}"}), 500

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json
    messages = data.get("messages", [])
    file_id = data.get("file_id")
    
    if not messages:
        return {"error": "No messages provided"}, 400
    
    # Translate our chat history into the SDK format
    contents = []
    
    # If a document is attached, include it in the conversation
    if file_id and file_id in doc_contexts:
        doc = doc_contexts[file_id]
        contents.append({
            "role": "user",
            "parts": [
                types.Part.from_uri(file_uri=doc["uri"], mime_type=doc["mime_type"]),
                types.Part.from_text(text="I have uploaded this file. Please analyze it and keep its context in mind for our conversation.")
            ]
        })
        # Note: We don't need a summary if we are passing the whole file. 
        # But we need to acknowledge it.

    for msg in messages:
        contents.append({
            "role": "user" if msg["role"] == "user" else "model",
            "parts": [{"text": msg["content"]}]
        })

    def generate():
        try:
            # Using the new google-genai SDK streaming method
            response = client.models.generate_content_stream(
                model=MODEL_ID,
                contents=contents
            )
            
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            yield f"Error: {str(e)}"

    return Response(stream_with_context(generate()), mimetype="text/plain")

if __name__ == "__main__":
    print(f"SynapseAI Backend (google-genai) running on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
