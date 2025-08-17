import { IncompleteItem, GroupedItems, logWithPrefix } from "./core.types";

// Константы конфигурации
const NOTIFICATION_SUBJECT = "Напоминание о незавершенном обучении";
const IS_DISMISSED_INACTIVE = 0;

/**
 * Основная функция агента.
 */
function runAgent(): void {
  logWithPrefix(
    "NOTIFY_AGENT",
    "info",
    "Старт агента уведомлений о незавершенном обучении"
  );

  try {
    const incompleteItems = getIncompleteItems();
    if (incompleteItems.length === 0) {
      logWithPrefix(
        "NOTIFY_AGENT",
        "info",
        "Незавершенные обучения не найдены. Завершение работы"
      );
      return;
    }

    const groupedByCollaborator = groupItemsByCollaborator(incompleteItems);
    let notificationsSent = 0;
    let notificationsSkipped = 0;

    for (const collaboratorId in groupedByCollaborator) {
      try {
        // Проверяем, не отправляли ли уже уведомление сегодня
        if (wasNotificationSentToday(Number(collaboratorId))) {
          notificationsSkipped++;
          logWithPrefix(
            "NOTIFY_AGENT",
            "debug",
            `Уведомление для сотрудника ID ${collaboratorId} уже отправлено сегодня`
          );
          continue;
        }

        const data = groupedByCollaborator[collaboratorId];
        const message = formatNotificationMessage(
          data.fullname,
          data.courses,
          data.tests
        );

        // Отправка уведомления через API WebTutor
        tools.create_notification({
          recipient_person_id: Number(collaboratorId),
          subject: NOTIFICATION_SUBJECT,
          body: message,
        });

        notificationsSent++;
        logWithPrefix(
          "NOTIFY_AGENT",
          "debug",
          `Уведомление отправлено сотруднику ${data.fullname} (ID: ${collaboratorId})`
        );
      } catch (e) {
        logWithPrefix(
          "NOTIFY_AGENT",
          "error",
          `Ошибка отправки уведомления для ID ${collaboratorId}: ${e.message}`
        );
      }
    }

    logWithPrefix(
      "NOTIFY_AGENT",
      "info",
      `Результат: отправлено ${notificationsSent}, пропущено ${notificationsSkipped} уведомлений`
    );
  } catch (e) {
    logWithPrefix("NOTIFY_AGENT", "error", `Критическая ошибка: ${e.message}`);
  }

  logWithPrefix("NOTIFY_AGENT", "info", "Финиш агента уведомлений");
}

/**
 * Проверяет, было ли уже отправлено уведомление сегодня
 */
function wasNotificationSentToday(collaboratorId: number): boolean {
  const today = new Date().toISOString().split("T")[0];
  const query = `
    SELECT COUNT(*) as count 
    FROM notifications 
    WHERE recipient_id = ${collaboratorId} 
      AND subject = '${NOTIFICATION_SUBJECT}'
      AND DATE(create_date) = '${today}'
  `;

  try {
    const result = tools.xquery<{ count: number }>(query);
    return result[0]?.count > 0;
  } catch (e) {
    logWithPrefix(
      "NOTIFY_AGENT",
      "warn",
      `Не удалось проверить дублирование для ID ${collaboratorId}: ${e.message}`
    );
    return false; // В случае ошибки лучше отправить уведомление
  }
}

/**
 * Получает из БД плоский список всех незавершенных курсов и тестов
 * для всех НЕ уволенных сотрудников.
 */
function getIncompleteItems(): IncompleteItem[] {
  const query = `
    -- Незавершенные курсы
    SELECT
      c.id AS collaborator_id,
      c.fullname AS fullname,
      co.name AS item_name,
      'Курс' AS item_type
    FROM
      active_learnings AS al
    INNER JOIN
      collaborators AS c ON c.id = al.person_id
    INNER JOIN
      courses AS co ON co.id = al.course_id
    INNER JOIN
      learning_states AS ls ON ls.id = al.state_id
    WHERE
      c.is_dismiss = ${IS_DISMISSED_INACTIVE}
      AND ls.is_active = 1

    UNION ALL

    -- Незавершенные тесты
    SELECT
      c.id AS collaborator_id,
      c.fullname AS fullname,
      t.name AS item_name,
      'Тест' AS item_type
    FROM
      active_testings AS at
    INNER JOIN
      collaborators AS c ON c.id = at.person_id
    INNER JOIN
      tests AS t ON t.id = at.test_id
    INNER JOIN
      testing_states AS ts ON ts.id = at.state_id
    WHERE
      c.is_dismiss = ${IS_DISMISSED_INACTIVE}
      AND ts.is_active = 1;
  `;

  try {
    return tools.xquery<IncompleteItem>(query);
  } catch (e) {
    logWithPrefix(
      "GET_INCOMPLETE",
      "error",
      `Database query failed: ${e.message}`
    );
    throw new Error(`Failed to retrieve incomplete items: ${e.message}`);
  }
}

/**
 * Группирует плоский список обучений по сотрудникам.
 */
function groupItemsByCollaborator(items: IncompleteItem[]): GroupedItems {
  return items.reduce((acc: GroupedItems, item) => {
    if (!acc[item.collaborator_id]) {
      acc[item.collaborator_id] = {
        fullname: item.fullname,
        courses: [],
        tests: [],
      };
    }

    if (item.item_type === "Курс") {
      acc[item.collaborator_id].courses.push(item.item_name);
    } else if (item.item_type === "Тест") {
      acc[item.collaborator_id].tests.push(item.item_name);
    }

    return acc;
  }, {});
}

/**
 * Формирует текст уведомления.
 */
function formatNotificationMessage(
  fullname: string,
  courses: string[],
  tests: string[]
): string {
  let message = `Уважаемый(ая) ${fullname}!\n\n`;
  message +=
    "Напоминаем о необходимости завершить назначенное вам обучение.\n\n";

  if (courses.length > 0) {
    message += "Незавершенные курсы:\n";
    message += courses.map((name) => `- ${name}`).join("\n") + "\n\n";
  }

  if (tests.length > 0) {
    message += "Незавершенные тесты:\n";
    message += tests.map((name) => `- ${name}`).join("\n") + "\n\n";
  }

  message +=
    "Пожалуйста, найдите время для их прохождения в ближайшее время.\n";
  message += "\nС уважением,\nСистема обучения";

  return message;
}

// Запуск агента
runAgent();
