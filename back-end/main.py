from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import base64
import httpx
import json
import random
from pydantic import BaseModel
from typing import List, Dict, Any

from schemas import ThemeGenerationRequest, CuratorialResponse, ImageGenerationRequest, ImageGenerationResponse, ImageStatusResponse, PostCurationRequest

app = FastAPI(
    title="AI Curatorial System API",
    description="Backend for coordinating LLM (Ollama) and Image Generation (ComfyUI)",
    version="0.1.0"
)

# Configure CORS to allow requests from the Vue frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", # Default Vite port
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to the AI Curatorial System API"}

@app.post("/api/curate/expand-theme", response_model=CuratorialResponse)
async def expand_theme(request: ThemeGenerationRequest):
    # Formulate a prompt for the LLM based on user input
    prompt = f"You are an expert art curator. Expand the following exhibition theme into exactly {request.num_sections} distinct sub-themes.\n"
    prompt += f"Theme: '{request.theme}'\n"
    if request.mood:
        prompt += f"Mood/Atmosphere: '{request.mood}'\n"
    if request.style:
        prompt += f"Visual Style: '{request.style}'\n"
    
    prompt += "\nCRITICAL RULES FOR DESCRIPTIONS:\n"
    prompt += "- DO NOT start the description with 'This sub-theme...', 'This section...', or 'This exhibition...'.\n"
    prompt += "- Start directly with the curatorial concept, a philosophical statement, or a poetic observation.\n"

    # Instruct the LLM to return a specific JSON structure
    prompt += "\nRespond strictly in JSON format matching the following schema:\n"
    prompt += "{\n"
    prompt += "  \"sub_themes\": [\n"
    prompt += "    {\n"
    prompt += "      \"title\": \"Sub-theme title\",\n"
    prompt += "      \"description\": \"Curatorial description of the sub-theme\",\n"
    prompt += "      \"image_prompt\": \"Detailed visual prompt for an AI image generator to create an artwork for this section\"\n"
    prompt += "    }\n"
    prompt += "  ]\n"
    prompt += "}\n"

    # Communicate with Ollama API
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "llama3",
                    "prompt": prompt,
                    "stream": False,
                    "format": "json"  # Force Ollama to return JSON
                },
                timeout=60.0  # Increased timeout since LLM generation can take a moment
            )
            response.raise_for_status()
            data = response.json()
            
            try:
                # Parse the string response from Ollama into a Python dictionary
                llm_response_json = json.loads(data.get("response", "{}"))
                return CuratorialResponse(status="success", sub_themes=llm_response_json.get("sub_themes", []))
            except json.JSONDecodeError:
                raise HTTPException(status_code=500, detail="LLM failed to return valid JSON.")
            
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Failed to communicate with Ollama: {str(e)}")

@app.post("/api/curate/generate-image", response_model=ImageGenerationResponse)
async def generate_image(request: ImageGenerationRequest):
    # Load the ComfyUI API workflow format
    try:
        with open("workflow_api.json", "r") as f:
            workflow = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="workflow_api.json not found. Please ensure it exists in the backend directory.")

    # Inject the dynamic prompt and randomize the seed
    # Node "6" is the positive prompt, Node "3" is the KSampler
    workflow["6"]["inputs"]["text"] = request.prompt
    workflow["3"]["inputs"]["seed"] = random.randint(1, 999999999999999)

    # Send the job to ComfyUI's /prompt endpoint
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post("http://127.0.0.1:8188/prompt", json={"prompt": workflow})
            response.raise_for_status()
            
            # Extract the prompt_id from ComfyUI's response
            prompt_data = response.json()
            prompt_id = prompt_data.get("prompt_id")
            
            return ImageGenerationResponse(status="success", message="Image generation queued successfully.", prompt_id=prompt_id)
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Failed to communicate with ComfyUI: {str(e)}")

@app.get("/api/curate/check-image/{prompt_id}", response_model=ImageStatusResponse)
async def check_image_status(prompt_id: str):
    async with httpx.AsyncClient() as client:
        try:
            # Check ComfyUI history
            history_response = await client.get(f"http://127.0.0.1:8188/history/{prompt_id}")
            history_response.raise_for_status()
            history_data = history_response.json()
            
            if prompt_id not in history_data:
                # If it's not in the history yet, it's still pending/processing
                return ImageStatusResponse(status="pending")
            
            # If it is in the history, extract the filename from the SaveImage node (Node 9)
            outputs = history_data[prompt_id].get("outputs", {})
            if "9" in outputs and "images" in outputs["9"]:
                image_info = outputs["9"]["images"][0]
                filename = image_info.get("filename")
                subfolder = image_info.get("subfolder", "")
                folder_type = image_info.get("type", "output")
                
                # Construct the URL to view/download the image from ComfyUI
                image_url = f"http://127.0.0.1:8188/view?filename={filename}&type={folder_type}&subfolder={subfolder}"
                return ImageStatusResponse(status="completed", image_url=image_url)
            else:
                raise HTTPException(status_code=500, detail="Image completed but filename not found in outputs.")
                
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Failed to communicate with ComfyUI: {str(e)}")
        
@app.post("/api/curate/post-curation")
async def post_curation(request: PostCurationRequest):
    system_prompt = """You are a highly acclaimed art curator and philosopher designing a virtual museum exhibition.
    The user has provided an overall theme and selected a series of artworks for different sections.
    Your task is to interpret the collection and write compelling, insightful, and philosophical texts that give the exhibition deep meaning.
    Do NOT mention that the artworks are AI-generated. Focus on their aesthetic, symbolic, and emotional content as if they were created by a human artist.
    
    CRITICAL INSTRUCTION ON STYLE: You MUST vary your writing style and sentence structure for every single artwork. 
    - Do NOT use repetitive formulas (e.g., strictly avoid starting descriptions with "This piece depicts...", "This work evokes...", or "The artist's use of...").
    - Use diverse curatorial voices: make some descriptions poetic and abstract, others analytical and grounded in visual theory, and others focused purely on the psychological or phenomenological experience of the viewer.
    - Ensure every description feels uniquely crafted and avoids predictable curatorial tropes.
    
    Respond ONLY with a valid JSON object following this exact structure:
    {
      "exhibition_title": "A poetic and evocative title for the overall exhibition",
      "introduction": "A deeply philosophical curatorial introduction (2-3 rich paragraphs) welcoming the visitor and setting the intellectual tone for the exhibition.",
      "sections": [
        {
          "title": "Section Title (keep original)",
          "description": "Section Description (keep original)",
          "artworks": [
            {
              "artwork_title": "A creative, metaphorical, or philosophical title for this specific artwork",
              "artwork_description": "A detailed and philosophical interpretation of this artwork (at least 4-5 sentences). Analyze its symbolism, composition, and emotional resonance. Connect it to broader artistic or humanistic themes. Completely avoid repetitive sentence structures and formulaic phrasing."
            }
          ]
        }
      ]
    }
    """

    # Convert the selection data to a more readable string for the LLM.
    selection_data = [
        s.model_dump() if hasattr(s, "model_dump") else (s.dict() if hasattr(s, "dict") else s) 
        for s in request.selection
    ]

    try:
        async with httpx.AsyncClient(timeout=600.0) as client: # Extended timeout for sequential processing
            
            # STEP 1: MACRO CURATION (Exhibition Intro)
            # Use standard Llama3 to synthesize the overarching theme.
            intro_system = "You are an expert art curator. Respond ONLY with a valid JSON object containing exactly two keys: 'exhibition_title' and 'introduction'."
            intro_user = f"Theme: {request.theme_data}\n\nWrite a poetic exhibition title and a deep, philosophical 2-paragraph introduction for this art collection."
            
            intro_response = await client.post(
                "http://localhost:11434/api/chat",
                json={
                    "model": "llama3",
                    "messages": [{"role": "system", "content": intro_system}, {"role": "user", "content": intro_user}],
                    "stream": False,
                    "format": "json"
                }
            )
            intro_response.raise_for_status()
            
            try:
                intro_data = json.loads(intro_response.json()["message"]["content"])
            except Exception:
                intro_data = {}
                
            final_curation = {
                "exhibition_title": intro_data.get("exhibition_title", "An Exploration of Form and Concept"),
                "introduction": intro_data.get("introduction", "Welcome to this curated selection of aesthetic expressions..."),
                "sections": []
            }
            
            # STEP 2: MICRO CURATION (Vision Model per Artwork)
            # Loop through images sequentially, passing 1 image at a time to llama3.2-vision
            for s_idx, original_section in enumerate(selection_data):
                new_section = {
                    "title": original_section.get("title", f"Section {s_idx + 1}"),
                    "description": original_section.get("description", ""),
                    "artworks": []
                }
                
                for a_idx, img_url in enumerate(original_section.get("selected_images", [])):
                    print(f"Visually analyzing image {a_idx + 1} for {new_section['title']}...")
                    try:
                        # Fetch Base64
                        fetch_url = img_url.replace("localhost", "127.0.0.1")
                        img_response = await client.get(fetch_url)
                        img_response.raise_for_status()
                        b64_str = base64.b64encode(img_response.content).decode("utf-8")
                        
                        vision_system = "You are a master art curator. Respond ONLY with a valid JSON object containing exactly two keys: 'artwork_title' and 'artwork_description'."
                        vision_user = (
                            f"This artwork belongs to the exhibition section: '{new_section['title']}'.\n"
                            "1. Create a highly unique, metaphorical 'artwork_title' for this specific piece. DO NOT reuse the section title. Avoid cliché art words like 'Ephemeral', 'Resonance', or 'Whispers'.\n"
                            "2. Write a philosophical 'artwork_description' analyzing its visual elements.\n"
                            "CRITICAL RULES:\n"
                            "- Keep it STRICTLY between 4 to 5 sentences.\n"
                            "- DO NOT start the description with 'This piece, [Title], ...' or 'This artwork...'. Start directly with the visual analysis.\n"
                            "- DO NOT include the artwork title in the description body.\n"
                            "- DO NOT mention it is AI generated."
                        )
                        
                        vision_response = await client.post(
                            "http://localhost:11434/api/chat",
                            json={
                                "model": "llama3.2-vision",
                                "messages": [
                                    {"role": "system", "content": vision_system},
                                    {"role": "user", "content": vision_user, "images": [b64_str]}
                                ],
                                "stream": False,
                                "format": "json",
                                "options": {
                                    "temperature": 0.4, # Lower temp to prevent repetitive hallucination loops
                                    "num_predict": 300  # Hard token limit to strictly prevent overkill lengths
                                }
                            }
                        )
                        vision_response.raise_for_status()
                        content_str = vision_response.json()["message"]["content"]
                        
                        try:
                            art_data = json.loads(content_str)
                        except json.JSONDecodeError as json_err:
                            print(f"Minor JSON formatting error from Vision model. Activating Salvage Protocol... Details: {json_err}")
                            import re
                            art_data = {}
                            
                            title_match = re.search(r'"artwork_title"\s*:\s*"(.*?)(?<!\\)"', content_str)
                            if title_match:
                                art_data["artwork_title"] = title_match.group(1)
                                
                            desc_match = re.search(r'"artwork_description"\s*:\s*"([\s\S]*?)(?:"\s*,|"\s*\}|"\s*\]|$)', content_str)
                            if desc_match:
                                art_data["artwork_description"] = desc_match.group(1).strip()
                        
                        new_section["artworks"].append({
                            "url": img_url,
                            "artwork_title": art_data.get("artwork_title", "Untitled Aesthetic"),
                            "artwork_description": art_data.get("artwork_description", "A profound visual exploration.")
                        })
                    except Exception as e:
                        print(f"Failed to analyze image: {e}")
                        new_section["artworks"].append({
                            "url": img_url,
                            "artwork_title": "Untitled Aesthetic",
                            "artwork_description": "A profound visual exploration."
                        })
                    
                final_curation["sections"].append(new_section)

            return {"status": "success", "curation": final_curation}

    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Failed to connect to Ollama: {e}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"Failed to parse JSON response from Ollama. The model might have returned invalid JSON. Content: {content_str}")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")