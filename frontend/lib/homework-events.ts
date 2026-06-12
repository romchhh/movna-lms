/** Сигнал для оновлення лічильників ДЗ у сайдбарі після дій користувача. */
export const HOMEWORK_UPDATED_EVENT = 'movna:homework-updated'

export function notifyHomeworkUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(HOMEWORK_UPDATED_EVENT))
  }
}
