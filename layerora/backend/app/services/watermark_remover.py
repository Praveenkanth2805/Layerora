import io
import os
import cv2
import numpy as np
from PIL import Image, ImageOps


class WatermarkRemoverService:

    # ===================== ENVIRONMENT HELPERS =====================
    def _env_int(self, name, default, minimum=None, maximum=None):
        try:
            value = int(os.getenv(name, default))
        except (TypeError, ValueError):
            value = default
        if minimum is not None:
            value = max(minimum, value)
        if maximum is not None:
            value = min(maximum, value)
        return value

    def _env_float(self, name, default, minimum=None, maximum=None):
        try:
            value = float(os.getenv(name, default))
        except (TypeError, ValueError):
            value = default
        if minimum is not None:
            value = max(minimum, value)
        if maximum is not None:
            value = min(maximum, value)
        return value

    # ===================== MASK CREATION (YOUR STROKES) =====================
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
                cv2.line(mask, start, end, 255, brush_size, cv2.LINE_AA)

            for point in scaled:
                cv2.circle(mask, point, brush_size // 2, 255, -1, cv2.LINE_AA)

        # close_size = self._env_int("WATERMARK_MASK_CLOSE_SIZE", 1, 1, 15)
        close_size = 1
        kernel = np.ones((close_size, close_size), np.uint8)
        return cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    # ===================== GRABCUT: PERFECT MASK WITH SHADOW =====================
    def _get_grabcut_mask(self, image_cv, strokes, image_size):
        """
        Uses GrabCut to refine the rough stroke mask.
        This detects the exact watermark boundary including semi-transparent shadows.
        """
        # 1. Get rough mask from user strokes
        rough_mask = self.create_mask(image_size, strokes)
        if not np.any(rough_mask):
            return rough_mask

        # 2. Prepare GrabCut mask
        grabcut_mask = np.zeros(image_cv.shape[:2], dtype=np.uint8)

        # Definite Foreground (what you painted)
        grabcut_mask[rough_mask > 0] = cv2.GC_FGD

        # Probable Background (area just outside your strokes - helps GrabCut find edges)
        kernel = np.ones((15, 15), np.uint8)
        dilated = cv2.dilate(rough_mask, kernel, iterations=1)
        grabcut_mask[(dilated > 0) & (rough_mask == 0)] = cv2.GC_PR_BGD

        # Bounding rectangle (required by GrabCut)
        y_indices, x_indices = np.where(rough_mask > 0)
        if len(x_indices) == 0:
            return rough_mask

        x, y, w, h = cv2.boundingRect(np.column_stack((x_indices, y_indices)).astype(np.int32))
        rect = (x, y, w, h)

        # 3. Run GrabCut (5 iterations)
        bgd_model = np.zeros((1, 65), np.float64)
        fgd_model = np.zeros((1, 65), np.float64)
        cv2.grabCut(
            image_cv,
            grabcut_mask,
            rect,
            bgd_model,
            fgd_model,
            5,
            cv2.GC_INIT_WITH_MASK  # Use our mask instead of just the rect
        )

        # 4. Extract the perfect mask (Foreground + Probable Foreground)
        final_mask = np.where(
            (grabcut_mask == cv2.GC_FGD) | (grabcut_mask == cv2.GC_PR_FGD),
            255,
            0
        ).astype(np.uint8)

        return final_mask

    # ===================== (OPTIONAL) PATCH RECONSTRUCTION – KEPT FOR COMPATIBILITY =====================
    def _patch_score(self, source, target, mask, x, y, patch_size):
        half = patch_size // 2
        h, w = source.shape[:2]
        if x - half < 0 or y - half < 0 or x + half >= w or y + half >= h:
            return None
        patch_mask = mask[y - half:y + half + 1, x - half:x + half + 1]
        if np.any(patch_mask > 0):
            return None
        source_patch = source[y - half:y + half + 1, x - half:x + half + 1]
        known = target[y - half:y + half + 1, x - half:x + half + 1]
        known_mask = patch_mask == 0
        if np.count_nonzero(known_mask) < patch_size * patch_size * 0.2:
            return None
        diff = source_patch.astype(np.float32) - known.astype(np.float32)
        diff = np.mean(np.abs(diff), axis=2)
        return float(np.mean(diff[known_mask]))

    def _find_best_patch(self, image, result, mask, x, y, patch_size, search_radius):
        h, w = image.shape[:2]
        half = patch_size // 2
        best_score = float("inf")
        best_position = None
        step = max(1, patch_size // 3)
        x1 = max(half, x - search_radius)
        x2 = min(w - half - 1, x + search_radius)
        y1 = max(half, y - search_radius)
        y2 = min(h - half - 1, y + search_radius)
        for sy in range(y1, y2 + 1, step):
            for sx in range(x1, x2 + 1, step):
                if abs(sx - x) < patch_size and abs(sy - y) < patch_size:
                    continue
                score = self._patch_score(image, result, mask, sx, sy, patch_size)
                if score is not None and score < best_score:
                    best_score = score
                    best_position = (sx, sy)
        return best_position

    def _texture_reconstruct(self, image, mask):
        # patch_size = self._env_int("WATERMARK_PATCH_SIZE", 15, 5, 51)
        # if patch_size % 2 == 0:
        #     patch_size += 1
        # search_radius = self._env_int("WATERMARK_SEARCH_RADIUS", 80, 20, 300)
        # iterations = self._env_int("WATERMARK_PATCH_ITERATIONS", 2, 0, 10)
        patch_size = 25
        search_radius = 200
        iterations = 4

        result = image.copy()

        if iterations == 0:
            return result

        ys, xs = np.where(mask > 0)
        if len(xs) == 0:
            return result

        x_min = max(0, int(xs.min()) - patch_size)
        x_max = min(image.shape[1] - 1, int(xs.max()) + patch_size)
        y_min = max(0, int(ys.min()) - patch_size)
        y_max = min(image.shape[0] - 1, int(ys.max()) + patch_size)

        working_mask = mask.copy()

        for _ in range(iterations):
            current_mask = working_mask.copy()
            contours, _ = cv2.findContours(current_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            boundary = np.zeros_like(current_mask)
            for contour in contours:
                cv2.drawContours(boundary, [contour], -1, 255, 1)

            boundary_points = np.column_stack(np.where(boundary > 0))
            if len(boundary_points) == 0:
                break

            for y, x in boundary_points:
                if x < x_min or x > x_max or y < y_min or y > y_max:
                    continue
                best = self._find_best_patch(image, result, current_mask, x, y,
                                             patch_size, search_radius)
                if best is None:
                    continue
                sx, sy = best
                half = patch_size // 2
                src = image[sy - half:sy + half + 1, sx - half:sx + half + 1]
                dst_y1 = max(0, y - half)
                dst_y2 = min(image.shape[0], y + half + 1)
                dst_x1 = max(0, x - half)
                dst_x2 = min(image.shape[1], x + half + 1)

                src_y1 = half - (y - dst_y1)
                src_y2 = src_y1 + (dst_y2 - dst_y1)
                src_x1 = half - (x - dst_x1)
                src_x2 = src_x1 + (dst_x2 - dst_x1)

                dst = result[dst_y1:dst_y2, dst_x1:dst_x2]
                src_crop = src[src_y1:src_y2, src_x1:src_x2]
                local_mask = current_mask[dst_y1:dst_y2, dst_x1:dst_x2]
                replace = local_mask > 0
                dst[replace] = src_crop[replace]
                result[dst_y1:dst_y2, dst_x1:dst_x2] = dst

            new_mask = cv2.erode(current_mask, np.ones((3, 3), np.uint8), iterations=1)
            working_mask = new_mask
            if not np.any(working_mask):
                break

        return result

    def _blend_result(self, original, reconstructed, mask):
        # feather = self._env_int("WATERMARK_BLEND_SIZE", 7, 1, 61)
        feather = 7
        if feather % 2 == 0:
            feather += 1

        soft_mask = cv2.GaussianBlur(mask, (feather, feather), 0).astype(np.float32) / 255.0
        soft_mask = soft_mask[..., None]

        result = (reconstructed.astype(np.float32) * soft_mask +
                  original.astype(np.float32) * (1.0 - soft_mask))
        return np.clip(result, 0, 255).astype(np.uint8)

    # ===================== MAIN REMOVE METHOD (UPDATED WITH GRABCUT) =====================
    def remove(self, image_bytes, strokes):
        """
        Exact mask (no dilation) – GrabCut will automatically detect the glow.
        """
        # 1. Load image
        image = Image.open(io.BytesIO(image_bytes))
        image = ImageOps.exif_transpose(image).convert("RGB")
        original_width, original_height = image.size

        image_array = np.array(image)
        image_cv = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)

        # 2. GrabCut – இது உங்கள் strokes-ஐ வைத்து glow-ஐ தானாக பிடிக்கும்
        mask = self._get_grabcut_mask(image_cv, strokes, (original_width, original_height))
        if not np.any(mask):
            # Fallback: raw strokes
            mask = self.create_mask((original_width, original_height), strokes)

        if not np.any(mask):
            raise ValueError("Watermark selection is empty. Please draw over the watermark.")

        # 3. NO DILATION – mask-ஐ அப்படியே வைத்துக்கொள்
        #    (இங்கு நீங்கள் dilation செய்யவில்லை)
        
        # 4. Texture Reconstruction (patch-based) – blur ஆகாது
        reconstructed = self._texture_reconstruct(image_cv, mask)

        # 5. Light inpaint to blend seams (radius=3)
        result = cv2.inpaint(reconstructed, mask, 3.0, cv2.INPAINT_TELEA)

        # 6. Return result
        result_rgb = cv2.cvtColor(result, cv2.COLOR_BGR2RGB)
        output = Image.fromarray(result_rgb)

        buffer = io.BytesIO()
        output.save(buffer, format="PNG", optimize=False)
        return buffer.getvalue()
    