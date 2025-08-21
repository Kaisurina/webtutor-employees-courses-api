# Controllers

Эта папка содержит контроллеры для веб-шаблонов WebTutor.

## Файлы

- collaborators.controller.ts - API для работы с сотрудниками

## Collaborators Controller

REST API для управления сотрудниками и курсами.

### Эндпоинты

1. Получение списка подчиненных

   - URL: GET /?action=get_subordinates
   - Параметры: fullname, page, pageSize
   - Возвращает: список сотрудников с пагинацией

2. Получение карточки сотрудника

   - URL: GET /?action=get_collaborator_card
   - Параметры: id
   - Возвращает: данные сотрудника

3. Получение курсов сотрудника

   - URL: GET /?action=get_collaborator_courses
   - Параметры: id
   - Возвращает: список курсов

4. Назначение курса
   - URL: POST /?action=assign_course
   - Body: collaborator_id, course_id
   - Возвращает: ID назначения

### Типы данных

Импортируются из core.types.ts:

- Collaborator - основная информация о сотруднике
- CollaboratorCard - карточка с аватаром
- CourseRow - информация о курсе
- ActiveLearningDocument - документ WebTutor

### Безопасность

- Валидация параметров
- Экранирование SQL запросов
- Проверка прав через func_managers
- Логирование операций
