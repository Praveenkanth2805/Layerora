from sqlalchemy.ext.asyncio import AsyncSession
from app.models.design import Design
from app.models.layer import Layer
from app.schemas.design import DesignCreate, LayerCreate
import uuid

class DesignService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_design(self, user_id: str, data: DesignCreate) -> Design:
        design = Design(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=data.name,
            canvas_width=data.canvas_width,
            canvas_height=data.canvas_height,
        )
        self.db.add(design)
        await self.db.commit()
        await self.db.refresh(design)
        return design

    async def add_layer(self, design_id: str, layer_data: LayerCreate) -> Layer:
        layer = Layer(
            id=str(uuid.uuid4()),
            design_id=design_id,
            layer_type=layer_data.layer_type,
            name=layer_data.name,
            properties=layer_data.properties,
            object_key=layer_data.object_key,
            text_content=layer_data.text_content,
            font_family=layer_data.font_family,
            font_size=layer_data.font_size,
            color=layer_data.color,
        )
        self.db.add(layer)
        await self.db.commit()
        await self.db.refresh(layer)
        return layer