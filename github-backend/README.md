# Airline Rules Database Backend

Этот проект предназначен для автоматического обновления правил онлайн-регистрации 64+ мировых авиакомпаний. Он работает полностью в облаке GitHub Actions и обновляет файл `airlines_data.json` раз в неделю.

## 🚀 Как запустить это на твоем новом GitHub аккаунте:

### Шаг 1: Инициализация репозитория на компьютере
Открой терминал и перейди в эту папку `github-backend`, чтобы залить файлы в твой новый пустой репозиторий:

```bash
cd /Users/ustim/IT/Repositore/check_in_calendar/airline-ticket-scanner/github-backend
git init
git add .
git commit -m "Initial commit of rules backend"
git branch -M main
git remote add origin <ССЫЛКА_НА_ТВОЙ_НОВЫЙ_РЕПОЗИТОРИЙ>
git push -u origin main
```

### Шаг 2: Добавление API Ключей в GitHub
Чтобы робот мог гуглить и анализировать данные, добавь свои ключи в GitHub:
1. Зайди в свой репозиторий на сайте GitHub.
2. Перейди в раздел **Settings** ➔ **Secrets and variables** ➔ **Actions**.
3. Нажми кнопку **New repository secret** и добавь два секрета:
   * **`TAVILY_API_KEY`**: Вставь свой ключ от Tavily (`tvly-dev-DCz5d-...`)
   * **`GEMINI_API_KEY`**: Вставь свой ключ от Google Gemini (`AIzaSyAT3IK...`)

### Шаг 3: Включение прав для Записи (Permissions)
Поскольку робот должен коммитить обновленный файл `airlines_data.json` обратно в репозиторий, дай ему права:
1. Зайди в **Settings** ➔ **Actions** ➔ **General**.
2. Прокрути страницу вниз до раздела **Workflow permissions**.
3. Выбери пункт **Read and write permissions** и нажми **Save**.

### 🎉 Всё готово!
Теперь робот будет просыпаться **каждое воскресенье в 00:00 UTC** и обновлять базу.
Если хочешь запустить проверку прямо сейчас:
1. Зайди во вкладку **Actions** в твоем репозитории на GitHub.
2. Выбери ворклоу **Weekly Airline Rules Update**.
3. Нажми **Run workflow** ➔ **Run workflow**.

Твое мобильное приложение будет скачивать готовый файл по прямой ссылке:
`https://raw.githubusercontent.com/<ИМЯ_ТВОЕГО_НОВОГО_АККАУНТА>/<ИМЯ_РЕПОЗИТОРИЯ>/main/airlines_data.json`
