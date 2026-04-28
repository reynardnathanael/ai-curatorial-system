from fastapi import FastAPI, HTTPException
import httpx
import json
import random

from schemas import ThemeGenerationRequest, CuratorialResponse, ImageGenerationRequest, ImageGenerationResponse, ImageStatusResponse

app = FastAPI(
    title="AI Curatorial System API",
    description="Backend for coordinating LLM (Ollama) and Image Generation (ComfyUI)",
    version="0.1.0"
)

@app.get("/")
async def root():
    return {"message": "Welcome to the AI Curatorial System API"}

@app.post("/api/curate/expand-theme", response_model=CuratorialResponse)
async def expand_theme(request: ThemeGenerationRequest):
    """
    Endpoint to receive user themes and communicate with Ollama to expand them 
    into detailed prompts and sub-themes.
    """
    # Formulate a prompt for the LLM based on user input
    prompt = f"You are an expert art curator. Expand the following exhibition theme into exactly {request.num_sections} distinct sub-themes.\n"
    prompt += f"Theme: '{request.theme}'\n"
    if request.mood:
        prompt += f"Mood/Atmosphere: '{request.mood}'\n"
    if request.style:
        prompt += f"Visual Style: '{request.style}'\n"
    
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
    """
    Endpoint to trigger image generation in ComfyUI based on a text prompt.
    """
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
    """
    Check the status of an image generation task in ComfyUI using the prompt_id.
    """
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