"""Labels and constants for Optimate API enums."""

PRODUCT_TYPE_LABELS: dict[int, str] = {
    1: "Індивідуальні",
    2: "Групові",
    3: "Speaking Club",
    4: "Парні",
}

TRANSACTION_TYPE_LABELS: dict[int, str] = {
    1: "Купівля пакету",
    2: "Скасування списання",
    3: "Пробачення боргу",
    4: "Згорання уроків",
    5: "Списання за урок",
    6: "Погашення боргу",
    7: "Списання школою",
    8: "Повернення оплати",
}

# Types that add lessons to balance
TRANSACTION_CREDIT_TYPES = {1, 2, 3, 6, 8}
TRANSACTION_DEBIT_TYPES = {4, 5, 7}

TEACHER_TRANSACTION_TYPE_LABELS: dict[int, str] = {
    1: "Нарахування за урок",
    2: "Виплата / інвойс",
}

LESSON_CANCELLATION_REASONS: list[dict[str, str]] = [
    {"code": "student_illness", "label": "Хвороба учня"},
    {"code": "teacher_illness", "label": "Хвороба викладача"},
    {"code": "student_request", "label": "Запит учня"},
    {"code": "teacher_request", "label": "Запит викладача"},
    {"code": "schedule_conflict", "label": "Конфлікт розкладу"},
    {"code": "technical", "label": "Технічні причини"},
    {"code": "other", "label": "Інше"},
]

# Причини, коли заняття не відбулось (як у Optimate при відмітці)
LESSON_NOT_HELD_REASONS: list[dict[str, str | int]] = [
    {"code": "student_absent", "label": "Студент відсутній", "optimate_reason": 1},
    {"code": "cancelled_by_teacher", "label": "Скасовано вчителем", "optimate_reason": 2},
    {"code": "cancelled_by_student_on_time", "label": "Скасовано студентом вчасно", "optimate_reason": 3},
    {"code": "cancelled_by_student_late", "label": "Скасовано студентом невчасно", "optimate_reason": 4},
    {"code": "force_majeure", "label": "Форс-мажор", "optimate_reason": 5},
]

LESSON_MARK_OUTCOMES = frozenset({"cancelled_planned", "completed", "not_held"})

EVENT_TYPE_LABELS: dict[int, str] = {
    1: "Урок",
}

COMPLETION_LABELS: dict[str, str] = {
    "completed": "Проведено",
    "cancelled": "Скасовано",
    "planned": "Заплановано",
}

SCHEDULE_DAY_LABELS: dict[int, str] = {
    1: "Понеділок",
    2: "Вівторок",
    3: "Середа",
    4: "Четвер",
    5: "П'ятниця",
    6: "Субота",
    7: "Неділя",
}

SCHEDULE_DAY_SHORT: dict[int, str] = {
    1: "Пн",
    2: "Вт",
    3: "Ср",
    4: "Чт",
    5: "Пт",
    6: "Сб",
    7: "Нд",
}

PRODUCT_TYPE_COLORS: dict[int, str] = {
    1: "individual",
    2: "group",
    3: "speaking_club",
    4: "pair",
}
