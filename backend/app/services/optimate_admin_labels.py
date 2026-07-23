"""Labels for Optimate admin entities."""

STUDENT_STATUS_LABELS: dict[int, str] = {
    1: "Активний",
    2: "Архів",
    3: "Новий",
    4: "На паузі",
    5: "Лист очікування",
}

TEACHER_STATUS_LABELS: dict[int, str] = {
    1: "Працює",
    2: "Архів",
    3: "Новий",
    4: "У відпустці",
    5: "Лист очікування",
    6: "Хворіє",
}

SKILL_LEVEL_LABELS: dict[int, str] = {
    1: "A0",
    2: "A1",
    3: "A1+",
    4: "A2",
    5: "A2+",
    6: "B1",
    7: "B1+",
    8: "B2",
    9: "B2+",
    10: "C1",
    11: "C2",
    12: "C1+",
    13: "C2+",
}

AUTH_STATUS_LABELS: dict[int, str] = {
    1: "Без доступу",
    2: "Запрошено",
    3: "Зареєстрований",
}

NOTE_TYPE_LABELS: dict[int, str] = {
    1: "Загальна",
    2: "Оплата",
    3: "Навчання",
    4: "Адміністративна",
    5: "Системна",
}

STUDENT_LIST_INCLUDE = "contacts,products,products.financial,products.teachers,teachers,notes"
STUDENT_DETAIL_INCLUDE = (
    "externalReferences,notes,contacts,products,products.financial,"
    "products.lessons,products.teachers,products.groups,products.pairStudent,teachers"
)
TEACHER_LIST_INCLUDE = "contacts,stats,products,products.financial"
TEACHER_DETAIL_INCLUDE = "contacts,stats,teacherAccess,products,products.financial"
TEACHER_STUDENTS_INCLUDE = "contacts,products,products.financial,products.teachers,teachers"
TEACHER_STUDENT_DETAIL_INCLUDE = (
    "contacts,products,products.financial,products.teachers,teachers,notes"
)
EVENT_LIST_INCLUDE = "students,products,teachers"

GROUP_STATUS_LABELS: dict[int, str] = {
    1: "Активна",
    2: "Архів",
    3: "Формується",
}

TEACHER_GROUPS_INCLUDE = "products,teachers,schedules,stats,levels"
GROUP_STUDENTS_INCLUDE = "contacts,financial"
PROFILE_INCLUDE = "contacts"
