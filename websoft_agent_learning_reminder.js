/**
 * Агент уведомлений о незавершенном обучении для WebTutor
 * Описание: Ежедневно собирает информацию по сотрудникам с незавершенными
 * курсами и тестами, отправляет персонализированные уведомления.
 */

// ================== КОНФИГУРАЦИЯ ==================

// Код типа уведомления (должен быть создан в каталоге "Типы уведомлений")
var NOTIFICATION_TYPE_CODE = "learning_reminder"; // дизайнер - системы уведомлений - типы уведомлений

// ID шаблона уведомления
var NOTIFICATION_TEMPLATE_ID = 7544887806408730183; // дизайнер - системы уведомлений - шаблоны уведомлений

// ================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==================

// Кэш для хранения данных сотрудников
var collaboratorCache = new Array();

// Глобальные переменные для работы с кэшем
var cacheIndex;
var currentCacheItem;
var newCacheItem;

// Глобальные переменные для группировки
var groupKey;
var newGroup;
var collaboratorGroup;

/**
 * Функция для поиска или создания группы сотрудника в groupedByCollaborator
 * @param {object} groupedObj - объект группировки
 * @param {string} personId - ID сотрудника
 * @param {string} fullname - имя сотрудника
 * @returns {object} - найденная или созданная группа
 */
function findOrCreateCollaboratorGroup(groupedObj, personId, fullname) {
  // Ищем существующую группу для данного сотрудника
  for (groupKey in groupedObj) {
    if (groupedObj[groupKey].personId == personId) {
      return groupedObj[groupKey];
    }
  }

  // Если группа не найдена, создаем новую
  newGroup = new Object();
  newGroup.personId = personId;
  newGroup.fullname = fullname;
  newGroup.courses = new Array();
  newGroup.tests = new Array();

  // Добавляем в объект группировки
  groupKey = "collab_" + personId;
  groupedObj[groupKey] = newGroup;

  return newGroup;
}

/**
 * Функция логирования
 * @param {string} message - сообщение для логирования
 */
function logMessage(message) {
  alert("LearningReminder: " + message);
}

/**
 * Проверяет, является ли сотрудник активным (не уволенным)
 * Использует кэширование для избежания повторных запросов к базе данных
 * @param {string} personId - ID сотрудника
 * @returns {object|null} - объект сотрудника или null
 */
function getActiveCollaborator(personId) {
  try {
    // Проверяем кэш
    for (
      cacheIndex = 0;
      cacheIndex < ArrayCount(collaboratorCache);
      cacheIndex++
    ) {
      currentCacheItem = collaboratorCache[cacheIndex];
      if (currentCacheItem.personId == personId) {
        return currentCacheItem.data;
      }
    }

    // Если данных нет в кэше, выполняем запрос к базе данных
    xqCollab =
      "for $c in collaborators where $c/id = " +
      XQueryLiteral(personId) +
      " and $c/is_dismiss = 0 return $c/Fields('id', 'fullname')";
    arrCollab = XQuery(xqCollab);

    var result = null;
    if (ArrayCount(arrCollab) > 0) {
      for (collaboratorObj in arrCollab) {
        result = new Object();

        try {
          result.id = String(collaboratorObj.id);
        } catch (e) {
          result.id = personId;
        }

        try {
          result.fullname = String(collaboratorObj.fullname);
        } catch (e) {
          result.fullname = "Неизвестный сотрудник";
        }

        break; // Выходим после первого найденного сотрудника
      }
    }

    // Сохраняем результат в кэше (даже если null)
    newCacheItem = new Object();
    newCacheItem.personId = personId;
    newCacheItem.data = result;
    collaboratorCache.push(newCacheItem);

    return result;
  } catch (e) {
    return null;
  }
}

// ================== ОСНОВНОЙ КОД АГЕНТА ==================

try {
  logMessage("Старт агента уведомлений о незавершенном обучении");

  totalNotificationsSent = 0;

  logMessage("Поиск незавершенных курсов...");
  xqCourses =
    "for $al in active_learnings " +
    "where $al/state_id != 2 and $al/person_id != '' " +
    "return $al/Fields('person_id', 'course_name')";

  coursesArray = XQuery(xqCourses);
  logMessage("Найдено " + ArrayCount(coursesArray) + " незавершенных курсов");

  logMessage("Поиск незавершенных тестов...");
  xqTests =
    "for $atl in active_test_learnings " +
    "where $atl/state_id != 2 and $atl/person_id != '' " +
    "return $atl/Fields('person_id', 'assessment_name')";

  testsArray = XQuery(xqTests);
  logMessage("Найдено " + ArrayCount(testsArray) + " незавершенных тестов");

  if (ArrayCount(coursesArray) == 0 && ArrayCount(testsArray) == 0) {
    logMessage("Активные незавершенные обучения не найдены. Завершение работы");
    return;
  }

  logMessage("Группировка данных по сотрудникам...");
  groupedByCollaborator = new Object();

  logMessage("Начинаем обработку курсов, найдено: " + ArrayCount(coursesArray));

  courseProcessed = 0;
  for (course in coursesArray) {
    courseProcessed++;

    try {
      try {
        personId = String(course.person_id);
      } catch (e) {
        personId = "";
      }

      try {
        courseName = String(course.course_name);
      } catch (e) {
        courseName = "";
      }

      if (personId == "" || courseName == "") {
        continue;
      }

      collaborator = getActiveCollaborator(personId);
      if (collaborator == null) {
        continue;
      }

      // Находим или создаем группу для данного сотрудника
      collaboratorGroup = findOrCreateCollaboratorGroup(
        groupedByCollaborator,
        personId,
        collaborator.fullname
      );

      // Добавляем курс к группе сотрудника
      collaboratorGroup.courses.push(courseName);
    } catch (courseErr) {
      // Пропускаем ошибочные записи
    }
  }

  logMessage("Завершена обработка курсов. Обработано: " + courseProcessed);

  logMessage("Начинаем обработку тестов, найдено: " + ArrayCount(testsArray));

  testProcessed = 0;
  for (test in testsArray) {
    testProcessed++;

    try {
      try {
        personId = String(test.person_id);
      } catch (e) {
        personId = "";
      }

      try {
        testName = String(test.assessment_name);
      } catch (e) {
        testName = "";
      }

      if (personId == "" || testName == "") {
        continue;
      }

      collaborator = getActiveCollaborator(personId);
      if (collaborator == null) {
        continue;
      }

      // Находим или создаем группу для данного сотрудника
      collaboratorGroup = findOrCreateCollaboratorGroup(
        groupedByCollaborator,
        personId,
        collaborator.fullname
      );

      // Добавляем тест к группе сотрудника
      collaboratorGroup.tests.push(testName);
    } catch (testErr) {
      // Пропускаем ошибочные записи
    }
  }

  logMessage("Завершена обработка тестов. Обработано: " + testProcessed);

  collaboratorsCount = 0;
  for (personId in groupedByCollaborator) {
    collaboratorsCount++;
  }
  logMessage(
    "Сгруппировано сотрудников с незавершенными обучениями: " +
      collaboratorsCount
  );

  logMessage("Начинаем отправку уведомлений...");
  logMessage("Найдено сотрудников для уведомления: " + collaboratorsCount);

  notificationsSentCount = 0;
  for (collaboratorId in groupedByCollaborator) {
    try {
      collaboratorData = groupedByCollaborator[collaboratorId];

      notificationText = "Здравствуйте, " + collaboratorData.fullname + "!\n\n";
      notificationText += "Напоминаем вам о незавершенном обучении:\n\n";

      if (ArrayCount(collaboratorData.courses) > 0) {
        notificationText += "Незавершенные курсы:\n";
        for (courseName in collaboratorData.courses) {
          notificationText += "• " + courseName + "\n";
        }
        notificationText += "\n";
      }

      if (ArrayCount(collaboratorData.tests) > 0) {
        notificationText += "Незавершенные тесты:\n";
        for (testName in collaboratorData.tests) {
          notificationText += "• " + testName + "\n";
        }
        notificationText += "\n";
      }

      notificationText += "Пожалуйста, завершите обучение в ближайшее время.\n";
      notificationText +=
        "За дополнительной информацией обращайтесь к специалистам отдела обучения.";

      // Используем шаблон если он найден
      if (NOTIFICATION_TEMPLATE_ID != null) {
        tools.create_notification(
          NOTIFICATION_TYPE_CODE,
          collaboratorData.personId,
          notificationText,
          null,
          null,
          null,
          null,
          null,
          "",
          NOTIFICATION_TEMPLATE_ID
        );
      } else {
        // Отправляем без шаблона
        tools.create_notification(
          NOTIFICATION_TYPE_CODE,
          collaboratorData.personId,
          notificationText,
          null
        );
      }

      notificationsSentCount++;
      totalNotificationsSent++;
    } catch (notificationErr) {
      // Пропускаем ошибки отправки уведомлений
    }
  }

  logMessage(
    "Завершена отправка уведомлений. Отправлено: " + notificationsSentCount
  );

  logMessage("Отправлено уведомлений: " + totalNotificationsSent);
  logMessage("Агент завершен успешно");
} catch (criticalErr) {
  logMessage("КРИТИЧЕСКАЯ ОШИБКА в агенте уведомлений: " + criticalErr);
  try {
    ERROR = criticalErr;
  } catch (e) {}
}
