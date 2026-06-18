const UK_DAY_LONG = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота']
const UK_MONTH = [
  'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
  'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
]

export function formatTodayLabelUk(date = new Date()) {
  return `${UK_DAY_LONG[date.getDay()]}, ${date.getDate()} ${UK_MONTH[date.getMonth()]} ${date.getFullYear()}`
}
