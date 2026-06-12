/** Zip parallel id/name arrays from Optimate list payloads. */

export function zipIdsAndNames(
  ids: string[] | undefined,
  names: string[] | undefined,
  fallbackName = '—',
): { id: string; name: string }[] {
  const idList = ids ?? []
  const nameList = names ?? []
  const count = Math.max(idList.length, nameList.length)
  const out: { id: string; name: string }[] = []

  for (let i = 0; i < count; i++) {
    const id = idList[i] ?? ''
    const name = (nameList[i] ?? '').trim()
    if (!id && !name) continue
    out.push({ id, name: name || fallbackName })
  }
  return out
}

export function zipStudentTeachers(student: {
  teacher_ids?: string[]
  teacher_names?: string[]
}): { id: string; name: string }[] {
  return zipIdsAndNames(student.teacher_ids, student.teacher_names, 'Викладач')
}
