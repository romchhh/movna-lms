from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User, UserRole
from app.routers.student_optimate import _resolve_student_id
from app.schemas.teacher_student_links import StudentLearningResourcesOut
from app.services.teacher_student_links import get_student_learning_resources

router = APIRouter()


@router.get("/learning-resources", response_model=StudentLearningResourcesOut)
async def student_learning_resources(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    student_id = await _resolve_student_id(current_user, db)
    return await get_student_learning_resources(db, student_id)
