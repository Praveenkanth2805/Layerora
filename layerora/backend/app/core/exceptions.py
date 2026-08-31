from fastapi import HTTPException, status

class LayeroraException(HTTPException):
    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)

class InsufficientCreditsError(LayeroraException):
    def __init__(self):
        super().__init__(status_code=402, detail="Insufficient credits")

class NotFoundError(LayeroraException):
    def __init__(self, resource: str):
        super().__init__(status_code=404, detail=f"{resource} not found")

class ForbiddenError(LayeroraException):
    def __init__(self):
        super().__init__(status_code=403, detail="You do not have permission")