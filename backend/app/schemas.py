from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class FileItem(BaseModel):
    path: str = Field(..., description="Relative POSIX path inside the project root")
    content: str


class GenerateRequest(BaseModel):
    prompt: str
    context: Optional[str] = None


class GenerateResponse(BaseModel):
    files: List[FileItem]
    meta: Dict[str, Any] = {}


class WriteRequest(BaseModel):
    rootDir: str
    files: List[FileItem]


