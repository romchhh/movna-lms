# Legacy course/homework/schedule tables remain for future local LMS features;
# live data comes from Optimate via *\_optimate routers.
from app.models.user import User, UserRole
from app.models.course import Course, Module, Lesson, LessonProgress, LessonStatus, GroupEnrollment
from app.models.homework import Homework, HomeworkTask, HomeworkStatus
from app.models.schedule import ScheduledClass, ClassEnrollment, LessonBalance, ClassType
from app.models.lesson_request import LessonRequest, LessonRequestType, LessonRequestStatus
from app.models.event_homework import (
    EventHomeworkAssignment,
    EventHomeworkSubmission,
    EventHomeworkSubmissionStatus,
)

__all__ = [
    "User", "UserRole",
    "Course", "Module", "Lesson", "LessonProgress", "LessonStatus", "GroupEnrollment",
    "Homework", "HomeworkTask", "HomeworkStatus",
    "ScheduledClass", "ClassEnrollment", "LessonBalance", "ClassType",
    "LessonRequest", "LessonRequestType", "LessonRequestStatus",
    "EventHomeworkAssignment", "EventHomeworkSubmission", "EventHomeworkSubmissionStatus",
]
