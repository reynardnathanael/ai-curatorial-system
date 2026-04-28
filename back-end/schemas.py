from pydantic import BaseModel, Field
from typing import Optional, List

class ThemeGenerationRequest(BaseModel):
    """
    The initial request from the user containing the exhibition concepts.
    """
    theme: str = Field(..., description="The high-level theme (e.g., 'memory, loneliness, future city')")
    mood: Optional[str] = Field(None, description="Desired mood or atmosphere")
    style: Optional[str] = Field(None, description="Desired visual style or art movement")
    num_sections: int = Field(default=3, ge=1, le=10, description="Number of sections in the exhibition")

class SubTheme(BaseModel):
    title: str = Field(..., description="Title of the sub-theme")
    description: str = Field(..., description="Curatorial description of the sub-theme")
    image_prompt: str = Field(..., description="A detailed visual prompt for the image generation model (ComfyUI/Stable Diffusion)")

class CuratorialResponse(BaseModel):
    # We will expand this later to include the LLM's expanded themes and prompts
    status: str
    sub_themes: Optional[List[SubTheme]] = None

class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., description="The visual prompt for the image generator")

class ImageGenerationResponse(BaseModel):
    status: str
    message: str
    prompt_id: Optional[str] = None

class ImageStatusResponse(BaseModel):
    status: str = Field(..., description="'pending' if still generating, 'completed' if done.")
    image_url: Optional[str] = Field(None, description="The URL to retrieve the finished image.")