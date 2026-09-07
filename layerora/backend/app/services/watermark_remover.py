import io
import cv2
import numpy as np
from PIL import Image, ImageOps


class WatermarkRemoverService:
    def create_mask(self, image_size, strokes):
        width, height = image_size
        mask = np.zeros((height, width), dtype=np.uint8)

        for stroke in strokes:
            points = stroke.get("points", [])
            brush_size = max(4, min(int(stroke.get("size", 32)), 300))

            if len(points) < 2:
                continue

            scaled = [
                (
                    max(0, min(width - 1, int(point["x"]))),
                    max(0, min(height - 1, int(point["y"]))),
                )
                for point in points
            ]

            for start, end in zip(scaled, scaled[1:]):
                cv2.line(
                    mask,
                    start,
                    end,
                    255,
                    brush_size,
                    cv2.LINE_AA,
                )

            for point in scaled:
                cv2.circle(
                    mask,
                    point,
                    brush_size // 2,
                    255,
                    -1,
                    cv2.LINE_AA,
                )

        kernel = np.ones((3, 3), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

        return mask

    def remove(self, image_bytes, strokes):
        image = Image.open(io.BytesIO(image_bytes))
        image = ImageOps.exif_transpose(image).convert("RGB")

        original_width, original_height = image.size

        image_array = np.array(image)
        image_cv = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)

        mask = self.create_mask(
            (original_width, original_height),
            strokes,
        )

        if not np.any(mask):
            raise ValueError("Watermark selection is empty")

        mask = cv2.dilate(
            mask,
            np.ones((3, 3), np.uint8),
            iterations=1,
        )

        result = cv2.inpaint(
            image_cv,
            mask,
            3,
            cv2.INPAINT_TELEA,
        )

        result_rgb = cv2.cvtColor(result, cv2.COLOR_BGR2RGB)

        output = Image.fromarray(result_rgb)

        buffer = io.BytesIO()
        output.save(
            buffer,
            format="PNG",
            optimize=False,
        )

        return buffer.getvalue()